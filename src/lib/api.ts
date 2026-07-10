import type { GardenData, GardenMeta, User } from './types'

/**
 * Storage layer with two interchangeable drivers:
 * - server: the GardenOS backend (/api/...) — multi-user, cookie sessions
 * - local:  this browser's localStorage — used when no backend is reachable
 *   (e.g. the static demo build), same multi-garden shape, no accounts
 */
export type StorageMode = 'server' | 'local'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
    credentials: 'same-origin',
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, (body as { error?: string }).error ?? `Request failed (${res.status})`)
  return body as T
}

// ---------- server availability & auth ----------

export async function detectServer(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3000)
    const res = await fetch('/api/health', { signal: controller.signal })
    clearTimeout(timer)
    return res.ok
  } catch {
    return false
  }
}

export const authApi = {
  me: () => request<{ user: User }>('/api/auth/me'),
  login: (username: string, password: string) =>
    request<{ user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  register: (username: string, password: string) =>
    request<{ user: User }>('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request<{ ok: true }>('/api/auth/logout', { method: 'POST' }),
}

// ---------- garden storage drivers ----------

export interface StorageDriver {
  mode: StorageMode
  listGardens(): Promise<GardenMeta[]>
  getGarden(id: string): Promise<{ meta: GardenMeta; state: GardenData }>
  createGarden(name: string, state: GardenData): Promise<GardenMeta>
  saveGarden(id: string, state: GardenData, keepalive?: boolean): Promise<void>
  deleteGarden(id: string): Promise<void>
}

export const serverDriver: StorageDriver = {
  mode: 'server',
  async listGardens() {
    return (await request<{ gardens: GardenMeta[] }>('/api/gardens')).gardens
  },
  async getGarden(id) {
    const { garden } = await request<{ garden: GardenMeta & { state: GardenData } }>(`/api/gardens/${id}`)
    const { state, ...meta } = garden
    return { meta, state }
  },
  async createGarden(name, state) {
    return (
      await request<{ garden: GardenMeta }>('/api/gardens', {
        method: 'POST',
        body: JSON.stringify({ name, state }),
      })
    ).garden
  },
  async saveGarden(id, state, keepalive) {
    await request(`/api/gardens/${id}`, { method: 'PUT', body: JSON.stringify({ state }), keepalive })
  },
  async deleteGarden(id) {
    await request(`/api/gardens/${id}`, { method: 'DELETE' })
  },
}

const LOCAL_INDEX = 'gardenos-local-index'
const localKey = (id: string) => `gardenos-local-garden-${id}`

function readLocalIndex(): GardenMeta[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_INDEX) ?? '[]') as GardenMeta[]
  } catch {
    return []
  }
}

function writeLocalIndex(index: GardenMeta[]) {
  localStorage.setItem(LOCAL_INDEX, JSON.stringify(index))
}

export const localDriver: StorageDriver = {
  mode: 'local',
  async listGardens() {
    return readLocalIndex()
  },
  async getGarden(id) {
    const meta = readLocalIndex().find((g) => g.id === id)
    const raw = localStorage.getItem(localKey(id))
    if (!meta || !raw) throw new ApiError(404, 'Garden not found in this browser.')
    return { meta, state: JSON.parse(raw) as GardenData }
  },
  async createGarden(name, state) {
    const meta: GardenMeta = {
      id: `garden_local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      updatedAt: new Date().toISOString(),
    }
    localStorage.setItem(localKey(meta.id), JSON.stringify(state))
    writeLocalIndex([...readLocalIndex(), meta])
    return meta
  },
  async saveGarden(id, state) {
    localStorage.setItem(localKey(id), JSON.stringify(state))
    writeLocalIndex(readLocalIndex().map((g) => (g.id === id ? { ...g, updatedAt: new Date().toISOString() } : g)))
  },
  async deleteGarden(id) {
    localStorage.removeItem(localKey(id))
    writeLocalIndex(readLocalIndex().filter((g) => g.id !== id))
  },
}

// ---------- legacy single-user state (pre-multi-user versions) ----------

/** Read the old single-garden localStorage state so it can become the first garden. */
export function readLegacyState(): GardenData | null {
  try {
    if (localStorage.getItem('gardenos-v1-migrated')) return null
    const raw = localStorage.getItem('gardenos-v1')
    if (!raw) return null
    const state = (JSON.parse(raw) as { state?: Partial<GardenData> }).state
    if (!state?.garden || !Array.isArray(state.instances)) return null
    return state as GardenData
  } catch {
    return null
  }
}

export function markLegacyMigrated() {
  localStorage.setItem('gardenos-v1-migrated', '1')
}
