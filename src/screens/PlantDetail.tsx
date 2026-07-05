import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useGarden } from '../store'
import { usePlantRows } from '../lib/selectors'
import { MONTH_NAMES, formatDate, formatHeight, today } from '../lib/plant'
import { Button, Card, Chip, ColorSwatchStrip, EmptyState, Field, icons, inputClass } from '../components/ui'
import { typeLabel } from './Plants'
import type { JournalTag, OverridableKey, Overrides, PlantSpecies, Season, SeasonalColors } from '../lib/types'
import { SEASONS } from '../lib/plant'

type EditorKind = 'number' | 'months' | 'month' | 'water' | 'sun' | 'boolean'

interface AttrDef {
  key: OverridableKey
  label: string
  editor: EditorKind
  unit?: string
  format: (v: unknown) => string
}

const fmtMonths = (v: unknown) =>
  Array.isArray(v) && v.length ? v.map((m) => MONTH_NAMES[(m as number) - 1]?.slice(0, 3)).join(', ') : '—'
const fmtMonth = (v: unknown) => (v ? MONTH_NAMES[(v as number) - 1] : '—')
const fmtText = (v: unknown) => (v == null || v === '' ? '—' : String(v))

const ATTRS: AttrDef[] = [
  { key: 'matureHeightIn', label: 'Mature height', editor: 'number', unit: 'in', format: (v) => formatHeight(v as number) },
  { key: 'matureSpreadIn', label: 'Mature spread', editor: 'number', unit: 'in', format: (v) => formatHeight(v as number) },
  { key: 'spacingIn', label: 'Spacing', editor: 'number', unit: 'in', format: (v) => (v == null ? '—' : `${v} in`) },
  { key: 'bloomStartMonth', label: 'Bloom start', editor: 'month', format: fmtMonth },
  { key: 'bloomEndMonth', label: 'Bloom end', editor: 'month', format: fmtMonth },
  { key: 'pruneMonths', label: 'Pruning window', editor: 'months', format: fmtMonths },
  { key: 'fertilizeIntervalWeeks', label: 'Fertilize every', editor: 'number', unit: 'weeks', format: (v) => (v == null ? '—' : `${v} wks`) },
  { key: 'waterNeeds', label: 'Watering needs', editor: 'water', format: fmtText },
  { key: 'sunNeeds', label: 'Sun requirements', editor: 'sun', format: fmtText },
  { key: 'frostTender', label: 'Frost tender', editor: 'boolean', format: (v) => (v == null ? '—' : v ? 'Yes' : 'No') },
]

