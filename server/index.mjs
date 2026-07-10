/**
 * GardenOS backend: serves the built SPA, plus a small JSON API for
 * multi-user accounts, per-user gardens (opaque state blobs, last-write-wins),
 * and a server-side proxy for AI plant lookups (key from ANTHROPIC_API_KEY).
 */
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildLookupBody } from '../src/lib/aiRequest.mjs'
import * as db from './store.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, '..', 'dist')
const PORT = Number(process.env.PORT || 8787)
const REGISTRATION_OPEN = process.env.REGISTRATION_OPEN !== 'false'
const AI_DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT || 100)

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '20mb' }))

// ---------- session helpers ----------

const COOKIE = 'gos_session'

function getToken(req) {
  const header = req.headers.cookie || ''
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === COOKIE) return v.join('=')
  }
  return null
}

function setSessionCookie(req, res, token) {
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 3600}${secure}`,
  )
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
}

function requireAuth(req, res, next) {
  const session = db.getSession(getToken(req))
  const user = session && db.getUser(session.userId)
  if (!user) return res.status(401).json({ error: 'Not signed in.' })
  req.user = user
  next()
}

const publicUser = (u) => ({ id: u.id, username: u.username })

// ---------- auth ----------

const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/i

app.post('/api/auth/register', (req, res) => {
  if (!REGISTRATION_OPEN) return res.status(403).json({ error: 'Registration is closed on this server.' })
  const { username, password } = req.body || {}
  if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'Username must be 3-32 letters, numbers, dots, dashes, or underscores.' })
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' })
  }
  if (db.findUser(username)) return res.status(409).json({ error: 'That username is taken.' })
  const user = db.createUser(username, password)
  setSessionCookie(req, res, db.createSession(user.id))
  res.json({ user: publicUser(user) })
})

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {}
  const user = typeof username === 'string' ? db.findUser(username) : null
  if (!user || typeof password !== 'string' || !db.verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Wrong username or password.' })
  }
  setSessionCookie(req, res, db.createSession(user.id))
  res.json({ user: publicUser(user) })
})

app.post('/api/auth/logout', (req, res) => {
  db.deleteSession(getToken(req))
  clearSessionCookie(res)
  res.json({ ok: true })
})

app.get('/api/auth/me', (req, res) => {
  const session = db.getSession(getToken(req))
  const user = session && db.getUser(session.userId)
  if (!user) return res.status(401).json({ error: 'Not signed in.' })
  res.json({ user: publicUser(user) })
})

// ---------- gardens ----------

app.get('/api/gardens', requireAuth, (req, res) => {
  res.json({ gardens: db.listGardens(req.user.id) })
})

app.post('/api/gardens', requireAuth, (req, res) => {
  const { name, state } = req.body || {}
  if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: 'Garden name is required.' })
  if (typeof state !== 'object' || state === null) return res.status(400).json({ error: 'Initial state is required.' })
  const garden = db.createGarden(req.user.id, name.trim(), state)
  res.json({ garden: { id: garden.id, name: garden.name, updatedAt: garden.updatedAt } })
})

app.get('/api/gardens/:id', requireAuth, (req, res) => {
  const garden = db.getGarden(req.params.id, req.user.id)
  if (!garden) return res.status(404).json({ error: 'Garden not found.' })
  res.json({ garden: { id: garden.id, name: garden.name, updatedAt: garden.updatedAt, state: garden.state } })
})

app.put('/api/gardens/:id', requireAuth, (req, res) => {
  const { state, name } = req.body || {}
  if (state !== undefined && (typeof state !== 'object' || state === null)) {
    return res.status(400).json({ error: 'Invalid state.' })
  }
  const garden = db.saveGarden(req.params.id, req.user.id, { state, name })
  if (!garden) return res.status(404).json({ error: 'Garden not found.' })
  res.json({ garden: { id: garden.id, name: garden.name, updatedAt: garden.updatedAt } })
})

app.delete('/api/gardens/:id', requireAuth, (req, res) => {
  if (!db.deleteGarden(req.params.id, req.user.id)) return res.status(404).json({ error: 'Garden not found.' })
  res.json({ ok: true })
})

// ---------- AI lookup proxy ----------

const aiUsage = new Map() // userId -> {day, count}

app.post('/api/ai/lookup', requireAuth, async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(501).json({ error: 'no-server-key' })

  const day = new Date().toISOString().slice(0, 10)
  const usage = aiUsage.get(req.user.id)
  const count = usage?.day === day ? usage.count : 0
  if (count >= AI_DAILY_LIMIT) return res.status(429).json({ error: 'Daily AI lookup limit reached.' })
  aiUsage.set(req.user.id, { day, count: count + 1 })

  const { commonName, scientificName } = req.body || {}
  if (typeof commonName !== 'string' || commonName.trim().length < 2) {
    return res.status(400).json({ error: 'A plant name is required.' })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 45_000)
  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(buildLookupBody(commonName, typeof scientificName === 'string' ? scientificName : '')),
    })
    const body = await upstream.json()
    if (!upstream.ok) {
      const message = body?.error?.message || `Anthropic API error (${upstream.status})`
      return res.status(502).json({ error: message })
    }
    res.json({ message: body })
  } catch (err) {
    const timedOut = err?.name === 'AbortError'
    res.status(502).json({ error: timedOut ? 'AI lookup timed out.' : 'Could not reach the Anthropic API.' })
  } finally {
    clearTimeout(timer)
  }
})

// ---------- health & static ----------

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use((req, res, next) => (req.path.startsWith('/api/') ? res.status(404).json({ error: 'Not found.' }) : next()))
app.use(express.static(DIST))
app.get('*path', (_req, res) => res.sendFile(path.join(DIST, 'index.html')))

app.listen(PORT, () => {
  console.log(`GardenOS server listening on :${PORT} (registration ${REGISTRATION_OPEN ? 'open' : 'closed'}, AI ${process.env.ANTHROPIC_API_KEY ? 'enabled' : 'disabled'})`)
})
