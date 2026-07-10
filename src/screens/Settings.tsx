import { useState } from 'react'
import { useAuth, useGarden, usePrefs } from '../store'
import { usePlantRows } from '../lib/selectors'
import { MONTH_NAMES, dateFromDoy, formatDate, formatHeight, parseIso } from '../lib/plant'
import { Button, Card, Field, PageHeader, inputClass } from '../components/ui'

function doyToInput(doy: number): string {
  return dateFromDoy(new Date().getFullYear(), doy).slice(5) // MM-DD
}

function GardensCard() {
  const gardens = useAuth((s) => s.gardens)
  const activeGardenId = useAuth((s) => s.activeGardenId)
  const selectGarden = useAuth((s) => s.selectGarden)
  const closeGarden = useAuth((s) => s.closeGarden)
  const deleteGarden = useAuth((s) => s.deleteGarden)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  return (
    <Card className="p-5">
      <h2 className="mb-3 font-display text-2xl font-semibold text-garden">Gardens</h2>
      <div className="flex flex-col gap-2">
        {gardens.map((g) => (
          <div key={g.id} className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-line bg-parchment px-3">
            <span className="min-w-0 truncate text-sm font-medium">
              {g.name}
              {g.id === activeGardenId && <span className="ml-2 text-xs text-garden">(open)</span>}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              {g.id !== activeGardenId && (
                <button className="cursor-pointer text-xs text-garden underline" onClick={() => void selectGarden(g.id)}>
                  Open
                </button>
              )}
              {confirmDelete === g.id ? (
                <>
                  <button
                    className="cursor-pointer text-xs font-semibold text-red-urgent underline"
                    onClick={() => {
                      setConfirmDelete(null)
                      void deleteGarden(g.id)
                    }}
                  >
                    Really delete?
                  </button>
                  <button className="cursor-pointer text-xs text-ink-soft underline" onClick={() => setConfirmDelete(null)}>
                    Keep
                  </button>
                </>
              ) : (
                <button className="cursor-pointer text-xs text-ink-soft underline hover:text-red-urgent" onClick={() => setConfirmDelete(g.id)}>
                  Delete
                </button>
              )}
            </span>
          </div>
        ))}
      </div>
      <Button variant="secondary" className="mt-3" onClick={closeGarden}>
        ＋ New garden / switch
      </Button>
      <p className="mt-2 text-xs text-ink-soft">Deleting a garden permanently removes its plants, tasks, and journal.</p>
    </Card>
  )
}

function AccountCard() {
  const user = useAuth((s) => s.user)
  const mode = useAuth((s) => s.mode)
  const logout = useAuth((s) => s.logout)

  return (
    <Card className="p-5">
      <h2 className="mb-3 font-display text-2xl font-semibold text-garden">Account</h2>
      {mode === 'local' ? (
        <p className="text-sm text-ink-soft">
          Demo mode — no GardenOS server was found, so gardens live in this browser only. Run the
          server (see the README) for accounts and cross-device access.
        </p>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm">
            Signed in as <strong>{user?.username}</strong>
          </p>
          <Button variant="secondary" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
      )}
    </Card>
  )
}

