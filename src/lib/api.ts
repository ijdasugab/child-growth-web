/**
 * Klien HTTP untuk API Nata Baby.
 *
 * Tanggung jawab:
 *  - menyisipkan access token ke setiap request
 *  - memperbarui access token otomatis saat 401, sekali per request
 *  - menyimpan refresh token baru hasil rotasi di server
 *  - membersihkan sesi kalau refresh juga gagal
 *
 * P2-1: sebelumnya refresh token disimpan tapi tidak pernah dipakai, jadi sesi
 * mati total setiap 15 menit.
 */

const TOKEN_KEY = 'nata_baby_admin_token'
const REFRESH_TOKEN_KEY = 'nata_baby_admin_refresh_token'
const USER_KEY = 'nata_baby_admin_user'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

export type StoredAuth = {
  token: string | null
  refreshToken: string | null
  user: unknown | null
}

export function getStoredAuth(): StoredAuth {
  try {
    const token = localStorage.getItem(TOKEN_KEY)
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    const userStr = localStorage.getItem(USER_KEY)
    return {
      token,
      refreshToken,
      user: userStr ? JSON.parse(userStr) : null,
    }
  } catch {
    return { token: null, refreshToken: null, user: null }
  }
}

export function saveStoredAuth(token: string, refreshToken: string | null, user: unknown) {
  localStorage.setItem(TOKEN_KEY, token)
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  }
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

/** Dipakai saat 401 tidak bisa dipulihkan. */
function redirectToLogin() {
  clearStoredAuth()
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login'
  }
}

type RefreshResponse = {
  accessToken: string
  refreshToken?: string
}

// Satu promise refresh dipakai bersama, supaya lima request yang kena 401
// bersamaan tidak memicu lima kali refresh.
let refreshInFlight: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    const { refreshToken } = getStoredAuth()
    if (!refreshToken) return null

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (!response.ok) return null

      const data = (await response.json()) as RefreshResponse
      if (!data.accessToken) return null

      // Server merotasi refresh token, jadi simpan yang baru.
      const { user } = getStoredAuth()
      saveStoredAuth(data.accessToken, data.refreshToken ?? refreshToken, user)
      return data.accessToken
    } catch {
      return null
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const send = async (token: string | null) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers as Record<string, string>),
    }
    return fetch(`${apiBaseUrl}${path}`, { ...options, headers })
  }

  const { token } = getStoredAuth()
  let response = await send(token)

  // P2-1: coba perbarui token sekali, lalu ulangi request yang sama.
  const isAuthPath = path.startsWith('/api/auth/')
  if (response.status === 401 && !isAuthPath) {
    const fresh = await refreshAccessToken()
    if (fresh) {
      response = await send(fresh)
    }
    if (response.status === 401) {
      redirectToLogin()
    }
  }

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as {
      message?: string
    } | null
    throw new Error(errorBody?.message || `Request gagal (${response.status})`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}
