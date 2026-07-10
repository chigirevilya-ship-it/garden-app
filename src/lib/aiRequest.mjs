/**
 * Shared builder for the AI plant-lookup request. Imported by BOTH the browser
 * fallback path (src/lib/aiLookup.ts) and the server proxy (server/index.mjs),
 * so the prompt and JSON schema stay in one place. Plain .mjs — no TS, no deps.
 */

const PLANT_TYPES = [
  'perennial', 'annual', 'shrub', 'tree', 'vine', 'bulb', 'ground_cover', 'herb', 'grass', 'fern',
]

const nullable = (schema) => ({ anyOf: [schema, { type: 'null' }] })

const LOOKUP_SCHEMA = {
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
    suggestedTasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          kind: { type: 'string', enum: ['custom', 'prune', 'fertilize', 'water'] },
          month: { type: 'integer' },
          day: nullable({ type: 'integer' }),
          repeat: { type: 'string', enum: ['yearly', 'once'] },
        },
        required: ['title', 'kind', 'month', 'day', 'repeat'],
        additionalProperties: false,
      },
    },
  },
  required: [
    'commonName', 'scientificName', 'plantType', 'matureHeightIn', 'matureSpreadIn', 'spacingIn',
    'bloomStartMonth', 'bloomEndMonth', 'pruneMonths', 'fertilizeIntervalWeeks', 'waterNeeds',
    'sunNeeds', 'frostTender', 'hardinessMinZone', 'colors', 'suggestedTasks',
  ],
  additionalProperties: false,
}

/**
 * Build the Anthropic Messages API request body for a plant lookup.
 * @param {string} commonName
 * @param {string} scientificName
 */
export function buildLookupBody(commonName, scientificName) {
  const nameForPrompt = scientificName.trim()
    ? `${commonName.trim()} (${scientificName.trim()})`
    : commonName.trim()

  return {
    model: 'claude-opus-4-8',
    max_tokens: 1500,
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: LOOKUP_SCHEMA },
    },
    messages: [
      {
        role: 'user',
        content:
          `Provide reference horticultural data for the garden plant "${nameForPrompt}" for a home ` +
          `gardening app. The name given may be a common name, a scientific name, or both. Use typical, ` +
          `well-established values for this species (or its genus if the exact cultivar is obscure) — ` +
          `reasonable general knowledge is fine, but do not invent overly specific unfounded numbers. ` +
          `Heights, spread, and spacing are in inches. Bloom and prune months are 1-12 ` +
          `(northern-hemisphere temperate garden default). Set frostTender true only if the plant is ` +
          `killed or badly damaged by frost. For "colors", give one hex color (#RRGGBB) per season ` +
          `representing this plant's dominant visible color that season (foliage and/or bloom) in a ` +
          `typical temperate garden — if it's evergreen or has no strong seasonal change, use closely ` +
          `related muted variations rather than four identical values. For "suggestedTasks", recommend ` +
          `1-4 dated care actions specific to this plant BEYOND routine pruning and fertilizing (those ` +
          `are derived automatically from pruneMonths and fertilizeIntervalWeeks) — e.g. deadheading, ` +
          `dividing, winter mulching, staking, cutting back, harvest. Each has a short imperative title ` +
          `(no plant name needed), kind (usually "custom"), the month to do it, an optional day, and ` +
          `repeat "yearly" for annual rhythms or "once" for one-time establishment care. Use null for ` +
          `any field that genuinely doesn't apply or can't be reasonably estimated.`,
      },
    ],
  }
}