export default function Settings() {
  const garden = useGarden((s) => s.garden)
  const updateGarden = useGarden((s) => s.updateGarden)
  const aiApiKey = usePrefs((s) => s.aiApiKey)
  const setAiApiKey = usePrefs((s) => s.setAiApiKey)
  const rows = usePlantRows()
  const [saved, setSaved] = useState(false)
  const [keyInput, setKeyInput] = useState(aiApiKey)
  const [keySaved, setKeySaved] = useState(false)
  const [showKey, setShowKey] = useState(false)

  const [form, setForm] = useState({
    name: garden.name,
    zipCode: garden.zipCode,
    usdaZone: garden.usdaZone,
    width: String(garden.widthUnits),
    height: String(garden.heightUnits),
    units: garden.units,
    lastFrost: doyToInput(garden.lastFrostDoy),
    firstFrost: doyToInput(garden.firstFrostDoy),
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    setSaved(false)
  }

  const save = () => {
    const year = new Date().getFullYear()
    const toDoy = (mmdd: string, fallback: number) => {
      const d = parseIso(`${year}-${mmdd}`)
      return Number.isNaN(d.getTime()) ? fallback : Math.ceil((d.getTime() - new Date(year, 0, 0).getTime()) / 86_400_000)
    }
    updateGarden({
      name: form.name.trim() || garden.name,
      zipCode: form.zipCode.trim(),
      usdaZone: form.usdaZone.trim(),
      widthUnits: Number(form.width) || garden.widthUnits,
      heightUnits: Number(form.height) || garden.heightUnits,
      units: form.units as 'imperial' | 'metric',
      lastFrostDoy: toDoy(form.lastFrost, garden.lastFrostDoy),
      firstFrostDoy: toDoy(form.firstFrost, garden.firstFrostDoy),
    })
    setSaved(true)
  }

  const exportCsv = () => {
    const header = 'Name,Type,Height,Spacing (in),Bloom,Water,Sun,Bed,Source,Price,Planted,Observed overrides'
    const lines = rows
      .filter((r) => r.instance.status === 'active')
      .map((r) => {
        const p = r.plant
        const bloom = p.bloomStartMonth && p.bloomEndMonth
          ? `${MONTH_NAMES[p.bloomStartMonth - 1].slice(0, 3)}-${MONTH_NAMES[p.bloomEndMonth - 1].slice(0, 3)}`
          : ''
        const cells = [
          p.displayName, p.plantType, formatHeight(p.matureHeightIn), p.spacingIn ?? '', bloom,
          p.waterNeeds ?? '', p.sunNeeds ?? '', r.bedName ?? '', r.instance.sourceName ?? '',
          r.instance.pricePaidCents != null ? (r.instance.pricePaidCents / 100).toFixed(2) : '',
          r.instance.plantedOn ?? '', p.overriddenKeys.join('; '),
        ]
        return cells.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(',')
      })
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'gardenos-plants.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const year = new Date().getFullYear()

  return (
    <div>
      <PageHeader title="Settings" subtitle="Garden profile, units, and data export" />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 font-display text-2xl font-semibold text-garden">Garden Profile</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Garden name">
              <input className={inputClass} value={form.name} onChange={set('name')} />
            </Field>
            <Field label="ZIP code">
              <input className={inputClass} value={form.zipCode} onChange={set('zipCode')} />
            </Field>
            <Field label="USDA zone (auto from ZIP, overridable)">
              <input className={inputClass} value={form.usdaZone} onChange={set('usdaZone')} />
            </Field>
            <Field label="Preferred units">
              <select className={inputClass} value={form.units} onChange={set('units')}>
                <option value="imperial">Imperial (ft / in)</option>
                <option value="metric">Metric (m / cm)</option>
              </select>
            </Field>
            <Field label={`Yard width (${form.units === 'metric' ? 'm' : 'ft'})`}>
              <input type="number" min={1} className={inputClass} value={form.width} onChange={set('width')} />
            </Field>
            <Field label={`Yard depth (${form.units === 'metric' ? 'm' : 'ft'})`}>
              <input type="number" min={1} className={inputClass} value={form.height} onChange={set('height')} />
            </Field>
            <Field label="Average last frost (spring)">
              <input type="date" className={inputClass} value={`${year}-${form.lastFrost}`} onChange={(e) => { setForm((f) => ({ ...f, lastFrost: e.target.value.slice(5) })); setSaved(false) }} />
            </Field>
            <Field label="Average first frost (fall)">
              <input type="date" className={inputClass} value={`${year}-${form.firstFrost}`} onChange={(e) => { setForm((f) => ({ ...f, firstFrost: e.target.value.slice(5) })); setSaved(false) }} />
            </Field>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={save}>Save profile</Button>
            {saved && <span className="text-sm text-garden">Saved ✓</span>}
          </div>
          <p className="mt-3 text-xs text-ink-soft">
            Frost dates drive frost-protection tasks and the Task View banner. Current: last frost ≈ {formatDate(dateFromDoy(year, garden.lastFrostDoy))}, first frost ≈ {formatDate(dateFromDoy(year, garden.firstFrostDoy))}.
          </p>
        </Card>

        <div className="flex flex-col gap-5">
          <GardensCard />
          <AccountCard />
          <Card className="p-5">
            <h2 className="mb-1 font-display text-2xl font-semibold text-garden">AI Plant Lookup</h2>
            <p className="mb-3 text-xs text-ink-soft">
              Powers the "Look up with AI" button when adding a plant. Preferred setup: set
              ANTHROPIC_API_KEY on the GardenOS server (.env on the NAS) — then every user gets AI
              lookup with no key here. The field below is a per-browser fallback used only when the
              server has no key: it's saved in this browser's storage and calls the Anthropic API
              directly. Get a key at{' '}
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="text-garden underline">
                console.anthropic.com
              </a>.
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                type={showKey ? 'text' : 'password'}
                className={`${inputClass} max-w-xs`}
                placeholder="sk-ant-…"
                value={keyInput}
                onChange={(e) => { setKeyInput(e.target.value); setKeySaved(false) }}
                autoComplete="off"
              />
              <Button variant="ghost" className="!min-h-11" onClick={() => setShowKey((v) => !v)}>
                {showKey ? 'Hide' : 'Show'}
              </Button>
              <Button onClick={() => { setAiApiKey(keyInput); setKeySaved(true) }}>Save key</Button>
              {aiApiKey && (
                <Button variant="danger" onClick={() => { setAiApiKey(''); setKeyInput(''); setKeySaved(false) }}>
                  Remove
                </Button>
              )}
            </div>
            {keySaved && <p className="mt-2 text-sm text-garden">Saved ✓</p>}
            <p className="mt-2 text-xs text-ink-soft">{aiApiKey ? 'A key is set in this browser.' : 'No key set — AI lookup is disabled.'}</p>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-display text-2xl font-semibold text-garden">Export</h2>
            <p className="mb-4 text-sm text-ink-soft">Share your garden with a nursery, print it, or back it up.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={exportCsv}>CSV plant list</Button>
              <Button variant="secondary" disabled title="Available when connected to the GardenOS export service">PDF summary</Button>
              <Button variant="secondary" disabled title="Available when connected to the GardenOS export service">PNG map snapshot</Button>
            </div>
            <p className="mt-3 text-xs text-ink-soft">PDF and PNG exports render server-side and are online-only.</p>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-display text-2xl font-semibold text-garden">About</h2>
            <p className="text-sm text-ink-soft">
              GardenOS keeps two layers of data for every plant: <strong>reference</strong> (the textbook) and{' '}
              <strong className="text-amber-urgent">✎ observed</strong> (your garden). Wherever the two differ, your
              observation wins — in tasks, the calendar, and on the map.
            </p>
            <p className="mt-3 text-xs text-ink-soft/70">Local demo build · data persists in this browser.</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
