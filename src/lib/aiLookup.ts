import Anthropic from '@anthropic-ai/sdk'
import { buildLookupBody } from './aiRequest.mjs'
import { snapToPalette } from './palette'
import type { PlantType, SeasonalColors, SunNeeds, TaskKind, WaterNeeds } from './types'

/**
 * AI plant lookup. Preferred path: the GardenOS server proxies the call with
 * its own ANTHROPIC_API_KEY (set in the server's environment) — no key in the
 * browser. Fallback path (no server key configured, or running the static
 * demo build): call the Anthropic API directly with the key from Settings.
 */
export interface AiSuggestedTask {
  title: string
  kind: TaskKind
  month: number
  day?: number
  repeat: 'yearly' | 'once'
}

export interface AiPlantLookup {
  commonName: string
  scientificName?: string
  plantType: PlantType
  matureHeightIn?: number
  matureSpreadIn?: number
  spacingIn?: number
  bloomStartMonth?: number
  bloomEndMonth?: number
  pruneMonths?: number[]
  fertilizeIntervalWeeks?: number
  waterNeeds?: WaterNeeds
  sunNeeds?: SunNeeds
  frostTender?: boolean
  hardinessMinZone?: string
  colors: SeasonalColors
  suggestedTasks: AiSuggestedTask[]
}

export type AiLookupResult =
  | { ok: true; data: AiPlantLookup }
  | { ok: false; error: string }

interface RawLookup {
  commonName: string
  scientificName: string | null
  plantType: PlantType
  matureHeightIn: number | null
  matureSpreadIn: number | null
  spacingIn: number | null
  bloomStartMonth: number | null
  bloomEndMonth: number | null
  pruneMonths: number[]
  fertilizeIntervalWeeks: number | null
  waterNeeds: WaterNeeds | null
  sunNeeds: SunNeeds | null
  frostTender: boolean
  hardinessMinZone: string | null
  colors: SeasonalColors
  suggestedTasks: { title: string; kind: TaskKind; month: number; day: number | null; repeat: 'yearly' | 'once' }[]
}

interface AnthropicMessageShape {
  stop_reason?: string | null
  content?: { type: string; text?: string }[]
}

function parseLookupMessage(message: AnthropicMessageShape): AiLookupResult {
  if (message.stop_reason === 'refusal') {
    return { ok: false, error: 'The AI declined this request. Try rephrasing the plant name.' }
  }
  const textBlock = message.content?.find((b) => b.type === 'text' && typeof b.text === 'string')
  if (!textBlock?.text) {
    return { ok: false, error: 'AI response had no usable content.' }
  }
  try {
    const parsed = JSON.parse(textBlock.text) as RawLookup
    return {
      ok: true,
      data: {
        commonName: parsed.commonName,
        scientificName: parsed.scientificName ?? undefined,
        plantType: parsed.plantType,
        matureHeightIn: parsed.matureHeightIn ?? undefined,
        matureSpreadIn: parsed.matureSpreadIn ?? undefined,
        spacingIn: parsed.spacingIn ?? undefined,
        bloomStartMonth: parsed.bloomStartMonth ?? undefined,
        bloomEndMonth: parsed.bloomEndMonth ?? undefined,
        pruneMonths: parsed.pruneMonths?.length ? parsed.pruneMonths : undefined,
        fertilizeIntervalWeeks: parsed.fertilizeIntervalWeeks ?? undefined,
        waterNeeds: parsed.waterNeeds ?? undefined,
        sunNeeds: parsed.sunNeeds ?? undefined,
        frostTender: parsed.frostTender,
        hardinessMinZone: parsed.hardinessMinZone ?? undefined,
        colors: {
          spring: snapToPalette(parsed.colors.spring),
          summer: snapToPalette(parsed.colors.summer),
          fall: snapToPalette(parsed.colors.fall),
          winter: snapToPalette(parsed.colors.winter),
        },
        suggestedTasks: (parsed.suggestedTasks ?? [])
          .filter((t) => t.title && t.month >= 1 && t.month <= 12)
          .slice(0, 6)
          .map((t) => ({ title: t.title, kind: t.kind, month: t.month, day: t.day ?? undefined, repeat: t.repeat })),
      },
    }
  } catch {
    return { ok: false, error: 'AI response could not be parsed. Try again.' }
  }
}

/** Returns null if the server has no AI key configured (fall back to browser key). */
async function lookupViaServer(commonName: string, scientificName: string): Promise<AiLookupResult | null> {
  let res: Response
  try {
    res = await fetch('/api/ai/lookup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ commonName, scientificName }),
    })
  } catch {
    return null // no server at all (static build) — fall back
  }
  if (res.status === 501 || res.status === 404) return null // server has no key / no API
  const body = (await res.json().catch(() => ({}))) as { message?: AnthropicMessageShape; error?: string }
  if (!res.ok) return { ok: false, error: body.error ?? `AI lookup failed (${res.status}).` }
  if (!body.message) return { ok: false, error: 'AI response had no usable content.' }
  return parseLookupMessage(body.message)
}

async function lookupViaBrowser(
  commonName: string,
  scientificName: string,
  apiKey: string,
): Promise<AiLookupResult> {
  if (!apiKey.trim()) {
    return {
      ok: false,
      error: 'AI lookup is not configured — set ANTHROPIC_API_KEY on the server, or add a key in Settings.',
    }
  }
  const client = new Anthropic({ apiKey: apiKey.trim(), dangerouslyAllowBrowser: true })
  try {
    const body = buildLookupBody(commonName, scientificName)
    const response = await client.messages.create(body as unknown as Anthropic.MessageCreateParamsNonStreaming)
    return parseLookupMessage(response as AnthropicMessageShape)
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: 'Invalid Anthropic API key. Check the key in Settings.' }
    }
    if (err instanceof Anthropic.RateLimitError) {
      return { ok: false, error: 'Rate limited by the Anthropic API. Try again shortly.' }
    }
    if (err instanceof Anthropic.APIConnectionError) {
      return { ok: false, error: 'Could not reach the Anthropic API. Check your connection.' }
    }
    if (err instanceof Anthropic.APIError) {
      return { ok: false, error: `AI lookup failed: ${err.message}` }
    }
    return { ok: false, error: 'AI lookup failed unexpectedly. Try again.' }
  }
}

export async function lookupPlantWithAI(
  commonName: string,
  scientificName: string,
  browserApiKey: string,
): Promise<AiLookupResult> {
  const viaServer = await lookupViaServer(commonName, scientificName)
  if (viaServer) return viaServer
  return lookupViaBrowser(commonName, scientificName, browserApiKey)
}
