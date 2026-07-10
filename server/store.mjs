/**
 * File-backed storage for GardenOS: users, sessions, and gardens as JSON files
 * under DATA_DIR (default ./data). Right-sized for household scale — everything
 * is held in memory and flushed with atomic writes (tmp + rename).
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data')
const GARDENS_DIR = path.join(DATA_DIR, 'gardens')

fs.mkdirSync(GARDENS_DIR, { recursive: true })

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

function writeJson(file, value) {
  const tmp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(value))
  fs.renameSync(tmp, file)
}

export function uid(prefix) {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`
}

// ---------- users ----------

const USERS_FILE = path.join(DATA_DIR, 'users.json')
let users = readJson(USERS_FILE, [])

function saveUsers() {
  writeJson(USERS_FILE, users)
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':')
  if (!salt || !hash) return false
  const candidate = crypto.scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected)
}

export function findUser(username) {
  const u = String(username).toLowerCase()
  return users.find((x) => x.username === u)
}

export function createUser(username, password) {
  const user = {
    id: uid('user'),
    username: String(username).toLowerCase(),
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  }
  users.push(user)
  saveUsers()
  return user
}

export function getUser(id) {
  return users.find((x) => x.id === id)
}

// ---------- sessions ----------

const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json')
const SESSION_TTL_MS = 30 * 24 * 3600 * 1000
let sessions = readJson(SESSIONS_FILE, {})

function saveSessions() {
  writeJson(SESSIONS_FILE, sessions)
}

export function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex')
  sessions[token] = { userId, createdAt: Date.now() }
  saveSessions()
  return token
}

export function getSession(token) {
  const s = token && sessions[token]
  if (!s) return null
  if (Date.now() - s.createdAt > SESSION_TTL_MS) {
    delete sessions[token]
    saveSessions()
    return null
  }
  return s
}

export function deleteSession(token) {
  if (token && sessions[token]) {
    delete sessions[token]
    saveSessions()
  }
}

// ---------- gardens ----------

function gardenFile(id) {
  // ids are server-generated (uid), but never trust them as path segments
  if (!/^garden_[0-9a-f]+$/.test(id)) return null
  return path.join(GARDENS_DIR, `${id}.json`)
}

export function listGardens(ownerId) {
  const out = []
  for (const f of fs.readdirSync(GARDENS_DIR)) {
    if (!f.endsWith('.json')) continue
    const g = readJson(path.join(GARDENS_DIR, f), null)
    if (g && g.ownerId === ownerId) {
      out.push({ id: g.id, name: g.name, updatedAt: g.updatedAt })
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

export function getGarden(id, ownerId) {
  const file = gardenFile(id)
  if (!file) return null
  const g = readJson(file, null)
  return g && g.ownerId === ownerId ? g : null
}

export function createGarden(ownerId, name, state) {
  const garden = {
    id: uid('garden'),
    ownerId,
    name: String(name).slice(0, 100),
    state,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  writeJson(gardenFile(garden.id), garden)
  return garden
}

export function saveGarden(id, ownerId, { state, name }) {
  const garden = getGarden(id, ownerId)
  if (!garden) return null
  if (state !== undefined) garden.state = state
  if (name !== undefined) garden.name = String(name).slice(0, 100)
  garden.updatedAt = new Date().toISOString()
  writeJson(gardenFile(id), garden)
  return garden
}

export function deleteGarden(id, ownerId) {
  const garden = getGarden(id, ownerId)
  if (!garden) return false
  fs.rmSync(gardenFile(id))
  return true
}
