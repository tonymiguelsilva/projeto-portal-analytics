import {
  clearDemoSessionId,
  DEMO_SESSION_HEADER,
  getDemoSessionId,
  notifyDemoSessionInvalidated,
} from './demoSessionStorage'


const API_BASE_URL = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_BASE_URL?.trim() || '').replace(/\/+$/, '')

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown
  readonly sessionCleanupError: unknown

  constructor(
    message: string,
    status: number,
    body: unknown,
    sessionCleanupError?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
    this.sessionCleanupError = sessionCleanupError
  }
}

function isProtectedAnalyticsPath(path: string): boolean {
  const pathname = path.split(/[?#]/, 1)[0].replace(/^\/+/, '')
  return pathname.startsWith('api/v1/analytics/')
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
  const protectedAnalyticsRequest = isProtectedAnalyticsPath(path)
  const sessionId = protectedAnalyticsRequest ? getDemoSessionId() : null
  if (sessionId) headers.set(DEMO_SESSION_HEADER, sessionId)

  const response = await fetch(
    `${API_BASE_URL}/${path.replace(/^\/+/, '')}`,
    { ...init, headers },
  )

  if (response.status === 204) return undefined as T

  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    let sessionCleanupError: unknown
    if (response.status === 401 && protectedAnalyticsRequest) {
      if (sessionId) {
        try {
          clearDemoSessionId()
        } catch (error) {
          sessionCleanupError = error
        }
      }
      notifyDemoSessionInvalidated()
    }
    const errorBody = body as { detail?: string | { message?: string } } | null
    const detail = errorBody?.detail
    const message =
      typeof detail === 'string'
        ? detail
        : detail?.message ?? `A API respondeu com HTTP ${response.status}.`
    throw new ApiError(message, response.status, body, sessionCleanupError)
  }

  return body as T
}