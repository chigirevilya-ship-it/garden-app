import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useGarden } from '../store'
import { usePlacedPlants, usePlantRows } from '../lib/selectors'
import {
  MARKER_RADIUS_FT,
  SEASONS,
  bloomWindowLabel,
  companionEdges,
  formatHeight,
  heightCategory,
  seasonForMonth,
  spacingConflicts,
} from '../lib/plant'
import type { Bed, Drainage, Season, SunNeeds } from '../lib/types'
import { Button, Card, Chip, Field, PageHeader, icons, inputClass } from '../components/ui'

type Layer = 'none' | 'height' | 'spacing' | 'sunlight' | 'companions' | 'drainage'

const LAYERS: { key: Layer; label: string; hint: string }[] = [
  { key: 'none', label: 'Season colors', hint: 'Base view — markers take each plant’s seasonal color' },
  { key: 'height', label: 'Height', hint: 'Circles scale with mature height (topo view)' },
  { key: 'spacing', label: 'Spacing', hint: 'Footprint rings; overlaps turn red' },
  { key: 'sunlight', label: 'Sunlight', hint: 'Bed wash: full sun / partial / shade' },
  { key: 'companions', label: 'Companions', hint: 'Green = good neighbors · red = poor' },
  { key: 'drainage', label: 'Drainage', hint: 'Bed wash: well-drained / boggy / dry' },
]

const SUN_WASH: Record<string, string> = { full: '#eeda8b', partial: '#ccd68f', shade: '#8aa791' }
const DRAIN_WASH: Record<string, string> = { well: '#a9c8a2', boggy: '#88afd6', dry: '#dcbd85' }

interface Transform {
  k: number
  tx: number
  ty: number
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

const snap = (v: number) => Math.round(v * 2) / 2

function normRect(a: { x: number; y: number }, b: { x: number; y: number }): Rect {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) }
}

type BedAction =
  | { kind: 'draw'; start: { x: number; y: number } }
  | { kind: 'move'; bedId: string; start: { x: number; y: number }; orig: Rect; moved: boolean }
  | { kind: 'resize'; bedId: string; orig: Rect }

