import { useState } from 'react'
import { useAuth } from '../store'
import { Button, Card, Field, icons, inputClass } from '../components/ui'

function Wordmark() {
  return (
    <div className="flex items-center justify-center gap-2.5">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-garden">
        {icons.leaf('h-6 w-6 text-parchment')}
      </span>
      <span className="font-display text-4xl font-semibold tracking-wide text-garden">GardenOS</span>
    </div>
  )
}

/** Login / register — shown in server mode when not signed in. */
export function AuthScreen() {
  const { login, register, authError, busy } = useAuth()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  return (
    <div className="flex min-h-dvh items-center justify-center bg-parchment px-4">
      <div className="w-full max-w-sm">
        <Wordmark />
        <p className="mt-2 mb-6 text-center text-sm text-ink-soft">Your garden, mapped and remembered.</p>
        <Card className="p-5">
          <div className="mb-4 flex gap-1 rounded-lg border border-line bg-parchment p-1">
            {(['login', 'register'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`min-h-9 flex-1 cursor-pointer rounded-md text-sm font-medium capitalize ${
                  tab === t ? 'bg-garden text-cream' : 'text-ink-soft hover:text-ink'
                }`}
              >
                {t === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (!username.trim() || !password) return
              void (tab === 'login' ? login(username.trim(), password) : register(username.trim(), password))
            }}
          >
            <Field label="Username">
              <input
                className={inputClass}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              />
            </Field>
            {tab === 'register' && <p className="text-xs text-ink-soft">At least 8 characters.</p>}
            {authError && <p className="text-sm text-red-urgent">{authError}</p>}
            <Button type="submit" disabled={busy || !username.trim() || password.length < (tab === 'register' ? 8 : 1)}>
              {busy ? 'One moment…' : tab === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}

/** Garden picker / first-garden creation — shown when signed in but no garden is open. */
export function GardenGate() {
  const { gardens, selectGarden, createGarden, authError, busy, user, mode, logout } = useAuth()
  const [name, setName] = useState('My Garden')
  const [sample, setSample] = useState(gardens.length === 0)
  const [creating, setCreating] = useState(false)

  // With no gardens yet, jump straight into the create form
  const showCreate = creating || gardens.length === 0

  return (
    <div className="flex min-h-dvh items-center justify-center bg-parchment px-4 py-8">
      <div className="w-full max-w-md">
        <Wordmark />
        {user && <p className="mt-2 text-center text-sm text-ink-soft">Signed in as {user.username}</p>}
        {mode === 'local' && (
          <p className="mt-2 text-center text-xs text-ink-soft">
            Demo mode — no server found, so everything is stored in this browser only.
          </p>
        )}

        {gardens.length > 0 && (
          <Card className="mt-6 p-5">
            <h2 className="mb-3 font-display text-2xl font-semibold text-garden">Your gardens</h2>
            <div className="flex flex-col gap-2">
              {gardens.map((g) => (
                <button
                  key={g.id}
                  disabled={busy}
                  onClick={() => void selectGarden(g.id)}
                  className="flex min-h-12 cursor-pointer items-center justify-between rounded-lg border border-line bg-parchment px-4 text-left hover:border-garden/50 disabled:opacity-50"
                >
                  <span className="font-medium">{g.name}</span>
                  {icons.chevronRight('h-4 w-4 text-ink-soft')}
                </button>
              ))}
            </div>
          </Card>
        )}

        <Card className="mt-4 p-5">
          {showCreate ? (
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault()
                if (!name.trim()) return
                void createGarden(name.trim(), sample)
              }}
            >
              <h2 className="font-display text-2xl font-semibold text-garden">
                {gardens.length === 0 ? 'Create your first garden' : 'New garden'}
              </h2>
              <Field label="Garden name">
                <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              </Field>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sample}
                  onChange={(e) => setSample(e.target.checked)}
                  className="accent-garden"
                />
                Start with sample plants and beds (good for exploring)
              </label>
              {authError && <p className="text-sm text-red-urgent">{authError}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={busy || !name.trim()}>
                  {busy ? 'Creating…' : 'Create garden'}
                </Button>
                {gardens.length > 0 && (
                  <Button variant="ghost" onClick={() => setCreating(false)}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          ) : (
            <Button variant="secondary" className="w-full" onClick={() => setCreating(true)}>
              {icons.plus('h-4 w-4')} New garden
            </Button>
          )}
        </Card>

        {mode === 'server' && (
          <button
            className="mx-auto mt-4 block cursor-pointer text-xs text-ink-soft underline hover:text-ink"
            onClick={() => void logout()}
          >
            Sign out
          </button>
        )}
      </div>
    </div>
  )
}
