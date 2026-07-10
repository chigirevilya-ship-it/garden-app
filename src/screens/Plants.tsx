import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useGarden, usePrefs } from '../store'
import { usePlantRows, type PlantRow } from '../lib/selectors'
import { MONTH_NAMES, bloomWindowLabel, bloomsInMonth, formatHeight } from '../lib/plant'
import { Button, Card, Chip, ColorSwatchStrip, EmptyState, Field, PageHeader, icons, inputClass } from '../components/ui'
import { DEFAULT_MANUAL_COLORS, SeasonPalettePicker } from '../components/PalettePicker'
import type { PlantSpecies, PlantType, SeasonalColors, SunNeeds, TaskTemplate, WaterNeeds } from '../lib/types'
import { lookupPlantWithAI, type AiSuggestedTask } from '../lib/aiLookup'
import { resolvePlant } from '../lib/plant'

const PLANT_TYPES: PlantType[] = ['perennial', 'annual', 'shrub', 'tree', 'vine', 'bulb', 'ground_cover', 'herb', 'grass', 'fern']

export function typeLabel(t: PlantType): string {
  return t.replace('_', ' ').replace(/^./, (c) => c.toUpperCase())
}

export function speciesMatches(sp: PlantSpecies, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    sp.commonName.toLowerCase().includes(q) ||
    (sp.scientificName ?? '').toLowerCase().includes(q)
  )
}

function PlantCard({ row }: { row: PlantRow }) {
  const { instance, plant, bedName } = row
  return (
    <Link to={`/plants/${instance.id}`}>
      <Card className="flex h-full flex-col gap-2 p-4 transition-colors hover:border-garden/40">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-display text-xl font-semibold text-garden">{plant.displayName}</p>
            {plant.scientificName && <p className="truncate text-xs text-ink-soft italic">{plant.scientificName}</p>}
          </div>
          <ColorSwatchStrip colors={plant.colors} />
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-1.5">
          <Chip>{typeLabel(plant.plantType)}</Chip>
          {plant.bloomStartMonth && <Chip color="green">Blooms {bloomWindowLabel(plant)}</Chip>}
          {bedName ? <Chip color="blue">{bedName}</Chip> : row.placed ? <Chip color="blue">On map</Chip> : <Chip>Not placed</Chip>}
          {plant.overriddenKeys.length > 0 && (
            <Chip color="amber" className="gap-0.5">✎ observed</Chip>
          )}
        </div>
      </Card>
    </Link>
  )
}

function CatalogCard({ species, countInGarden }: { species: PlantSpecies; countInGarden: number }) {
  const addPlant = useGarden((s) => s.addPlant)
  const navigate = useNavigate()
  const colors = resolvePlant({ id: '', status: 'active', overrides: {} }, species).colors

  return (
    <Card className="flex h-full flex-col gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-display text-xl font-semibold text-garden">{species.commonName}</p>
          {species.scientificName && <p className="truncate text-xs text-ink-soft italic">{species.scientificName}</p>}
        </div>
        <ColorSwatchStrip colors={colors} />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip>{typeLabel(species.plantType)}</Chip>
        {species.bloomStartMonth && <Chip color="green">Blooms {bloomWindowLabel(species)}</Chip>}
        {species.source === 'ai' && <Chip color="amber">✨ AI</Chip>}
        {species.taskTemplates && species.taskTemplates.length > 0 && (
          <Chip color="blue">{species.taskTemplates.length} care task{species.taskTemplates.length === 1 ? '' : 's'}</Chip>
        )}
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <span className="text-xs text-ink-soft">
          {countInGarden === 0 ? 'Not in your garden yet' : `${countInGarden} in your garden`}
        </span>
        <Button
          variant="secondary"
          className="!min-h-9 !px-3 text-xs"
          onClick={() => {
            const id = addPlant({ speciesId: species.id })
            navigate(`/plants/${id}`)
          }}
        >
          {icons.plus('h-3.5 w-3.5')} Add to garden
        </Button>
      </div>
    </Card>
  )
}