function OverrideEditor({
  attr,
  initial,
  onSave,
  onCancel,
}: {
  attr: AttrDef
  initial: unknown
  onSave: (v: Overrides[OverridableKey]) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(
    attr.editor === 'months' && Array.isArray(initial) ? initial.join(', ') : initial == null ? '' : String(initial),
  )

  const save = () => {
    let parsed: Overrides[OverridableKey]
    if (attr.editor === 'number' || attr.editor === 'month') {
      const n = Number(value)
      if (!value || Number.isNaN(n)) return
      parsed = n as never
    } else if (attr.editor === 'months') {
      const ms = value.split(/[,\s]+/).map(Number).filter((n) => n >= 1 && n <= 12)
      parsed = ms as never
    } else if (attr.editor === 'boolean') {
      parsed = (value === 'true') as never
    } else {
      if (!value) return
      parsed = value as never
    }
    onSave(parsed)
  }

  return (
    <span className="flex items-center gap-1.5">
      {attr.editor === 'water' || attr.editor === 'sun' || attr.editor === 'boolean' || attr.editor === 'month' ? (
        <select className={`${inputClass} !min-h-9 !w-32`} value={value} onChange={(e) => setValue(e.target.value)} autoFocus>
          <option value="">—</option>
          {attr.editor === 'water' && ['low', 'medium', 'high'].map((o) => <option key={o} value={o}>{o}</option>)}
          {attr.editor === 'sun' && ['full', 'partial', 'shade'].map((o) => <option key={o} value={o}>{o}</option>)}
          {attr.editor === 'boolean' && ['true', 'false'].map((o) => <option key={o} value={o}>{o === 'true' ? 'Yes' : 'No'}</option>)}
          {attr.editor === 'month' && MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
      ) : (
        <input
          className={`${inputClass} !min-h-9 !w-28`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={attr.editor === 'months' ? 'e.g. 2, 3' : attr.unit}
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
      )}
      <Button variant="secondary" className="!min-h-9 !px-2" onClick={save}>{icons.check('h-4 w-4')}</Button>
      <Button variant="ghost" className="!min-h-9 !px-2" onClick={onCancel}>{icons.x('h-4 w-4')}</Button>
    </span>
  )
}

function SeasonalColorsEditor({
  instanceId,
  colors,
  custom,
  archived,
}: {
  instanceId: string
  colors: SeasonalColors
  custom: boolean
  archived: boolean
}) {
  const setSeasonalColors = useGarden((s) => s.setSeasonalColors)

  return (
    <Card className="p-5">
      <h2 className="mb-1 font-display text-2xl font-semibold text-garden">Seasonal Colors</h2>
      <p className="mb-4 text-xs text-ink-soft">
        These paint this plant's marker on the Garden Map and its chips on the Calendar as the
        seasons change — pick what the plant actually looks like each season.
      </p>
      <div className="grid grid-cols-4 gap-2">
        {SEASONS.map((season: Season) => (
          <label key={season} className="flex flex-col items-center gap-1.5">
            <input
              type="color"
              value={colors[season]}
              disabled={archived}
              onChange={(e) => setSeasonalColors(instanceId, { ...colors, [season]: e.target.value })}
              className="h-11 w-full cursor-pointer rounded-lg border border-line bg-cream p-1 disabled:cursor-not-allowed"
              aria-label={`${season} color`}
            />
            <span className="text-[11px] font-medium text-ink-soft capitalize">{season}</span>
          </label>
        ))}
      </div>
      {custom && !archived && (
        <button
          className="mt-3 cursor-pointer text-xs text-ink-soft underline hover:text-ink"
          onClick={() => setSeasonalColors(instanceId, undefined)}
        >
          Reset to this plant's default palette
        </button>
      )}
    </Card>
  )
}

const TAG_COLORS: Record<JournalTag, 'red' | 'green' | 'blue'> = {
  concern: 'red',
  milestone: 'green',
  treatment: 'blue',
}

export default function PlantDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const rows = usePlantRows()
  const species = useGarden((s) => s.species)
  const journal = useGarden((s) => s.journal)
  const setOverride = useGarden((s) => s.setOverride)
  const clearOverride = useGarden((s) => s.clearOverride)
  const archivePlant = useGarden((s) => s.archivePlant)
  const deletePlant = useGarden((s) => s.deletePlant)
  const removePlacement = useGarden((s) => s.removePlacement)
  const addJournalEntry = useGarden((s) => s.addJournalEntry)

  const [editingKey, setEditingKey] = useState<OverridableKey | null>(null)
  const [removing, setRemoving] = useState(false)
  const [archiveReason, setArchiveReason] = useState('')
  const [entryBody, setEntryBody] = useState('')
  const [entryTag, setEntryTag] = useState<'' | JournalTag>('')
  const [entryDate, setEntryDate] = useState(today())

  const row = rows.find((r) => r.instance.id === id)
  if (!row) {
    return (
      <EmptyState>
        Plant not found. <Link to="/plants" className="text-garden underline">Back to the database</Link>
      </EmptyState>
    )
  }
  const { instance, plant } = row
  const ref: PlantSpecies | undefined = instance.speciesId ? species.find((sp) => sp.id === instance.speciesId) : undefined
  const entries = journal.filter((e) => e.instanceId === instance.id).sort((a, b) => b.entryDate.localeCompare(a.entryDate))
  const archived = instance.status === 'archived'

  return (
    <div>
      <Link to="/plants" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink">
        {icons.back('h-4 w-4')} Plant Database
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-semibold text-garden">{plant.displayName}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {plant.scientificName && <em>{plant.scientificName} · </em>}
            {typeLabel(plant.plantType)}
            {instance.plantedOn && ` · planted ${formatDate(instance.plantedOn)} ${instance.plantedOn.slice(0, 4)}`}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {row.bedName && <Chip color="blue">{row.bedName}</Chip>}
            {row.placed && !row.bedName && <Chip color="blue">On map</Chip>}
            {archived && <Chip color="red">Archived{instance.archiveReason ? ` — ${instance.archiveReason}` : ''}</Chip>}
            <ColorSwatchStrip colors={plant.colors} />
          </div>
        </div>
        {!archived && (
          <div className="flex gap-2">
            <Link to="/map"><Button variant="secondary">{icons.map('h-4 w-4')} {row.placed ? 'View on map' : 'Place on map'}</Button></Link>
            <Button variant="danger" onClick={() => setRemoving(true)}>Remove from Garden</Button>
          </div>
        )}
      </div>

      {removing && (
        <Card className="mb-6 border-red-urgent/30 p-4">
          <p className="mb-3 text-sm font-semibold">Archive (keep history) or delete permanently?</p>
          <div className="mb-3">
            <Field label="Reason removed (death note)">
              <input
                className={inputClass}
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                placeholder="e.g. Didn't survive winter, outgrew the spot…"
              />
            </Field>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => { archivePlant(instance.id, archiveReason.trim() || 'Removed'); setRemoving(false) }}>
              Archive to Past Plants
            </Button>
            <Button variant="danger" onClick={() => { deletePlant(instance.id); navigate('/plants') }}>
              Delete permanently
            </Button>
            <Button variant="ghost" onClick={() => setRemoving(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Attributes: reference vs observed (US-204) */}
        <Card className="p-5 lg:col-span-3">
          <h2 className="mb-1 font-display text-2xl font-semibold text-garden">Attributes</h2>
          <p className="mb-4 text-xs text-ink-soft">
            <span className="font-semibold text-amber-urgent">✎ Observed</span> values from your garden take
            precedence everywhere — tasks, calendar, and map layers. Reference stays visible for comparison.
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs tracking-wide text-ink-soft uppercase">
                <th className="py-2 pr-2 font-semibold">Attribute</th>
                <th className="py-2 pr-2 font-semibold">In effect</th>
                <th className="hidden py-2 pr-2 font-semibold sm:table-cell">Reference</th>
                <th className="py-2 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {ATTRS.map((attr) => {
                const overridden = attr.key in instance.overrides
                const effective = plant[attr.key]
                const reference = ref?.[attr.key]
                return (
                  <tr key={attr.key}>
                    <td className="py-2.5 pr-2 text-ink-soft">{attr.label}</td>
                    <td className="py-2.5 pr-2">
                      {editingKey === attr.key ? (
                        <OverrideEditor
                          attr={attr}
                          initial={effective}
                          onSave={(v) => { setOverride(instance.id, attr.key, v); setEditingKey(null) }}
                          onCancel={() => setEditingKey(null)}
                        />
                      ) : (
                        <span className={`font-medium ${overridden ? 'text-amber-urgent' : ''}`}>
                          {attr.format(effective)}
                          {overridden && <span title="Observed in your garden — differs from reference"> ✎</span>}
                        </span>
                      )}
                    </td>
                    <td className="hidden py-2.5 pr-2 text-ink-soft sm:table-cell">
                      {overridden ? attr.format(reference) : '·'}
                    </td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      {!archived && editingKey !== attr.key && (
                        <>
                          <button
                            className="cursor-pointer rounded p-1.5 text-ink-soft hover:bg-parchment-dark hover:text-ink"
                            title="Edit observed value"
                            onClick={() => setEditingKey(attr.key)}
                          >
                            {icons.edit('h-4 w-4')}
                          </button>
                          {overridden && (
                            <button
                              className="cursor-pointer rounded p-1.5 text-ink-soft hover:bg-parchment-dark hover:text-red-urgent"
                              title="Clear observed value — revert to reference"
                              onClick={() => clearOverride(instance.id, attr.key)}
                            >
                              {icons.x('h-4 w-4')}
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>

        <div className="flex flex-col gap-5 lg:col-span-2">
          {/* Provenance (US-502) */}
          <Card className="p-5">
            <h2 className="mb-3 font-display text-2xl font-semibold text-garden">Provenance</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-ink-soft">Source</dt>
              <dd className="font-medium">
                {instance.sourceUrl ? (
                  <a href={instance.sourceUrl} target="_blank" rel="noreferrer" className="text-garden underline">
                    {instance.sourceName ?? instance.sourceUrl}
                  </a>
                ) : (
                  instance.sourceName ?? '—'
                )}
              </dd>
              <dt className="text-ink-soft">Price paid</dt>
              <dd className="font-medium">{instance.pricePaidCents != null ? `$${(instance.pricePaidCents / 100).toFixed(2)}` : '—'}</dd>
              <dt className="text-ink-soft">Date planted</dt>
              <dd className="font-medium">{instance.plantedOn ?? '—'}</dd>
            </dl>
            {instance.notes && <p className="mt-3 border-t border-line pt-3 text-sm text-ink-soft italic">{instance.notes}</p>}
          </Card>

          {/* Seasonal colors (US-201 step 3) */}
          <SeasonalColorsEditor
            instanceId={instance.id}
            colors={plant.colors}
            custom={!!instance.seasonalColors}
            archived={archived}
          />

          {/* Journal (US-501) */}
          <Card className="p-5">
            <h2 className="mb-3 font-display text-2xl font-semibold text-garden">Journal</h2>
            {!archived && (
              <form
                className="mb-4 flex flex-col gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!entryBody.trim()) return
                  addJournalEntry(instance.id, entryBody.trim(), entryTag || undefined, entryDate)
                  setEntryBody('')
                  setEntryTag('')
                }}
              >
                <textarea
                  className={`${inputClass} min-h-20 py-2`}
                  placeholder="How is this plant doing?"
                  value={entryBody}
                  onChange={(e) => setEntryBody(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <input type="date" className={`${inputClass} !w-40`} value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
                  <select className={`${inputClass} !w-32`} value={entryTag} onChange={(e) => setEntryTag(e.target.value as JournalTag | '')}>
                    <option value="">No tag</option>
                    <option value="concern">Concern</option>
                    <option value="milestone">Milestone</option>
                    <option value="treatment">Treatment</option>
                  </select>
                  <Button type="submit" className="ml-auto">Add entry</Button>
                </div>
              </form>
            )}
            {entries.length === 0 ? (
              <EmptyState>No observations yet.</EmptyState>
            ) : (
              <ol className="relative flex flex-col gap-4 border-l border-line pl-4">
                {entries.map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute top-1.5 -left-[21px] h-2.5 w-2.5 rounded-full border-2 border-cream bg-garden" />
                    <div className="flex items-center gap-2 text-xs text-ink-soft">
                      {formatDate(e.entryDate)} {e.entryDate.slice(0, 4)}
                      {e.tag && <Chip color={TAG_COLORS[e.tag]}>{e.tag}</Chip>}
                    </div>
                    <p className="mt-1 text-sm">{e.body}</p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
      {row.placed && !archived && (
        <button
          className="mt-4 cursor-pointer text-xs text-ink-soft underline hover:text-red-urgent"
          onClick={() => removePlacement(instance.id)}
        >
          Remove marker from map (keeps the plant in your database)
        </button>
      )}
    </div>
  )
}
