const DEFAULT_API_BASE_URL = 'http://localhost:8000'

export const API_BASE_URL = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL).replace(/\/+$/, '')

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(
    message: string,
    status: number,
    body: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')

  const response = await fetch(
    `${API_BASE_URL}/${path.replace(/^\/+/, '')}`,
    { ...init, headers },
  )

  if (response.status === 204) return undefined as T

  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const errorBody = body as { detail?: string | { message?: string } } | null
    const detail = errorBody?.detail
    const message =
      typeof detail === 'string'
        ? detail
        : detail?.message ?? `A API respondeu com HTTP ${response.status}.`
    throw new ApiError(message, response.status, body)
  }

  return body as T
}