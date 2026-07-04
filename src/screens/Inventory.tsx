import { useState } from 'react'
import { useGarden } from '../store'
import { Button, Card, Chip, EmptyState, Field, PageHeader, icons, inputClass } from '../components/ui'
import type { InventoryItem, InventoryType } from '../lib/types'

type Status = 'good' | 'low' | 'out'

function statusOf(item: InventoryItem): Status {
  if (item.quantity === 0) return 'out'
  if (item.quantity <= item.lowThreshold) return 'low'
  return 'good'
}

const STATUS_META: Record<Status, { label: string; color: 'green' | 'amber' | 'red' }> = {
  good: { label: 'Good', color: 'green' },
  low: { label: 'Low', color: 'amber' },
  out: { label: 'Out', color: 'red' },
}

const TYPES: InventoryType[] = ['seed', 'bulb', 'tool', 'amendment', 'other']

function ItemCard({ item }: { item: InventoryItem }) {
  const setQty = useGarden((s) => s.setInventoryQuantity)
  const remove = useGarden((s) => s.deleteInventoryItem)
  const status = statusOf(item)
  const meta = STATUS_META[status]

  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{item.name}</p>
          <p className="text-xs text-ink-soft capitalize">{item.itemType}{item.sourceName ? ` · ${item.sourceName}` : ''}</p>
        </div>
        <Chip color={meta.color}>{meta.label}</Chip>
      </div>
      <div className="mt-auto flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button variant="secondary" className="!min-h-9 !px-2.5" onClick={() => setQty(item.id, item.quantity - 1)} disabled={item.quantity === 0}>−</Button>
          <span className="w-10 text-center text-sm font-semibold">{item.quantity}</span>
          <Button variant="secondary" className="!min-h-9 !px-2.5" onClick={() => setQty(item.id, item.quantity + 1)}>+</Button>
        </div>
        <div className="flex items-center gap-2">
          {status !== 'good' && item.sourceUrl && (
            <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-garden underline">
              Reorder ↗
            </a>
          )}
          <button className="cursor-pointer rounded p-1.5 text-ink-soft hover:text-red-urgent" title="Delete item" onClick={() => remove(item.id)}>
            {icons.x('h-4 w-4')}
          </button>
        </div>
      </div>
    </Card>
  )
}

function AddItemForm({ onClose }: { onClose: () => void }) {
  const addItem = useGarden((s) => s.addInventoryItem)
  const [name, setName] = useState('')
  const [itemType, setItemType] = useState<InventoryType>('seed')
  const [quantity, setQuantity] = useState('1')
  const [lowThreshold, setLowThreshold] = useState('1')
  const [sourceName, setSourceName] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')

  return (
    <Card className="mb-5 p-4">
      <form
        className="grid gap-3 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          addItem({
            name: name.trim(),
            itemType,
            quantity: Number(quantity) || 0,
            lowThreshold: Number(lowThreshold) || 0,
            sourceName: sourceName.trim() || undefined,
            sourceUrl: sourceUrl.trim() || undefined,
          })
          onClose()
        }}
      >
        <Field label="Name">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Type">
          <select className={inputClass} value={itemType} onChange={(e) => setItemType(e.target.value as InventoryType)}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Quantity">
            <input type="number" min={0} className={inputClass} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </Field>
          <Field label="Low at ≤">
            <input type="number" min={0} className={inputClass} value={lowThreshold} onChange={(e) => setLowThreshold(e.target.value)} />
          </Field>
        </div>
        <Field label="Source name">
          <input className={inputClass} value={sourceName} onChange={(e) => setSourceName(e.target.value)} />
        </Field>
        <Field label="Source link">
          <input className={inputClass} value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" />
        </Field>
        <div className="flex items-end gap-2">
          <Button type="submit">Add item</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Card>
  )
}

export default function Inventory() {
  const inventory = useGarden((s) => s.inventory)
  const [adding, setAdding] = useState(false)
  const [view, setView] = useState<'all' | 'reorder'>('all')

  const reorder = inventory.filter((item) => statusOf(item) !== 'good')
  const shown = view === 'all' ? inventory : reorder

  return (
    <div>
      <PageHeader
        title="Seed & Supply Inventory"
        subtitle="What's on hand — status updates automatically from quantity"
        action={<Button onClick={() => setAdding(true)}>{icons.plus('h-4 w-4')} Add Item</Button>}
      />

      {adding && <AddItemForm onClose={() => setAdding(false)} />}

      <div className="mb-5 flex gap-1 rounded-lg border border-line bg-cream p-1 w-fit">
        {(['all', 'reorder'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`min-h-9 cursor-pointer rounded-md px-4 text-sm font-medium ${view === v ? 'bg-garden text-cream' : 'text-ink-soft hover:text-ink'}`}
          >
            {v === 'all' ? `All (${inventory.length})` : `Reorder List (${reorder.length})`}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState>{view === 'reorder' ? 'Nothing needs reordering — well stocked.' : 'No items yet. Add your seeds, bulbs, and tools.'}</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {view === 'reorder' && reorder.length > 0 && (
        <p className="mt-4 text-xs text-ink-soft">
          Items marked <strong>Low</strong> or <strong>Out</strong> appear here with their source links, ready for your next order.
        </p>
      )}
    </div>
  )
}
