import { Link } from 'react-router-dom'
import { useGarden } from '../store'
import { usePlantRows } from '../lib/selectors'
import { bloomsInMonth, daysBetween, formatDate, today } from '../lib/plant'
import { taskUrgency } from '../lib/taskEngine'
import { Card, Chip, ColorSwatchStrip, EmptyState, PageHeader, icons } from '../components/ui'

const KIND_LABEL: Record<string, string> = {
  prune: 'Prune',
  fertilize: 'Fertilize',
  water: 'Water',
  frost_protect: 'Frost protection',
  custom: 'To-do',
}

export default function Dashboard() {
  const tasks = useGarden((s) => s.tasks)
  const garden = useGarden((s) => s.garden)
  const rows = usePlantRows()
  const t = today()
  const month = Number(t.slice(5, 7))

  const rowByInstance = new Map(rows.map((r) => [r.instance.id, r]))
  const open = tasks.filter((task) => task.status === 'open' || task.status === 'snoozed')
  const overdue = open.filter((task) => taskUrgency(task, t) === 'overdue')
  const thisWeek = open
    .filter((task) => {
      const d = daysBetween(t, task.status === 'snoozed' && task.snoozedTo ? task.snoozedTo : task.dueOn)
      return d >= 0 && d <= 7
    })
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn))

  const blooming = rows.filter((r) => r.instance.status === 'active' && bloomsInMonth(r.plant, month))
  const frostSoon = (() => {
    const year = Number(t.slice(0, 4))
    const first = new Date(year, 0, garden.firstFrostDoy)
    const days = daysBetween(t, `${year}-${String(first.getMonth() + 1).padStart(2, '0')}-${String(first.getDate()).padStart(2, '0')}`)
    return days >= 0 && days <= 7
  })()
  const tender = rows.filter((r) => r.instance.status === 'active' && r.plant.frostTender)

  return (
    <div>
      <PageHeader
        title={garden.name}
        subtitle={`Zone ${garden.usdaZone} · ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
      />

      {/* Alerts */}
      {(overdue.length > 0 || frostSoon) && (
        <div className="mb-6 flex flex-col gap-2">
          {frostSoon && (
            <Link to="/tasks" className="flex items-center gap-3 rounded-xl border border-[#3d5a80]/30 bg-[#dde6f0] px-4 py-3 text-sm text-[#3d5a80]">
              {icons.snowflake('h-5 w-5 shrink-0')}
              <span>
                <strong>Frost likely within 7 days</strong> — {tender.length} plant{tender.length === 1 ? '' : 's'} may need protection.
              </span>
            </Link>
          )}
          {overdue.length > 0 && (
            <Link to="/tasks" className="flex items-center gap-3 rounded-xl border border-red-urgent/25 bg-[#f0d9d4] px-4 py-3 text-sm text-red-urgent">
              {icons.alert('h-5 w-5 shrink-0')}
              <span>
                <strong>{overdue.length} task{overdue.length === 1 ? '' : 's'} overdue</strong> — oldest: “{overdue[0].title}”
              </span>
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        {/* This Week */}
        <Card className="p-5 lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold text-garden">This Week</h2>
            <Link to="/tasks" className="flex items-center gap-0.5 text-sm font-medium text-garden hover:underline">
              All tasks {icons.chevronRight('h-4 w-4')}
            </Link>
          </div>
          {thisWeek.length === 0 && overdue.length === 0 ? (
            <EmptyState>Nothing due this week. The garden can just be enjoyed.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {[...overdue, ...thisWeek].slice(0, 6).map((task) => {
                const plant = task.instanceId ? rowByInstance.get(task.instanceId)?.plant : undefined
                const urgency = taskUrgency(task, t)
                return (
                  <li key={task.id}>
                    <Link to="/tasks" className="flex min-h-12 items-center gap-3 py-2.5 hover:bg-parchment-dark/40">
                      <Chip color={urgency === 'overdue' ? 'red' : urgency === 'soon' ? 'amber' : 'default'}>
                        {urgency === 'overdue' ? 'Overdue' : formatDate(task.dueOn)}
                      </Chip>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{task.title}</p>
                        <p className="text-xs text-ink-soft">
                          {KIND_LABEL[task.kind]}
                          {plant ? ` · ${plant.displayName}` : ''}
                        </p>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        {/* Blooming now */}
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold text-garden">Blooming Now</h2>
            <Link to="/map" className="flex items-center gap-0.5 text-sm font-medium text-garden hover:underline">
              Map {icons.chevronRight('h-4 w-4')}
            </Link>
          </div>
          {blooming.length === 0 ? (
            <EmptyState>Nothing in bloom this month — check the calendar for what's next.</EmptyState>
          ) : (
            <ul className="flex flex-col gap-2">
              {blooming.map((r) => (
                <li key={r.instance.id}>
                  <Link
                    to={`/plants/${r.instance.id}`}
                    className="flex min-h-11 items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-parchment-dark/40"
                  >
                    <span className="truncate text-sm font-medium">{r.plant.displayName}</span>
                    <ColorSwatchStrip colors={r.plant.colors} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Quick stats */}
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Active plants', value: rows.filter((r) => r.instance.status === 'active').length, to: '/plants' },
          { label: 'On the map', value: rows.filter((r) => r.placed && r.instance.status === 'active').length, to: '/map' },
          { label: 'Open tasks', value: open.length, to: '/tasks' },
          { label: 'In bloom', value: blooming.length, to: '/calendar' },
        ].map(({ label, value, to }) => (
          <Link key={label} to={to}>
            <Card className="p-4 transition-colors hover:border-garden/40">
              <p className="font-display text-3xl font-semibold text-garden">{value}</p>
              <p className="text-xs font-medium tracking-wide text-ink-soft uppercase">{label}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