/** Shared editor for a new (pending) or existing bed: name + growing conditions (US-104). */
function BedForm({
  bed,
  pending,
  onCreate,
  onChange,
  onDelete,
  onClose,
}: {
  bed: Partial<Bed>
  pending: boolean
  onCreate?: (data: { name: string; soilType: string; sunlight: SunNeeds; drainage: Drainage }) => void
  onChange?: (patch: Partial<Bed>) => void
  onDelete?: () => void
  onClose: () => void
}) {
  const [name, setName] = useState(bed.name ?? '')
  const [soilType, setSoilType] = useState(bed.soilType ?? 'loam')
  const [sunlight, setSunlight] = useState<SunNeeds>(bed.sunlight ?? 'full')
  const [drainage, setDrainage] = useState<Drainage>(bed.drainage ?? 'well')

  const patch = (p: Partial<Bed>) => onChange?.(p)

  return (
    <Card className="mt-4 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-2xl font-semibold text-garden">
          {pending ? `New bed (${bed.w} × ${bed.h} ft)` : `Edit “${bed.name}”`}
        </h2>
        <Button variant="ghost" onClick={onClose}>{icons.x('h-4 w-4')}</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Bed name">
          <input
            className={inputClass}
            value={name}
            autoFocus={pending}
            placeholder="e.g. Rose Border"
            onChange={(e) => {
              setName(e.target.value)
              if (!pending && e.target.value.trim()) patch({ name: e.target.value.trim() })
            }}
          />
        </Field>
        <Field label="Soil type">
          <select className={inputClass} value={soilType} onChange={(e) => { setSoilType(e.target.value); patch({ soilType: e.target.value }) }}>
            {['loam', 'clay', 'sandy', 'silt'].map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Sunlight">
          <select className={inputClass} value={sunlight} onChange={(e) => { setSunlight(e.target.value as SunNeeds); patch({ sunlight: e.target.value as SunNeeds }) }}>
            <option value="full">Full sun</option>
            <option value="partial">Partial</option>
            <option value="shade">Shade</option>
          </select>
        </Field>
        <Field label="Drainage">
          <select className={inputClass} value={drainage} onChange={(e) => { setDrainage(e.target.value as Drainage); patch({ drainage: e.target.value as Drainage }) }}>
            <option value="well">Well-drained</option>
            <option value="boggy">Boggy</option>
            <option value="dry">Dry</option>
          </select>
        </Field>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {pending ? (
          <Button disabled={!name.trim()} onClick={() => onCreate?.({ name: name.trim(), soilType, sunlight, drainage })}>
            Create bed
          </Button>
        ) : (
          <>
            <p className="text-xs text-ink-soft">Drag the bed to move it · drag the corner handle to resize · sunlight and drainage drive the map's wash layers.</p>
            <Button variant="danger" className="ml-auto" onClick={onDelete}>Delete bed</Button>
          </>
        )}
      </div>
    </Card>
  )
}

export default function MapScreen() {
  const garden = useGarden((s) => s.garden)
  const beds = useGarden((s) => s.beds)
  const rules = useGarden((s) => s.companionRules)
  const placePlant = useGarden((s) => s.placePlant)
  const removePlacement = useGarden((s) => s.removePlacement)
  const addBed = useGarden((s) => s.addBed)
  const updateBed = useGarden((s) => s.updateBed)
  const deleteBed = useGarden((s) => s.deleteBed)

  const rows = usePlantRows()
  const placed = usePlacedPlants()

  const [season, setSeason] = useState<Season>(seasonForMonth(new Date().getMonth() + 1))
  const [layer, setLayer] = useState<Layer>('none')
  const [layersOpen, setLayersOpen] = useState(false) // mobile bottom sheet
  const [selected, setSelected] = useState<string | null>(null)
  const [moving, setMoving] = useState(false)
  const [placingAt, setPlacingAt] = useState<{ x: number; y: number } | null>(null)
  const [placeSearch, setPlaceSearch] = useState('')
  const [transform, setTransform] = useState<Transform>({ k: 1, tx: 0, ty: 0 })

  // Bed editing (US-104)
  const [editingBeds, setEditingBeds] = useState(false)
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null)
  const [bedDraft, setBedDraft] = useState<Rect | null>(null) // live rectangle while drawing
  const [pendingBed, setPendingBed] = useState<Rect | null>(null) // drawn, awaiting name
  const bedAction = useRef<BedAction | null>(null)

  const toggleBedEditing = () => {
    setEditingBeds((v) => !v)
    setSelectedBedId(null)
    setBedDraft(null)
    setPendingBed(null)
    setSelected(null)
    setPlacingAt(null)
    setMoving(false)
    bedAction.current = null
  }

  const W = garden.widthUnits
  const H = garden.heightUnits

  const conflicts = useMemo(() => spacingConflicts(placed), [placed])
  const edges = useMemo(() => companionEdges(placed, rules), [placed, rules])

  const selectedPlaced = placed.find((p) => p.instanceId === selected)
  const selectedRow = rows.find((r) => r.instance.id === selected)
  const selectedEdges = edges.filter((e) => e.a.instanceId === selected || e.b.instanceId === selected)

  const unplaced = rows.filter((r) => r.instance.status === 'active' && !r.placed)
  const placeCandidates = unplaced.filter((r) =>
    r.plant.displayName.toLowerCase().includes(placeSearch.toLowerCase()),
  )

  // ---------- pan / zoom / tap ----------
  const svgRef = useRef<SVGSVGElement>(null)
  const gesture = useRef<{
    pointers: Map<number, { x: number; y: number }>
    start: Transform
    startMid: { x: number; y: number }
    startDist: number
    movedFar: boolean
  } | null>(null)

  const toViewBox = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect()
    return { x: ((clientX - rect.left) / rect.width) * W, y: ((clientY - rect.top) / rect.height) * H }
  }
  const toGarden = (clientX: number, clientY: number) => {
    const v = toViewBox(clientX, clientY)
    return { x: (v.x - transform.tx) / transform.k, y: (v.y - transform.ty) / transform.k }
  }

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    svgRef.current!.setPointerCapture(e.pointerId)
    const pointers = gesture.current?.pointers ?? new Map()

    if (editingBeds && pointers.size === 0) {
      // first finger in edit mode starts a bed gesture: resize handle → bed body → draw
      const pt = toGarden(e.clientX, e.clientY)
      const sel = beds.find((b) => b.id === selectedBedId)
      if (sel && Math.abs(pt.x - (sel.x + sel.w)) < 0.8 && Math.abs(pt.y - (sel.y + sel.h)) < 0.8) {
        bedAction.current = { kind: 'resize', bedId: sel.id, orig: { x: sel.x, y: sel.y, w: sel.w, h: sel.h } }
      } else {
        const hit = [...beds].reverse().find((b) => pt.x >= b.x && pt.x <= b.x + b.w && pt.y >= b.y && pt.y <= b.y + b.h)
        if (hit) {
          bedAction.current = { kind: 'move', bedId: hit.id, start: pt, orig: { x: hit.x, y: hit.y, w: hit.w, h: hit.h }, moved: false }
        } else if (pt.x >= 0 && pt.y >= 0 && pt.x <= W && pt.y <= H) {
          bedAction.current = { kind: 'draw', start: { x: snap(pt.x), y: snap(pt.y) } }
        }
      }
    } else if (editingBeds && bedAction.current) {
      // second finger joins → abandon the bed gesture, let pinch take over
      const a = bedAction.current
      if (a.kind === 'move' || a.kind === 'resize') updateBed(a.bedId, a.orig)
      bedAction.current = null
      setBedDraft(null)
    }

    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pts = [...pointers.values()]
    const mid = pts.length === 2 ? { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 } : pts[0]
    gesture.current = {
      pointers,
      start: transform,
      startMid: mid,
      startDist: pts.length === 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0,
      movedFar: gesture.current?.movedFar ?? false,
    }
  }

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const g = gesture.current
    if (!g || !g.pointers.has(e.pointerId)) return
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pts = [...g.pointers.values()]
    const rect = svgRef.current!.getBoundingClientRect()
    const pxToVb = W / rect.width

    if (editingBeds && pts.length === 1) {
      const a = bedAction.current
      if (!a) return // no one-finger panning in edit mode; use two fingers, wheel, or buttons
      const pt = toGarden(e.clientX, e.clientY)
      g.movedFar = true
      if (a.kind === 'draw') {
        setBedDraft(normRect(a.start, { x: snap(pt.x), y: snap(pt.y) }))
      } else if (a.kind === 'move') {
        const dx = snap(pt.x - a.start.x)
        const dy = snap(pt.y - a.start.y)
        if (dx !== 0 || dy !== 0) a.moved = true
        updateBed(a.bedId, {
          x: Math.min(Math.max(a.orig.x + dx, 0), W - a.orig.w),
          y: Math.min(Math.max(a.orig.y + dy, 0), H - a.orig.h),
        })
      } else {
        updateBed(a.bedId, {
          w: Math.max(1, Math.min(snap(pt.x - a.orig.x), W - a.orig.x)),
          h: Math.max(1, Math.min(snap(pt.y - a.orig.y), H - a.orig.y)),
        })
      }
      return
    }

    if (pts.length === 1) {
      const dx = pts[0].x - g.startMid.x
      const dy = pts[0].y - g.startMid.y
      if (Math.hypot(dx, dy) > 6) g.movedFar = true
      if (g.movedFar) {
        setTransform({ k: g.start.k, tx: g.start.tx + dx * pxToVb, ty: g.start.ty + dy * pxToVb * (H / W) * (rect.width / rect.height) })
      }
    } else if (pts.length === 2) {
      g.movedFar = true
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      const scale = g.startDist > 0 ? dist / g.startDist : 1
      const k = Math.min(6, Math.max(0.5, g.start.k * scale))
      // keep the midpoint fixed
      const vmStart = { x: ((g.startMid.x - rect.left) / rect.width) * W, y: ((g.startMid.y - rect.top) / rect.height) * H }
      const vmNow = { x: ((mid.x - rect.left) / rect.width) * W, y: ((mid.y - rect.top) / rect.height) * H }
      const gx = (vmStart.x - g.start.tx) / g.start.k
      const gy = (vmStart.y - g.start.ty) / g.start.k
      setTransform({ k, tx: vmNow.x - gx * k, ty: vmNow.y - gy * k })
    }
  }

  const endPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const g = gesture.current
    if (!g) return
    g.pointers.delete(e.pointerId)
    if (g.pointers.size === 0) {
      const tapped = !g.movedFar
      gesture.current = null
      if (editingBeds) {
        const a = bedAction.current
        bedAction.current = null
        setBedDraft(null)
        if (a?.kind === 'draw') {
          const pt = toGarden(e.clientX, e.clientY)
          const drawn = normRect(a.start, { x: snap(pt.x), y: snap(pt.y) })
          if (drawn.w >= 1 && drawn.h >= 1) {
            setPendingBed(drawn)
            setSelectedBedId(null)
          } else {
            setSelectedBedId(null) // tap on empty ground deselects
            setPendingBed(null)
          }
        } else if (a?.kind === 'move' && !a.moved) {
          setSelectedBedId(a.bedId) // tap on a bed selects it
          setPendingBed(null)
        }
        return
      }
      if (tapped) handleTap(e.clientX, e.clientY)
    } else {
      // re-anchor remaining pointer
      const pts = [...g.pointers.values()]
      g.start = transform
      g.startMid = pts.length === 2 ? { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 } : pts[0]
      g.startDist = pts.length === 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0
    }
  }

  const handleTap = (clientX: number, clientY: number) => {
    const pt = toGarden(clientX, clientY)
    if (pt.x < 0 || pt.y < 0 || pt.x > W || pt.y > H) return
    const snapped = { x: Math.round(pt.x * 2) / 2, y: Math.round(pt.y * 2) / 2 }

    // tap on a marker?
    const hit = [...placed]
      .reverse()
      .find((p) => Math.hypot(p.x - pt.x, p.y - pt.y) <= Math.max(MARKER_RADIUS_FT[heightCategory(p.plant.matureHeightIn)], 0.8))

    if (moving && selected) {
      placePlant(selected, snapped.x, snapped.y)
      setMoving(false)
      return
    }
    if (hit) {
      setSelected(hit.instanceId)
      setPlacingAt(null)
      return
    }
    if (selected) {
      setSelected(null)
      return
    }
    setPlacingAt(snapped)
  }

  const onWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    const v = toViewBox(e.clientX, e.clientY)
    const k = Math.min(6, Math.max(0.5, transform.k * Math.exp(-e.deltaY * 0.0015)))
    const gx = (v.x - transform.tx) / transform.k
    const gy = (v.y - transform.ty) / transform.k
    setTransform({ k, tx: v.x - gx * k, ty: v.y - gy * k })
  }

  const zoomBy = (factor: number) => {
    const k = Math.min(6, Math.max(0.5, transform.k * factor))
    const cx = W / 2
    const cy = H / 2
    const gx = (cx - transform.tx) / transform.k
    const gy = (cy - transform.ty) / transform.k
    setTransform({ k, tx: cx - gx * k, ty: cy - gy * k })
  }

  const confirmPlace = (instanceId: string) => {
    if (!placingAt) return
    placePlant(instanceId, placingAt.x, placingAt.y)
    setPlacingAt(null)
    setPlaceSearch('')
    setSelected(instanceId)
  }

  const markerR = (p: (typeof placed)[number]) =>
    layer === 'height'
      ? 0.5 + Math.min((p.plant.matureHeightIn ?? 24) / 55, 2.6)
      : MARKER_RADIUS_FT[heightCategory(p.plant.matureHeightIn)]

  const layerPanel = (
    <div className="flex flex-col gap-1">
      {LAYERS.map(({ key, label, hint }) => (
        <button
          key={key}
          onClick={() => {
            setLayer(key)
            setLayersOpen(false)
          }}
          className={`cursor-pointer rounded-lg px-3 py-2 text-left transition-colors ${
            layer === key ? 'bg-garden text-cream' : 'hover:bg-parchment-dark'
          }`}
        >
          <span className="block text-sm font-medium">{label}</span>
          <span className={`block text-[11px] ${layer === key ? 'text-cream/75' : 'text-ink-soft'}`}>{hint}</span>
        </button>
      ))}
    </div>
  )

  return (
    <div>
      <PageHeader
        title="Garden Map"
        subtitle={
          editingBeds
            ? 'Bed editing — drag on empty ground to draw a bed, tap a bed to edit or move it'
            : `${W} × ${H} ft · ${placed.length} plants placed · tap an empty spot to plant`
        }
        action={
          <Button variant={editingBeds ? 'primary' : 'secondary'} onClick={toggleBedEditing}>
            {editingBeds ? 'Done editing beds' : 'Edit beds'}
          </Button>
        }
      />

      {/* Season toggle (US-102) */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-line bg-cream p-1">
          {SEASONS.map((s) => (
            <button
              key={s}
              onClick={() => setSeason(s)}
              className={`min-h-9 cursor-pointer rounded-md px-3.5 text-sm font-medium capitalize ${
                season === s ? 'bg-garden text-cream' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="ml-auto hidden gap-1 lg:flex">
          <Button variant="secondary" className="!min-h-9 !px-3" onClick={() => zoomBy(1.3)}>+</Button>
          <Button variant="secondary" className="!min-h-9 !px-3" onClick={() => zoomBy(1 / 1.3)}>−</Button>
          <Button variant="ghost" className="!min-h-9" onClick={() => setTransform({ k: 1, tx: 0, ty: 0 })}>Reset</Button>
        </div>
        <Button variant="secondary" className="!min-h-9 lg:hidden" onClick={() => setLayersOpen(true)}>
          {icons.layers('h-4 w-4')} Layers
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
        {/* Canvas */}
        <Card className="overflow-hidden">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="block w-full touch-none select-none"
            style={{ aspectRatio: `${W} / ${H}`, cursor: moving ? 'crosshair' : 'default' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
            onWheel={onWheel}
            role="application"
            aria-label={`Garden map, ${placed.length} plants`}
          >
            <g transform={`translate(${transform.tx},${transform.ty}) scale(${transform.k})`}>
              {/* lawn */}
              <rect x={0} y={0} width={W} height={H} fill="#e7e2d3" />
              {/* grid */}
              {Array.from({ length: W + 1 }, (_, i) => (
                <line key={`v${i}`} x1={i} y1={0} x2={i} y2={H} stroke="#d8d0bd" strokeWidth={i % 5 === 0 ? 0.04 : 0.02} />
              ))}
              {Array.from({ length: H + 1 }, (_, i) => (
                <line key={`h${i}`} x1={0} y1={i} x2={W} y2={i} stroke="#d8d0bd" strokeWidth={i % 5 === 0 ? 0.04 : 0.02} />
              ))}

              {/* beds */}
              {beds.map((b) => {
                const wash =
                  layer === 'sunlight'
                    ? SUN_WASH[b.sunlight ?? 'full']
                    : layer === 'drainage'
                      ? DRAIN_WASH[b.drainage ?? 'well']
                      : '#ddd6c2'
                const isSelectedBed = editingBeds && b.id === selectedBedId
                return (
                  <g key={b.id}>
                    <rect
                      x={b.x} y={b.y} width={b.w} height={b.h} rx={0.4}
                      fill={wash}
                      fillOpacity={layer === 'sunlight' || layer === 'drainage' ? 0.85 : 0.6}
                      stroke={isSelectedBed ? '#2a4a22' : '#a89e84'}
                      strokeWidth={isSelectedBed ? 0.16 : 0.08}
                      strokeDasharray={isSelectedBed ? undefined : '0.35 0.2'}
                    />
                    <text x={b.x + 0.4} y={b.y + 0.95} fontSize={0.8} fill="#6b6a58" fontFamily="Outfit, sans-serif" fontWeight={600}>
                      {b.name}
                    </text>
                    {isSelectedBed && (
                      <rect
                        x={b.x + b.w - 0.5} y={b.y + b.h - 0.5} width={1} height={1} rx={0.15}
                        fill="#2a4a22" stroke="#fbf8f2" strokeWidth={0.08}
                      />
                    )}
                  </g>
                )
              })}

              {/* bed being drawn */}
              {editingBeds && bedDraft && (
                <rect
                  x={bedDraft.x} y={bedDraft.y} width={bedDraft.w} height={bedDraft.h} rx={0.4}
                  fill="#2a4a22" fillOpacity={0.12}
                  stroke="#2a4a22" strokeWidth={0.12} strokeDasharray="0.4 0.25"
                />
              )}
              {editingBeds && pendingBed && !bedDraft && (
                <rect
                  x={pendingBed.x} y={pendingBed.y} width={pendingBed.w} height={pendingBed.h} rx={0.4}
                  fill="#2a4a22" fillOpacity={0.12}
                  stroke="#2a4a22" strokeWidth={0.12} strokeDasharray="0.4 0.25"
                />
              )}

              {/* spacing rings (US-103) */}
              {layer === 'spacing' &&
                placed.map((p) => {
                  const r = (p.plant.spacingIn ?? 12) / 24
                  const bad = conflicts.has(p.instanceId)
                  return (
                    <circle
                      key={`ring-${p.instanceId}`}
                      cx={p.x} cy={p.y} r={r}
                      fill={bad ? '#a63d2f' : '#2a4a22'} fillOpacity={0.13}
                      stroke={bad ? '#a63d2f' : '#2a4a22'} strokeOpacity={0.55} strokeWidth={0.06}
                    />
                  )
                })}

              {/* companion lines (US-103/702) */}
              {layer === 'companions' &&
                edges.map((e, i) => (
                  <line
                    key={i}
                    x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y}
                    stroke={e.relation === 'good' ? '#2a7a3b' : '#a63d2f'}
                    strokeWidth={0.14} strokeDasharray={e.relation === 'bad' ? '0.4 0.25' : undefined} strokeOpacity={0.9}
                  />
                ))}

              {/* plant markers */}
              {placed.map((p) => {
                const r = markerR(p)
                const isSelected = p.instanceId === selected
                const conflicted = conflicts.has(p.instanceId)
                return (
                  <circle
                    key={p.instanceId}
                    cx={p.x} cy={p.y} r={r}
                    fill={p.plant.colors[season]}
                    fillOpacity={editingBeds ? 0.35 : layer === 'height' ? 0.72 : 0.95}
                    stroke={isSelected ? '#2b2b23' : conflicted ? '#a63d2f' : '#fbf8f2'}
                    strokeWidth={isSelected ? 0.14 : conflicted ? 0.12 : 0.07}
                    aria-label={`${p.plant.displayName}, ${heightCategory(p.plant.matureHeightIn)} height${p.plant.bloomStartMonth ? `, blooms ${bloomWindowLabel(p.plant)}` : ''}`}
                  />
                )
              })}

              {/* placement ghost */}
              {placingAt && (
                <circle cx={placingAt.x} cy={placingAt.y} r={0.8} fill="none" stroke="#2a4a22" strokeWidth={0.1} strokeDasharray="0.3 0.2">
                  <animate attributeName="r" values="0.65;0.9;0.65" dur="1.6s" repeatCount="indefinite" />
                </circle>
              )}
            </g>
          </svg>
        </Card>

        {/* Desktop layer panel */}
        <div className="hidden lg:block">
          <Card className="p-3">
            <h2 className="mb-2 px-2 text-xs font-semibold tracking-wide text-ink-soft uppercase">Layers</h2>
            {layerPanel}
          </Card>
          {conflicts.size > 0 && (
            <p className="mt-3 flex items-start gap-1.5 px-1 text-xs text-red-urgent">
              {icons.alert('mt-0.5 h-3.5 w-3.5 shrink-0')}
              {conflicts.size} plants are closer than their spacing allows — a warning, not a block.
            </p>
          )}
        </div>
      </div>

      {/* Selected plant popover (US-101 step 4) */}
      {selectedRow && selectedPlaced && (
        <Card className="mt-4 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-2xl font-semibold text-garden">{selectedRow.plant.displayName}</p>
              <p className="mt-0.5 text-sm text-ink-soft">
                {formatHeight(selectedRow.plant.matureHeightIn)} tall · spacing {selectedRow.plant.spacingIn ?? '—'}″
                {selectedRow.plant.bloomStartMonth && ` · blooms ${bloomWindowLabel(selectedRow.plant)}`}
                {selectedRow.bedName && ` · ${selectedRow.bedName}`}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {conflicts.has(selectedPlaced.instanceId) && <Chip color="red">Too close to a neighbor</Chip>}
                {selectedEdges.map((e, i) => {
                  const other = e.a.instanceId === selected ? e.b : e.a
                  return (
                    <Chip key={i} color={e.relation === 'good' ? 'green' : 'red'} className="max-w-full">
                      <span className="truncate" title={e.reason}>
                        {e.relation === 'good' ? '✓' : '✗'} {other.plant.displayName}
                      </span>
                    </Chip>
                  )
                })}
              </div>
              {selectedEdges.some((e) => e.relation === 'bad') && (
                <p className="mt-1.5 text-xs text-red-urgent">
                  {selectedEdges.find((e) => e.relation === 'bad')!.reason} Consider moving one.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to={`/plants/${selected}`}>
                <Button variant="secondary">Full record</Button>
              </Link>
              <Button variant={moving ? 'primary' : 'secondary'} onClick={() => setMoving((v) => !v)}>
                {moving ? 'Tap a new spot…' : 'Move'}
              </Button>
              <Button variant="danger" onClick={() => { removePlacement(selected!); setSelected(null); setMoving(false) }}>
                Remove from map
              </Button>
              <Button variant="ghost" onClick={() => { setSelected(null); setMoving(false) }}>{icons.x('h-4 w-4')}</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Placement drawer (US-101 step 2) */}
      {placingAt && !selected && (
        <Card className="mt-4 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold text-garden">
              Plant at ({placingAt.x}, {placingAt.y})
            </h2>
            <Button variant="ghost" onClick={() => setPlacingAt(null)}>{icons.x('h-4 w-4')}</Button>
          </div>
          {unplaced.length === 0 ? (
            <p className="text-sm text-ink-soft">
              Every plant in your database is already on the map.{' '}
              <Link to="/plants" className="text-garden underline">Add a new plant</Link> first, then place it here.
            </p>
          ) : (
            <>
              <input
                className={`${inputClass} mb-3 max-w-sm`}
                placeholder="Search your unplaced plants…"
                value={placeSearch}
                onChange={(e) => setPlaceSearch(e.target.value)}
                autoFocus
              />
              <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                {placeCandidates.map((r) => (
                  <button
                    key={r.instance.id}
                    onClick={() => confirmPlace(r.instance.id)}
                    className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 text-left hover:bg-parchment-dark"
                  >
                    <span className="text-sm font-medium">{r.plant.displayName}</span>
                    <span className="text-xs text-ink-soft">
                      {formatHeight(r.plant.matureHeightIn)} · spacing {r.plant.spacingIn ?? '—'}″
                    </span>
                  </button>
                ))}
                {placeCandidates.length === 0 && <p className="px-3 py-2 text-sm text-ink-soft">No matches.</p>}
              </div>
            </>
          )}
        </Card>
      )}

      {/* Bed editing panels (US-104) */}
      {editingBeds && pendingBed && (
        <BedForm
          bed={pendingBed}
          pending
          onCreate={(data) => {
            const id = addBed({ ...data, ...pendingBed })
            setPendingBed(null)
            setSelectedBedId(id)
          }}
          onClose={() => setPendingBed(null)}
        />
      )}
      {editingBeds && !pendingBed && selectedBedId && beds.some((b) => b.id === selectedBedId) && (
        <BedForm
          key={selectedBedId}
          bed={beds.find((b) => b.id === selectedBedId)!}
          pending={false}
          onChange={(patch) => updateBed(selectedBedId, patch)}
          onDelete={() => {
            deleteBed(selectedBedId)
            setSelectedBedId(null)
          }}
          onClose={() => setSelectedBedId(null)}
        />
      )}
      {editingBeds && !pendingBed && !selectedBedId && (
        <p className="mt-4 text-sm text-ink-soft">
          Drag on empty ground to draw a new bed. Tap an existing bed to rename it, set its soil,
          sunlight, and drainage, move it, resize it, or delete it. Plants keep their spots — they
          re-attach to whichever bed sits under them. Pan with two fingers or the zoom buttons while editing.
        </p>
      )}

      {/* Mobile layers bottom sheet (US-803) */}
      {layersOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setLayersOpen(false)}>
          <div className="absolute inset-0 bg-ink/30" />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-line bg-cream p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
            <h2 className="mb-2 px-2 text-xs font-semibold tracking-wide text-ink-soft uppercase">Map layers</h2>
            {layerPanel}
          </div>
        </div>
      )}
    </div>
  )
}