function AddPlantForm({ onClose, onCreatedSpecies }: { onClose: () => void; onCreatedSpecies: () => void }) {
  const species = useGarden((s) => s.species)
  const addSpecies = useGarden((s) => s.addSpecies)
  const addPlant = useGarden((s) => s.addPlant)
  const aiApiKey = usePrefs((s) => s.aiApiKey)
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [speciesId, setSpeciesId] = useState('')
  const [scientificName, setScientificName] = useState('')
  const [plantType, setPlantType] = useState<PlantType>('perennial')
  const [heightIn, setHeightIn] = useState('')
  const [spacingIn, setSpacingIn] = useState('')
  const [bloomStart, setBloomStart] = useState('')
  const [bloomEnd, setBloomEnd] = useState('')
  const [water, setWater] = useState<WaterNeeds>('medium')
  const [sun, setSun] = useState<SunNeeds>('full')
  const [colors, setColors] = useState<SeasonalColors | undefined>()
  const [showColors, setShowColors] = useState(false)

  const [addToGarden, setAddToGarden] = useState(true)
  const [sourceName, setSourceName] = useState('')
  const [plantedOn, setPlantedOn] = useState('')
  const [notes, setNotes] = useState('')

  const [aiTasks, setAiTasks] = useState<(AiSuggestedTask & { checked: boolean })[]>([])
  const [aiFilled, setAiFilled] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  const matches = useMemo(() => {
    const q = name.trim()
    if (q.length < 2 || speciesId) return []
    return species.filter((sp) => speciesMatches(sp, q)).slice(0, 5)
  }, [name, species, speciesId])

  const runAiLookup = async () => {
    setAiLoading(true)
    setAiError('')
    const result = await lookupPlantWithAI(name, scientificName, aiApiKey)
    setAiLoading(false)
    if (!result.ok) {
      setAiError(result.error)
      return
    }
    const d = result.data
    setPlantType(d.plantType)
    if (d.scientificName && !scientificName.trim()) setScientificName(d.scientificName)
    if (d.matureHeightIn != null) setHeightIn(String(d.matureHeightIn))
    if (d.spacingIn != null) setSpacingIn(String(d.spacingIn))
    if (d.bloomStartMonth != null) setBloomStart(String(d.bloomStartMonth))
    if (d.bloomEndMonth != null) setBloomEnd(String(d.bloomEndMonth))
    if (d.waterNeeds) setWater(d.waterNeeds)
    if (d.sunNeeds) setSun(d.sunNeeds)
    setColors(d.colors)
    setAiTasks(d.suggestedTasks.map((t) => ({ ...t, checked: true })))
    setAiFilled(true)
  }

  const submit = () => {
    if (!name.trim() && !speciesId) return

    // Existing catalog plant selected → just add an instance of it
    if (speciesId) {
      const id = addPlant({
        speciesId,
        sourceName: sourceName.trim() || undefined,
        plantedOn: plantedOn || undefined,
        notes: notes.trim() || undefined,
      })
      onClose()
      navigate(`/plants/${id}`)
      return
    }

    const taskTemplates: TaskTemplate[] = aiTasks
      .filter((t) => t.checked)
      .map((t) => ({ title: t.title, kind: t.kind, month: t.month, day: t.day, repeat: t.repeat }))

    const sid = addSpecies(
      {
        commonName: name.trim(),
        scientificName: scientificName.trim() || undefined,
        plantType,
        matureHeightIn: heightIn ? Number(heightIn) : undefined,
        spacingIn: spacingIn ? Number(spacingIn) : undefined,
        bloomStartMonth: bloomStart ? Number(bloomStart) : undefined,
        bloomEndMonth: bloomEnd ? Number(bloomEnd) : undefined,
        waterNeeds: water,
        sunNeeds: sun,
        defaultColors: colors,
        taskTemplates: taskTemplates.length ? taskTemplates : undefined,
      },
      aiFilled ? 'ai' : 'user',
    )

    if (addToGarden) {
      const id = addPlant({
        speciesId: sid,
        sourceName: sourceName.trim() || undefined,
        plantedOn: plantedOn || undefined,
        notes: notes.trim() || undefined,
      })
      onClose()
      navigate(`/plants/${id}`)
    } else {
      onClose()
      onCreatedSpecies()
    }
  }

  return (
    <Card className="mb-6 p-4">
      <h2 className="mb-1 font-display text-2xl font-semibold text-garden">Add Plant</h2>
      <p className="mb-3 text-xs text-ink-soft">
        This adds a plant to your catalog. Place it on the map (or tap "Add to garden") as many times as
        you plant it — each planting is tracked separately.
      </p>
      <form
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Field label="Common name">
            <input
              className={inputClass}
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setSpeciesId('')
              }}
              placeholder="Search catalog or type a new name"
              autoFocus
            />
          </Field>
          {matches.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-line bg-cream shadow-lg">
              {matches.map((sp) => (
                <li key={sp.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-parchment-dark"
                    onClick={() => {
                      setSpeciesId(sp.id)
                      setName(sp.commonName)
                      setScientificName(sp.scientificName ?? '')
                      setPlantType(sp.plantType)
                    }}
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{sp.commonName}</span>
                      {sp.scientificName && <span className="block truncate text-xs text-ink-soft italic">{sp.scientificName}</span>}
                    </span>
                    <span className="shrink-0 text-xs text-ink-soft">{typeLabel(sp.plantType)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {speciesId && <p className="mt-1 text-xs text-garden">✓ Already in your catalog — this will add one to your garden.</p>}
        </div>

        {!speciesId && (
          <div className="sm:col-span-2 lg:col-span-1">
            <Field label="Scientific name (optional)">
              <input
                className={inputClass}
                value={scientificName}
                onChange={(e) => setScientificName(e.target.value)}
                placeholder="e.g. Hydrangea macrophylla"
              />
            </Field>
            <div className="mt-1.5 flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                className="!min-h-8 !px-2.5 text-xs"
                disabled={(name.trim().length < 2 && scientificName.trim().length < 2) || aiLoading}
                onClick={() => void runAiLookup()}
              >
                {aiLoading ? 'Looking up…' : '✨ Look up with AI'}
              </Button>
              {aiFilled && !aiLoading && (
                <span className="flex items-center gap-1.5 text-xs text-garden">
                  ✓ Filled from AI — review before saving
                </span>
              )}
            </div>
            {aiError && (
              <p className="mt-1 text-xs text-red-urgent">
                {aiError}
                {aiError.includes('Settings') && (
                  <>
                    {' '}
                    <Link to="/settings" className="underline">Open Settings</Link>
                  </>
                )}
              </p>
            )}
          </div>
        )}

        <Field label="Type">
          <select className={inputClass} value={plantType} onChange={(e) => setPlantType(e.target.value as PlantType)} disabled={!!speciesId}>
            {PLANT_TYPES.map((pt) => (
              <option key={pt} value={pt}>{typeLabel(pt)}</option>
            ))}
          </select>
        </Field>

        {!speciesId && (
          <>
            <Field label="Height at maturity (in)">
              <input type="number" className={inputClass} value={heightIn} onChange={(e) => setHeightIn(e.target.value)} />
            </Field>
            <Field label="Spacing (in)">
              <input type="number" className={inputClass} value={spacingIn} onChange={(e) => setSpacingIn(e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Bloom start (1–12)">
                <input type="number" min={1} max={12} className={inputClass} value={bloomStart} onChange={(e) => setBloomStart(e.target.value)} />
              </Field>
              <Field label="Bloom end">
                <input type="number" min={1} max={12} className={inputClass} value={bloomEnd} onChange={(e) => setBloomEnd(e.target.value)} />
              </Field>
            </div>
            <Field label="Watering needs">
              <select className={inputClass} value={water} onChange={(e) => setWater(e.target.value as WaterNeeds)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </Field>
            <Field label="Sun requirements">
              <select className={inputClass} value={sun} onChange={(e) => setSun(e.target.value as SunNeeds)}>
                <option value="full">Full sun</option>
                <option value="partial">Partial</option>
                <option value="shade">Shade</option>
              </select>
            </Field>

            <div className="sm:col-span-2 lg:col-span-3">
              <button
                type="button"
                className="flex cursor-pointer items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink"
                onClick={() => {
                  setShowColors((v) => !v)
                  if (!colors) setColors(DEFAULT_MANUAL_COLORS)
                }}
              >
                {icons.chevronRight(`h-4 w-4 transition-transform ${showColors ? 'rotate-90' : ''}`)}
                Seasonal colors {colors ? '' : '(using defaults)'}
              </button>
              {showColors && colors && (
                <div className="mt-2 max-w-md">
                  <SeasonPalettePicker colors={colors} onChange={setColors} />
                </div>
              )}
            </div>

            {aiTasks.length > 0 && (
              <div className="sm:col-span-2 lg:col-span-3">
                <p className="mb-1 text-xs font-semibold tracking-wide text-ink-soft uppercase">
                  ✨ Recommended care tasks
                </p>
                <p className="mb-2 text-xs text-ink-soft">
                  Added automatically to each planting of this plant. Routine pruning and fertilizing
                  reminders already come from the care fields above.
                </p>
                <div className="flex flex-col gap-1">
                  {aiTasks.map((t, i) => (
                    <label key={i} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="accent-garden"
                        checked={t.checked}
                        onChange={(e) =>
                          setAiTasks((list) => list.map((x, j) => (j === i ? { ...x, checked: e.target.checked } : x)))
                        }
                      />
                      <span>
                        {t.title}
                        <span className="text-xs text-ink-soft">
                          {' '}
                          — {MONTH_NAMES[t.month - 1]}
                          {t.day ? ` ${t.day}` : ''}, {t.repeat === 'yearly' ? 'every year' : 'once'}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {!speciesId && (
          <label className="flex cursor-pointer items-center gap-2 text-sm sm:col-span-2 lg:col-span-3">
            <input
              type="checkbox"
              className="accent-garden"
              checked={addToGarden}
              onChange={(e) => setAddToGarden(e.target.checked)}
            />
            Also add one to my garden now (uncheck to only save it in the catalog)
          </label>
        )}

        {(speciesId || addToGarden) && (
          <>
            <Field label="Date planted">
              <input type="date" className={inputClass} value={plantedOn} onChange={(e) => setPlantedOn(e.target.value)} />
            </Field>
            <Field label="Source (nursery / online)">
              <input className={inputClass} value={sourceName} onChange={(e) => setSourceName(e.target.value)} />
            </Field>
            <Field label="Notes">
              <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </>
        )}

        <div className="flex items-end gap-2">
          <Button type="submit">{speciesId ? 'Add to garden' : addToGarden ? 'Save & add to garden' : 'Save to catalog'}</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Card>
  )
}

export default function Plants() {
  const rows = usePlantRows()
  const species = useGarden((s) => s.species)
  const instances = useGarden((s) => s.instances)
  const beds = useGarden((s) => s.beds)
  const [view, setView] = useState<'garden' | 'catalog'>('garden')
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [bed, setBed] = useState('')
  const [bloomingNow, setBloomingNow] = useState(false)
  const [adding, setAdding] = useState(false)
  const [showPast, setShowPast] = useState(false)

  const month = new Date().getMonth() + 1
  const active = rows.filter((r) => r.instance.status === 'active')
  const archived = rows.filter((r) => r.instance.status === 'archived')

  const filtered = active.filter((r) => {
    if (q && !`${r.plant.displayName} ${r.plant.commonName} ${r.plant.scientificName ?? ''}`.toLowerCase().includes(q.toLowerCase())) return false
    if (type && r.plant.plantType !== type) return false
    if (bed && r.bedName !== bed) return false
    if (bloomingNow && !bloomsInMonth(r.plant, month)) return false
    return true
  })

  const countBySpecies = useMemo(() => {
    const counts = new Map<string, number>()
    for (const inst of instances) {
      if (inst.status !== 'active' || !inst.speciesId) continue
      counts.set(inst.speciesId, (counts.get(inst.speciesId) ?? 0) + 1)
    }
    return counts
  }, [instances])

  const catalogFiltered = species
    .filter((sp) => speciesMatches(sp, q))
    .filter((sp) => !type || sp.plantType === type)
    .sort((a, b) => a.commonName.localeCompare(b.commonName))

  return (
    <div>
      <PageHeader
        title="Plants"
        subtitle={`${active.length} in the garden · ${species.length} in the catalog`}
        action={<Button onClick={() => setAdding(true)}>{icons.plus('h-4 w-4')} Add Plant</Button>}
      />

      {adding && <AddPlantForm onClose={() => setAdding(false)} onCreatedSpecies={() => setView('catalog')} />}

      {/* View toggle + filter bar */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg border border-line bg-cream p-1">
          {(['garden', 'catalog'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`min-h-9 cursor-pointer rounded-md px-4 text-sm font-medium ${
                view === v ? 'bg-garden text-cream' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {v === 'garden' ? `In the garden (${active.length})` : `Catalog (${species.length})`}
            </button>
          ))}
        </div>
        <input className={`${inputClass} !w-56`} placeholder="Search common or scientific…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={`${inputClass} !w-40`} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {PLANT_TYPES.map((pt) => (
            <option key={pt} value={pt}>{typeLabel(pt)}</option>
          ))}
        </select>
        {view === 'garden' && (
          <>
            <select className={`${inputClass} !w-40`} value={bed} onChange={(e) => setBed(e.target.value)}>
              <option value="">All beds</option>
              {beds.map((b) => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
            </select>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line bg-cream px-3 text-sm">
              <input type="checkbox" checked={bloomingNow} onChange={(e) => setBloomingNow(e.target.checked)} className="accent-garden" />
              Blooming now
            </label>
          </>
        )}
      </div>

      {view === 'catalog' ? (
        catalogFiltered.length === 0 ? (
          <EmptyState>No catalog plants match. Add one with the button above.</EmptyState>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {catalogFiltered.map((sp) => (
              <CatalogCard key={sp.id} species={sp} countInGarden={countBySpecies.get(sp.id) ?? 0} />
            ))}
          </div>
        )
      ) : filtered.length === 0 ? (
        <EmptyState>
          Nothing in the garden matches. Add plantings from the <button className="cursor-pointer underline" onClick={() => setView('catalog')}>catalog</button> or the map.
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <PlantCard key={r.instance.id} row={r} />
          ))}
        </div>
      )}

      {/* Past plants (US-203) */}
      {view === 'garden' && archived.length > 0 && (
        <section className="mt-8">
          <button className="mb-3 flex items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink" onClick={() => setShowPast((v) => !v)}>
            {icons.chevronRight(`h-4 w-4 transition-transform ${showPast ? 'rotate-90' : ''}`)}
            Past Plants ({archived.length})
          </button>
          {showPast && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {archived.map((r) => (
                <Link key={r.instance.id} to={`/plants/${r.instance.id}`}>
                  <Card className="p-4 opacity-75 transition-opacity hover:opacity-100">
                    <p className="font-display text-xl font-semibold text-ink-soft">{r.plant.displayName}</p>
                    <p className="mt-1 text-xs text-ink-soft">
                      {formatHeight(r.plant.matureHeightIn)} · {typeLabel(r.plant.plantType)}
                    </p>
                    {r.instance.archiveReason && (
                      <p className="mt-2 text-xs text-red-urgent italic">“{r.instance.archiveReason}”</p>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
