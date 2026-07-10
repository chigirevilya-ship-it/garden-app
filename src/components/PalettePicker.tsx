import { useState } from 'react'
import { GARDEN_PALETTE, paletteName } from '../lib/palette'
import { SEASONS } from '../lib/plant'
import type { Season, SeasonalColors } from '../lib/types'

/**
 * Season color editor backed by the curated garden palette — four season
 * slots, one shared swatch grid. Picking a color fills the active season and
 * advances to the next, so all four can be set in four taps.
 */
export function SeasonPalettePicker({
  colors,
  onChange,
  disabled,
}: {
  colors: SeasonalColors
  onChange: (colors: SeasonalColors) => void
  disabled?: boolean
}) {
  const [season, setSeason] = useState<Season>('spring')

  const pick = (hex: string) => {
    onChange({ ...colors, [season]: hex })
    const next = SEASONS[SEASONS.indexOf(season) + 1]
    if (next) setSeason(next)
  }

  return (
    <div>
      <div className="flex gap-1.5">
        {SEASONS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => setSeason(s)}
            className={`flex flex-1 cursor-pointer flex-col items-center gap-1 rounded-lg border px-1 py-1.5 ${
              season === s ? 'border-garden bg-garden-pale' : 'border-line bg-cream hover:border-garden/40'
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <span
              className="h-6 w-full rounded border border-ink/10"
              style={{ backgroundColor: colors[s] }}
              title={paletteName(colors[s]) ?? colors[s]}
            />
            <span className="text-[10px] font-medium text-ink-soft capitalize">{s}</span>
          </button>
        ))}
      </div>
      {!disabled && (
        <>
          <p className="mt-2 text-xs text-ink-soft">
            Pick a color for <span className="font-semibold capitalize">{season}</span>:
          </p>
          <div className="mt-1 grid grid-cols-10 gap-1">
            {GARDEN_PALETTE.map((c) => (
              <button
                key={c.hex}
                type="button"
                title={c.name}
                aria-label={`${c.name} for ${season}`}
                onClick={() => pick(c.hex)}
                className={`aspect-square w-full cursor-pointer rounded border ${
                  colors[season].toLowerCase() === c.hex ? 'border-ink ring-1 ring-ink' : 'border-ink/10 hover:border-ink/50'
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export const DEFAULT_MANUAL_COLORS: SeasonalColors = {
  spring: '#a2c48e',
  summer: '#6f9e5c',
  fall: '#94804e',
  winter: '#9d947e',
}
