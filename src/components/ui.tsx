import type { ReactNode } from 'react'

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-4xl font-semibold text-garden">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-line bg-cream shadow-[0_1px_2px_rgba(43,43,35,0.06)] ${className}`}>
      {children}
    </div>
  )
}

export function Chip({
  children,
  color = 'default',
  className = '',
}: {
  children: ReactNode
  color?: 'default' | 'green' | 'amber' | 'red' | 'blue'
  className?: string
}) {
  const colors = {
    default: 'bg-parchment-dark text-ink-soft',
    green: 'bg-garden-pale text-garden',
    amber: 'bg-[#f3e3c3] text-[#8a5f10]',
    red: 'bg-[#f0d9d4] text-red-urgent',
    blue: 'bg-[#dde6f0] text-[#3d5a80]',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[color]} ${className}`}>
      {children}
    </span>
  )
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  className = '',
  type = 'button',
  disabled,
  title,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  className?: string
  type?: 'button' | 'submit'
  disabled?: boolean
  title?: string
}) {
  const variants = {
    primary: 'bg-garden text-cream hover:bg-garden-light',
    secondary: 'border border-garden/30 bg-cream text-garden hover:bg-garden-pale',
    ghost: 'text-ink-soft hover:bg-parchment-dark hover:text-ink',
    danger: 'border border-red-urgent/30 bg-cream text-red-urgent hover:bg-[#f0d9d4]',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function ColorSwatchStrip({ colors }: { colors: Record<string, string> }) {
  return (
    <span className="inline-flex overflow-hidden rounded-full border border-line" title="Seasonal colors: spring · summer · fall · winter">
      {(['spring', 'summer', 'fall', 'winter'] as const).map((s) => (
        <span key={s} className="h-3 w-4" style={{ backgroundColor: colors[s] }} />
      ))}
    </span>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-parchment-dark/40 px-6 py-10 text-center text-sm text-ink-soft">
      {children}
    </div>
  )
}

export const inputClass =
  'w-full min-h-11 rounded-lg border border-line bg-cream px-3 text-sm text-ink placeholder:text-ink-soft/60 focus:border-garden focus:outline-none'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold tracking-wide text-ink-soft uppercase">{label}</span>
      {children}
    </label>
  )
}

// ---------- icons (24px stroke set) ----------

function Icon({ children, className = 'h-5 w-5' }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {children}
    </svg>
  )
}

export const icons = {
  home: (c?: string) => (
    <Icon className={c}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></Icon>
  ),
  map: (c?: string) => (
    <Icon className={c}><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14M15 6v14" /></Icon>
  ),
  leaf: (c?: string) => (
    <Icon className={c}><path d="M4 20C4 11 10 5 20 4c-1 10-5 15-14 16Z" /><path d="M4 20c3-6 7-10 12-12" /></Icon>
  ),
  tasks: (c?: string) => (
    <Icon className={c}><path d="m4 12 3 3 5-6" /><path d="M14 7h6M14 12h6M14 17h6" /></Icon>
  ),
  calendar: (c?: string) => (
    <Icon className={c}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></Icon>
  ),
  box: (c?: string) => (
    <Icon className={c}><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="M4 7.5 12 12l8-4.5M12 12v9" /></Icon>
  ),
  settings: (c?: string) => (
    <Icon className={c}><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.5a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.5h4l.4-2.5a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.06-.4.1-.8.1-1.2Z" /></Icon>
  ),
  plus: (c?: string) => <Icon className={c}><path d="M12 5v14M5 12h14" /></Icon>,
  check: (c?: string) => <Icon className={c}><path d="m5 13 4 4L19 7" /></Icon>,
  clock: (c?: string) => <Icon className={c}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>,
  x: (c?: string) => <Icon className={c}><path d="M6 6l12 12M18 6 6 18" /></Icon>,
  alert: (c?: string) => (
    <Icon className={c}><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 10v4M12 17.5v.5" /></Icon>
  ),
  edit: (c?: string) => (
    <Icon className={c}><path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="m13.5 6.5 3 3" /></Icon>
  ),
  chevronRight: (c?: string) => <Icon className={c}><path d="m9 5 7 7-7 7" /></Icon>,
  back: (c?: string) => <Icon className={c}><path d="m15 5-7 7 7 7" /></Icon>,
  more: (c?: string) => (
    <Icon className={c}><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" /></Icon>
  ),
  snowflake: (c?: string) => (
    <Icon className={c}><path d="M12 2v20M4 6l16 12M20 6 4 18" /></Icon>
  ),
  layers: (c?: string) => (
    <Icon className={c}><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></Icon>
  ),
}
