import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useGarden } from '../store'
import { usePlantRows } from '../lib/selectors'
import { MONTH_NAMES, bloomsInMonth, formatDate, seasonForMonth } from '../lib/plant'
import { Card, Chip, EmptyState, PageHeader } from '../components/ui'

export default function CalendarScreen() {
  const tasks = useGarden((s) => s.tasks)
  const rows = usePlantRows()
  const now = new Date()
  const year = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const [expanded, setExpanded] = useState<number | null>(currentMonth)

  const active = rows.filter((r) => r.instance.status === 'active')

  const monthData = (month: number) => {
    const blooms = active.filter((r) => bloomsInMonth(r.plant, month))
    const monthTasks = tasks
      .filter((task) => task.status === 'open' || task.status === 'snoozed')
      .filter((task) => {
        const due = task.status === 'snoozed' && task.snoozedTo ? task.snoozedTo : task.dueOn
        return Number(due.slice(0, 4)) === year && Number(due.slice(5, 7)) === month
      })
      .sort((a, b) => a.dueOn.localeCompare(b.dueOn))
    return { blooms, monthTasks }
  }

  const expandedData = expanded ? monthData(expanded) : null

  return (
    <div>
      <PageHeader title={`Seasonal Calendar ${year}`} subtitle="What's blooming and what needs doing, month by month — from your plants' effective data" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {MONTH_NAMES.map((name, i) => {
          const month = i + 1
          const { blooms, monthTasks } = monthData(month)
          const isCurrent = month === currentMonth
          const isOpen = month === expanded
          return (
            <button
              key={name}
              onClick={() => setExpanded(isOpen ? null : month)}
              className={`cursor-pointer rounded-xl border p-3 text-left transition-colors ${
                isOpen ? 'border-garden bg-garden-pale' : isCurrent ? 'border-garden/50 bg-cream' : 'border-line bg-cream hover:border-garden/40'
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span className={`font-display text-lg font-semibold ${isCurrent ? 'text-garden' : ''}`}>{name}</span>
                <span className="text-[10px] tracking-wide text-ink-soft uppercase">{seasonForMonth(month)}</span>
              </div>
              {/* bloom color chips */}
              <div className="mt-2 flex h-3 gap-0.5">
                {blooms.slice(0, 8).map((r) => (
                  <span
                    key={r.instance.id}
                    className="h-3 w-3 rounded-full border border-ink/10"
                    style={{ backgroundColor: r.plant.colors[seasonForMonth(month)] }}
                    title={r.plant.displayName}
                  />
                ))}
                {blooms.length === 0 && <span className="text-[10px] text-ink-soft/60">no blooms</span>}
              </div>
              <p className="mt-2 text-[11px] text-ink-soft">
                {blooms.length} blooming · {monthTasks.length} task{monthTasks.length === 1 ? '' : 's'}
              </p>
            </button>
          )
        })}
      </div>

      {expanded && expandedData && (
        <Card className="mt-5 p-5">
          <h2 className="mb-4 font-display text-3xl font-semibold text-garden">
            {MONTH_NAMES[expanded - 1]} {year}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-ink-soft uppercase">In bloom</h3>
              {expandedData.blooms.length === 0 ? (
                <EmptyState>Nothing blooming — a gap worth filling?</EmptyState>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {expandedData.blooms.map((r) => (
                    <li key={r.instance.id}>
                      <Link to={`/plants/${r.instance.id}`} className="flex min-h-10 items-center gap-2.5 rounded-lg px-2 hover:bg-parchment-dark/40">
                        <span
                          className="h-3.5 w-3.5 shrink-0 rounded-full border border-ink/10"
                          style={{ backgroundColor: r.plant.colors[seasonForMonth(expanded)] }}
                        />
                        <span className="text-sm font-medium">{r.plant.displayName}</span>
                        {r.plant.overriddenKeys.includes('bloomStartMonth') && (
                          <span className="text-xs text-amber-urgent" title="Observed bloom window">✎</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-ink-soft uppercase">Tasks due</h3>
              {expandedData.monthTasks.length === 0 ? (
                <EmptyState>No tasks this month.</EmptyState>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {expandedData.monthTasks.map((task) => (
                    <li key={task.id} className="flex min-h-10 items-center justify-between gap-2 rounded-lg px-2 text-sm">
                      <span className="min-w-0 truncate font-medium">{task.title}</span>
                      <Chip>{formatDate(task.status === 'snoozed' && task.snoozedTo ? task.snoozedTo : task.dueOn)}</Chip>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
