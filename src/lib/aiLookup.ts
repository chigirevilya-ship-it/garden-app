import Anthropic from '@anthropic-ai/sdk'
import type { PlantType, SeasonalColors, SunNeeds, WaterNeeds } from './types'

/**
 * Client-side AI plant lookup (US-701-style). Calls the Anthropic API directly
 * from the browser with a user-supplied key (Settings). There is no backend in
 * this deployment, so the key lives in this browser's localStorage and is
 * visible in devtools/network — acceptable for a personal, single-user
 * instance; a shared/public deployment should proxy this through a backend
 * instead (see system design §7, AI Gateway).
 */
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
}

export type AiLookupResult =
  | { ok: true; data: AiPlantLookup }
  | { ok: false; error: string }

const PLANT_TYPES: PlantType[] = [
  'perennial', 'annual', 'shrub', 'tree', 'vine', 'bulb', 'ground_cover', 'herb', 'grass', 'fern',
]

const nullable = (schema: Record<string, unknown>) => ({ anyOf: [schema, { type: 'null' }] })

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    commonName: { type: 'string' },
    scientificName: nullable({ type: 'string' }),
    plantType: { type: 'string', enum: PLANT_TYPES },
    matureHeightIn: nullable({ type: 'number' }),
    matureSpreadIn: nullable({ type: 'number' }),
    spacingIn: nullable({ type: 'number' }),
    bloomStartMonth: nullable({ type: 'integer' }),
    bloomEndMonth: nullable({ type: 'integer' }),
    pruneMonths: { type: 'array', items: { type: 'integer' } },
    fertilizeIntervalWeeks: nullable({ type: 'integer' }),
    waterNeeds: nullable({ type: 'string', enum: ['low', 'medium', 'high'] }),
    sunNeeds: nullable({ type: 'string', enum: ['full', 'partial', 'shade'] }),
    frostTender: { type: 'boolean' },
    hardinessMinZone: nullable({ type: 'string' }),
    colors: {
      type: 'object',
      properties: {
        spring: { type: 'string' },
        summer: { type: 'string' },
        fall: { type: 'string' },
        winter: { type: 'string' },
      },
      required: ['spring', 'summer', 'fall', 'winter'],
      additionalProperties: false,
    },
  },
  required: [
    'commonName', 'scientificName', 'plantType', 'matureHeightIn', 'matureSpreadIn', 'spacingIn',
    'bloomStartMonth', 'bloomEndMonth', 'pruneMonths', 'fertilizeIntervalWeeks', 'waterNeeds',
    'sunNeeds', 'frostTender', 'hardinessMinZone', 'colors',
  ],
  additionalProperties: false,
} as const

export async function lookupPlantWithAI(
  commonName: string,
  scientificName: string,
  apiKey: string,
): Promise<AiLookupResult> {
  if (!apiKey.trim()) {
    return { ok: false, error: 'No Anthropic API key set. Add one in Settings to use AI lookup.' }
  }

  const client = new Anthropic({ apiKey: apiKey.trim(), dangerouslyAllowBrowser: true })
  const nameForPrompt = scientificName.trim()
    ? `${commonName.trim()} (${scientificName.trim()})`
    : commonName.trim()

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: RESPONSE_SCHEMA },
      },
      messages: [
        {
          role: 'user',
          content:
            `Provide reference horticultural data for the garden plant "${nameForPrompt}" for a home ` +
            `gardening app. Use typical, well-established values for this species (or its genus if the ` +
            `exact cultivar is obscure) — reasonable general knowledge is fine, but do not invent overly ` +
            `specific unfounded numbers. Heights/spacing/spacing are in inches. Bloom and prune months are ` +
            `1-12 (northern-hemisphere temperate garden default). Set frostTender true only if the plant is ` +
            `killed or badly damaged by frost. For "colors", give one hex color (#RRGGBB) per season ` +
            `representing this plant's dominant visible color that season (foliage and/or bloom) in a ` +
            `typical temperate garden — if it's evergreen or has no strong seasonal change, use closely ` +
            `related muted variations rather than four identical values. Use null for any field that ` +
            `genuinely doesn't apply or can't be reasonably estimated (e.g. bloom months for a plant grown ` +
            `only for foliage).`,
        },
      ],
    })

    if (response.stop_reason === 'refusal') {
      return { ok: false, error: 'The AI declined this request. Try rephrasing the plant name.' }
    }

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return { ok: false, error: 'AI response had no usable content.' }
    }

    const parsed = JSON.parse(textBlock.text) as AiPlantLookup & {
      scientificName: string | null
      matureHeightIn: number | null
      matureSpreadIn: number | null
      spacingIn: number | null
      bloomStartMonth: number | null
      bloomEndMonth: number | null
      fertilizeIntervalWeeks: number | null
      waterNeeds: WaterNeeds | null
      sunNeeds: SunNeeds | null
      hardinessMinZone: string | null
    }

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
        colors: parsed.colors,
      },
    }
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
    return { ok: false, error: 'AI response could not be parsed. Try again.' }
  }
}
