import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useGarden } from '../store'
import { usePlantRows } from '../lib/selectors'
import { addDays, dateFromDoy, daysBetween, formatDate, parseIso, today } from '../lib/plant'
import { recurrenceLabel, taskUrgency, type Urgency } from '../lib/taskEngine'
import { Button, Card, Chip, EmptyState, Field, PageHeader, icons, inputClass } from '../components/ui'
import type { Task, TaskRecurrence } from '../lib/types'

const KIND_LABEL: Record<string, string> = {
  prune: 'Prune',
  fertilize: 'Fertilize',
  water: 'Water',
  frost_protect: 'Frost protection',
  custom: 'To-do',
}

const GROUPS: { key: Urgency; label: string }[] = [
  { key: 'overdue', label: 'Overdue' },
  { key: 'soon', label: 'Due Soon' },
  { key: 'upcoming', label: 'Upcoming' },
]

function TaskCard({ task }: { task: Task }) {
  const setTaskStatus = useGarden((s) => s.setTaskStatus)
  const rows = usePlantRows()
  const plant = task.instanceId ? rows.find((r) => r.instance.id === task.instanceId)?.plant : undefined
  const t = today()
  const urgency = taskUrgency(task, t)
  const effectiveDue = task.status === 'snoozed' && task.snoozedTo ? task.snoozedTo : task.dueOn

  return (
    <Card className="flex flex-wrap items-center gap-3 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold">{task.title}</p>
          {task.recurrence && <Chip color="green">↻ {recurrenceLabel(task.recurrence)}</Chip>}
          {task.status === 'snoozed' && <Chip color="blue">Snoozed → {formatDate(effectiveDue)}</Chip>}
        </div>
        <p className="mt-0.5 text-xs text-ink-soft">
          {KIND_LABEL[task.kind]}
          {plant && (
            <>
              {' · '}
              <Link to={`/plants/${task.instanceId}`} className="text-garden hover:underline">
                {plant.displayName}
              </Link>
            </>
          )}
          {' · due '}
          {formatDate(task.dueOn)}
          {task.origin === 'generated' && ' · auto'}
        </p>
        {task.notes && <p className="mt-1 text-xs text-ink-soft italic">{task.notes}</p>}
      </div>
      <Chip color={urgency === 'overdue' ? 'red' : urgency === 'soon' ? 'amber' : 'default'}>
        {urgency === 'overdue'
          ? `${-daysBetween(t, effectiveDue)}d overdue`
          : daysBetween(t, effectiveDue) === 0
            ? 'Today'
            : `in ${daysBetween(t, effectiveDue)}d`}
      </Chip>
      <div className="flex gap-1">
        <Button
          variant="secondary"
          className="!min-h-10 !px-2.5"
          title={task.recurrence ? 'Mark complete (schedules the next occurrence)' : 'Mark complete'}
          onClick={() => setTaskStatus(task.id, 'done')}
        >
          {icons.check('h-4 w-4')}
        </Button>
        <Button
          variant="ghost"
          className="!min-h-10 !px-2.5"
          title="Snooze one week"
          onClick={() => setTaskStatus(task.id, 'snoozed', addDays(today(), 7))}
        >
          {icons.clock('h-4 w-4')}
        </Button>
        <Button
          variant="ghost"
          className="!min-h-10 !px-2.5"
          title={task.recurrence ? 'Dismiss (ends the repeat)' : 'Dismiss'}
          onClick={() => setTaskStatus(task.id, 'dismissed')}
        >
          {icons.x('h-4 w-4')}
        </Button>
      </div>
    </Card>
  )
}

