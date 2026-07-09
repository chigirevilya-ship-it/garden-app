import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useGarden } from '../store'
import { usePlantRows, type PlantRow } from '../lib/selectors'
import { bloomWindowLabel, bloomsInMonth, formatHeight } from '../lib/plant'
import { Button, Card, Chip, ColorSwatchStrip, EmptyState, Field, PageHeader, icons, inputClass } from '../components/ui'
import type { PlantType, SeasonalColors, SunNeeds, WaterNeeds } from '../lib/types'
import { lookupPlantWithAI } from '../lib/aiLookup'

const PLANT_TYPES: PlantType[] = ['perennial', 'annual', 'shrub', 'tree', 'vine', 'bulb', 'ground_cover', 'herb', 'grass', 'fern']

export function typeLabel(t: PlantType): string {
  return t.replace('_', ' ').replace(/^./, (c) => c.toUpperCase())
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

function AddPlantForm({ onClose }: { onClose: () => void }) {
  const species = useGarden((s) => s.species)
  const addSpecies = useGarden((s) => s.addSpecies)
  const addPlant = useGarden((s) => s.addPlant)
  const aiApiKey = useGarden((s) => s.aiApiKey)
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
  const [sourceName, setSourceName] = useState('')
  const [plantedOn, setPlantedOn] = useState('')
  const [notes, setNotes] = useState('')

  const [aiColors, setAiColors] = useState<SeasonalColors | undefined>()
  const [aiFilled, setAiFilled] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  const matches = useMemo(() => {
    const q = name.trim().toLowerCase()
    if (q.length < 2 || speciesId) return []
    return species.filter((sp) => sp.commonName.toLowerCase().includes(q)).slice(0, 5)
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
    setAiColors(d.colors)
    setAiFilled(true)
  }

  const submit = () => {
    if (!name.trim() && !speciesId) return
    let sid = speciesId || undefined
    if (!sid) {
      // fully custom plant: create a user-scoped species from the form
      sid = addSpecies(
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
          defaultColors: aiColors,
        },
        aiFilled ? 'ai' : 'user',
      )
    }
    const chosen = species.find((sp) => sp.id === speciesId)
    const id = addPlant({
      speciesId: sid,
      nickname: chosen && name.trim() && name.trim() !== chosen.commonName ? name.trim() : undefined,
      sourceName: sourceName.trim() || undefined,
      plantedOn: plantedOn || undefined,
      notes: notes.trim() || undefined,
    })
    onClose()
    navigate(`/plants/${id}`)
  }

  return (
    <Card className="mb-6 p-4">
      <h2 className="mb-3 font-display text-2xl font-semibold text-garden">Add Plant</h2>
      <form
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Field label="Name">
            <input
              className={inputClass}
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setSpeciesId('')
              }}
              placeholder="Search reference database or type a name"
              autoFocus
            />
          </Field>
          {matches.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-line bg-cream shadow-lg">
              {matches.map((sp) => (
                <li key={sp.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-parchment-dark"
                    onClick={() => {
                      setSpeciesId(sp.id)
                      setName(sp.commonName)
                      setPlantType(sp.plantType)
                    }}
                  >
                    <span>{sp.commonName}</span>
                    <span className="text-xs text-ink-soft">{typeLabel(sp.plantType)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {speciesId && <p className="mt-1 text-xs text-garden">✓ Linked to reference data — care details prefill from it.</p>}
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
                disabled={name.trim().length < 2 || aiLoading}
                onClick={runAiLookup}
              >
                {aiLoading ? 'Looking up…' : '✨ Look up with AI'}
              </Button>
              {aiFilled && !aiLoading && (
                <span className="flex items-center gap-1.5 text-xs text-garden">
                  ✓ Filled from AI — review before saving
                  {aiColors && <ColorSwatchStrip colors={aiColors} />}
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
        <Field label="Date planted">
          <input type="date" className={inputClass} value={plantedOn} onChange={(e) => setPlantedOn(e.target.value)} />
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
          </>
        )}
        <Field label="Source (nursery / online)">
          <input className={inputClass} value={sourceName} onChange={(e) => setSourceName(e.target.value)} />
        </Field>
        <Field label="Notes">
          <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="flex items-end gap-2">
          <Button type="submit">Save plant</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Card>
  )
}

export default function Plants() {
  const rows = usePlantRows()
  const beds = useGarden((s) => s.beds)
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

  return (
    <div>
      <PageHeader
        title="Plant Database"
        subtitle={`${active.length} active plants · reference data + your observed values`}
        action={<Button onClick={() => setAdding(true)}>{icons.plus('h-4 w-4')} Add Plant</Button>}
      />

      {adding && <AddPlantForm onClose={() => setAdding(false)} />}

      {/* Filter bar */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <input className={`${inputClass} !w-56`} placeholder="Search by name…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={`${inputClass} !w-40`} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {PLANT_TYPES.map((pt) => (
            <option key={pt} value={pt}>{typeLabel(pt)}</option>
          ))}
        </select>
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
      </div>

      {filtered.length === 0 ? (
        <EmptyState>No plants match these filters.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <PlantCard key={r.instance.id} row={r} />
          ))}
        </div>
      )}

      {/* Past plants (US-203) */}
      {archived.length > 0 && (
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
