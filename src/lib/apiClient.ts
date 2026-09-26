// Client API.
//
// Deux modes :
//  • Mode LOCAL (par défaut, utilisé sur GitHub Pages) : VITE_API_URL n'est
//    pas défini → toutes les requêtes sont traitées dans le navigateur par
//    lib/localApi.ts et les données sont stockées dans le localStorage.
//  • Mode SERVEUR : VITE_API_URL = URL d'une API Express/MySQL déployée
//    (Railway, Render, VPS…) → requêtes HTTP classiques avec un token JWT.
import { localRequest, LocalApiError } from './localApi'

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim().replace(/\/$/, '') ?? ''
export const LOCAL_MODE = API_URL === ''

const TOKEN_KEY = 'gesfin_token'
const USER_KEY = 'gesfin_user'

export interface AuthUser {
  id: string
  role: string
  label: string
  username?: string
}

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

export function setSession(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/** Émis quand la session n'est plus valide, pour renvoyer vers l'écran de connexion. */
export const SESSION_EXPIRED_EVENT = 'cse:session-expired'

function onUnauthorized(path: string) {
  // Un 401 sur /login signifie « mauvais mot de passe », pas « session expirée ».
  if (path.startsWith('/api/auth/login') || path.startsWith('/api/auth/register')) return
  clearSession()
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
}

async function request<T>(method: string, path: string, data?: unknown): Promise<T> {
  const token = getToken()

  if (LOCAL_MODE) {
    try {
      return await localRequest<T>(method, path, data, token)
    } catch (e) {
      if (e instanceof LocalApiError) {
        if (e.status === 401) onUnauthorized(path)
        throw new ApiError(e.message, e.status)
      }
      console.error(e)
      throw new ApiError("Erreur interne de l'application.", 500)
    }
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: data !== undefined ? JSON.stringify(data) : undefined,
    })
  } catch {
    throw new ApiError(`Impossible de joindre le serveur (${API_URL}). Vérifiez qu'il est démarré.`, 0)
  }

  if (res.status === 401) onUnauthorized(path)

  let body: unknown = null
  const text = await res.text()
  if (text) {
    try { body = JSON.parse(text) } catch { body = text }
  }

  if (!res.ok) {
    const message = (body as { error?: string } | null)?.error || `Erreur ${res.status}`
    throw new ApiError(message, res.status)
  }
  return body as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, data?: unknown) => request<T>('POST', path, data),
  put: <T>(path: string, data?: unknown) => request<T>('PUT', path, data),
  delete: <T>(path: string, data?: unknown) => request<T>('DELETE', path, data),
}

export interface RegisterPayload {
  username: string
  nom_complet: string
  role: string
  password: string
}

export async function login(username: string, password: string) {
  return api.post<{ token: string; user: AuthUser }>('/api/auth/login', { username, password })
}

export async function register(payload: RegisterPayload) {
  return api.post<{ token: string; user: AuthUser }>('/api/auth/register', payload)
}

/** Vérifie que l'API répond. En mode local, toujours disponible. */
export async function checkHealth(): Promise<boolean> {
  if (LOCAL_MODE) return true
  try {
    const res = await fetch(`${API_URL}/api/health`, { signal: AbortSignal.timeout(5000) })
    return res.ok
  } catch {
    return false
  }
}