function AddTaskForm({ onClose }: { onClose: () => void }) {
  const addCustomTask = useGarden((s) => s.addCustomTask)
  const rows = usePlantRows()
  const [title, setTitle] = useState('')
  const [dueOn, setDueOn] = useState(today())
  const [instanceId, setInstanceId] = useState('')
  const [notes, setNotes] = useState('')
  const [repeat, setRepeat] = useState<'none' | 'yearly' | 'weeks'>('none')
  const [weeks, setWeeks] = useState('4')

  return (
    <Card className="mb-5 p-4">
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!title.trim()) return
          const recurrence: TaskRecurrence | undefined =
            repeat === 'yearly'
              ? { type: 'yearly' }
              : repeat === 'weeks'
                ? { type: 'weeks', interval: Math.max(1, Number(weeks) || 4) }
                : undefined
          addCustomTask(title.trim(), dueOn, instanceId || undefined, notes.trim() || undefined, recurrence)
          onClose()
        }}
      >
        <Field label="Title">
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Build new raised bed" autoFocus />
        </Field>
        <Field label="Due date">
          <input type="date" className={inputClass} value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
        </Field>
        <Field label="Linked plant (optional)">
          <select className={inputClass} value={instanceId} onChange={(e) => setInstanceId(e.target.value)}>
            <option value="">— none —</option>
            {rows
              .filter((r) => r.instance.status === 'active')
              .map((r) => (
                <option key={r.instance.id} value={r.instance.id}>
                  {r.plant.displayName}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Notes (optional)">
          <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Repeats">
            <select className={`${inputClass} !w-44`} value={repeat} onChange={(e) => setRepeat(e.target.value as typeof repeat)}>
              <option value="none">Doesn't repeat</option>
              <option value="yearly">Every year</option>
              <option value="weeks">Every N weeks</option>
            </select>
          </Field>
          {repeat === 'weeks' && (
            <Field label="Weeks">
              <input type="number" min={1} className={`${inputClass} !w-20`} value={weeks} onChange={(e) => setWeeks(e.target.value)} />
            </Field>
          )}
        </div>
        {repeat !== 'none' && (
          <p className="text-xs text-ink-soft sm:col-span-2">
            Completing a repeating task schedules the next one automatically; dismissing it ends the series.
          </p>
        )}
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit">Add task</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Card>
  )
}

export default function Tasks() {
  const tasks = useGarden((s) => s.tasks)
  const garden = useGarden((s) => s.garden)
  const rows = usePlantRows()
  const [adding, setAdding] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const t = today()

  const grouped = useMemo(() => {
    const open = tasks
      .filter((task) => task.status === 'open' || task.status === 'snoozed')
      .sort((a, b) => (a.snoozedTo ?? a.dueOn).localeCompare(b.snoozedTo ?? b.dueOn))
    return {
      overdue: open.filter((task) => taskUrgency(task, t) === 'overdue'),
      soon: open.filter((task) => taskUrgency(task, t) === 'soon'),
      upcoming: open.filter((task) => taskUrgency(task, t) === 'upcoming'),
    }
  }, [tasks, t])

  const done = tasks.filter((task) => task.status === 'done')

  // Frost banner (US-303): date-based warning from the garden profile
  const frostDate = dateFromDoy(parseIso(t).getFullYear(), garden.firstFrostDoy)
  const daysToFrost = daysBetween(t, frostDate)
  const tender = rows.filter((r) => r.instance.status === 'active' && r.plant.frostTender)
  const showFrost = daysToFrost >= 0 && daysToFrost <= 7 && tender.length > 0

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle="Auto-generated from your plants' effective care data, plus your own to-dos"
        action={<Button onClick={() => setAdding(true)}>{icons.plus('h-4 w-4')} Add Task</Button>}
      />

      {showFrost && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-[#3d5a80]/30 bg-[#dde6f0] px-4 py-3 text-sm text-[#3d5a80]">
          {icons.snowflake('mt-0.5 h-5 w-5 shrink-0')}
          <div>
            <p className="font-semibold">Frost likely within {daysToFrost} day{daysToFrost === 1 ? '' : 's'} — {tender.length} plant{tender.length === 1 ? '' : 's'} may need protection</p>
            <p className="mt-0.5 text-xs">
              {tender.map((r) => r.plant.displayName).join(', ')}. Cover, bring inside, or mulch heavily.
            </p>
          </div>
        </div>
      )}

      {adding && <AddTaskForm onClose={() => setAdding(false)} />}

      {GROUPS.map(({ key, label }) => (
        <section key={key} className="mb-6">
          <h2 className="mb-2 flex items-center gap-2 font-display text-2xl font-semibold text-garden">
            {label}
            <span className={`rounded-full px-2 py-0.5 text-xs font-sans font-semibold ${key === 'overdue' && grouped[key].length ? 'bg-[#f0d9d4] text-red-urgent' : 'bg-parchment-dark text-ink-soft'}`}>
              {grouped[key].length}
            </span>
          </h2>
          {grouped[key].length === 0 ? (
            <p className="text-sm text-ink-soft">Nothing here.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {grouped[key].map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </section>
      ))}

      <section>
        <button className="mb-2 flex items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink" onClick={() => setShowDone((v) => !v)}>
          {icons.chevronRight(`h-4 w-4 transition-transform ${showDone ? 'rotate-90' : ''}`)}
          Completed ({done.length})
        </button>
        {showDone &&
          (done.length === 0 ? (
            <EmptyState>No completed tasks yet.</EmptyState>
          ) : (
            <ul className="flex flex-col gap-1">
              {done.map((task) => (
                <li key={task.id} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-soft line-through">
                  {icons.check('h-4 w-4 text-garden')}
                  {task.title}
                </li>
              ))}
            </ul>
          ))}
      </section>
    </div>
  )
}
