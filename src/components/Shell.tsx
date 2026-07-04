import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { icons } from './ui'

const NAV = [
  { to: '/', label: 'Dashboard', icon: icons.home },
  { to: '/map', label: 'Garden Map', icon: icons.map },
  { to: '/plants', label: 'Plants', icon: icons.leaf },
  { to: '/tasks', label: 'Tasks', icon: icons.tasks },
  { to: '/calendar', label: 'Calendar', icon: icons.calendar },
  { to: '/inventory', label: 'Inventory', icon: icons.box },
  { to: '/settings', label: 'Settings', icon: icons.settings },
]

const MOBILE_TABS = NAV.slice(0, 4)
const MORE_ITEMS = NAV.slice(4)

function Wordmark() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-garden">
        {icons.leaf('h-5 w-5 text-parchment')}
      </span>
      <span className="font-display text-2xl font-semibold tracking-wide text-garden">GardenOS</span>
    </div>
  )
}

export default function Shell() {
  const [moreOpen, setMoreOpen] = useState(false)
  const location = useLocation()
  const moreActive = MORE_ITEMS.some((item) => location.pathname.startsWith(item.to))

  return (
    <div className="min-h-dvh bg-parchment">
      {/* Desktop sidebar (≥1024px) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-cream px-4 py-6 lg:flex">
        <Wordmark />
        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                  isActive ? 'bg-garden text-cream' : 'text-ink-soft hover:bg-parchment-dark hover:text-ink'
                }`
              }
            >
              {icon('h-5 w-5')}
              {label}
            </NavLink>
          ))}
        </nav>
        <p className="mt-auto px-3 text-xs text-ink-soft/70">
          Maple Street Garden · Zone 7a
        </p>
      </aside>

      {/* Content */}
      <main className="px-4 pt-5 pb-24 lg:ml-60 lg:px-10 lg:pt-8 lg:pb-10">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom tab bar (<1024px) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-cream/95 backdrop-blur lg:hidden">
        <div className="flex items-stretch pb-[env(safe-area-inset-bottom)]">
          {MOBILE_TABS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMoreOpen(false)}
              className={({ isActive }) =>
                `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                  isActive && !moreOpen ? 'text-garden' : 'text-ink-soft'
                }`
              }
            >
              {icon('h-5 w-5')}
              {label.replace('Garden ', '')}
            </NavLink>
          ))}
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
              moreOpen || moreActive ? 'text-garden' : 'text-ink-soft'
            }`}
          >
            {icons.more('h-5 w-5')}
            More
          </button>
        </div>
      </nav>

      {/* Mobile "More" sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-ink/30" />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-line bg-cream p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
            {MORE_ITEMS.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  `flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium ${
                    isActive ? 'bg-garden text-cream' : 'text-ink hover:bg-parchment-dark'
                  }`
                }
              >
                {icon('h-5 w-5')}
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
