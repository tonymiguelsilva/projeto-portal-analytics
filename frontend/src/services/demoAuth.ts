import { ApiError, apiRequest } from './api'
import {
  clearDemoSessionId,
  DEMO_SESSION_HEADER,
  getDemoSessionId,
  storeDemoSessionId,
} from './demoSessionStorage'
import { DEMO_PROFILE_IDS } from '../types/demoAuth'
import type {
  DemoProfile,
  DemoProfileId,
  DemoRole,
  DemoSessionResponse,
} from '../types/demoAuth'

const PROFILES_ENDPOINT = '/api/v1/demo-auth/profiles'
const SESSION_ENDPOINT = '/api/v1/demo-auth/session'

export class InvalidDemoAuthResponseError extends Error {
  constructor(endpoint: string) {
    super(`A API retornou dados de sessão inválidos em ${endpoint}.`)
    this.name = 'InvalidDemoAuthResponseError'
  }
}

export class DemoSessionMissingError extends Error {
  constructor() {
    super('Nenhuma sessão Demo está armazenada neste navegador.')
    this.name = 'DemoSessionMissingError'
  }
}

export { DemoSessionStorageError } from './demoSessionStorage'

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown, endpoint: string): JsonRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new InvalidDemoAuthResponseError(endpoint)
  }
  return value as JsonRecord
}

function asString(value: unknown, endpoint: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new InvalidDemoAuthResponseError(endpoint)
  }
  return value
}

function parseProfile(value: unknown, endpoint: string): DemoProfile {
  const profile = asRecord(value, endpoint)
  const profileId = asString(profile.profile_id, endpoint)
  const role = asString(profile.role, endpoint)
  if (!DEMO_PROFILE_IDS.includes(profileId as DemoProfileId)) {
    throw new InvalidDemoAuthResponseError(endpoint)
  }
  if (!['analyst', 'manager', 'director'].includes(role)) {
    throw new InvalidDemoAuthResponseError(endpoint)
  }

  return {
    profile_id: profileId as DemoProfileId,
    label: asString(profile.label, endpoint),
    role: role as DemoRole,
    region_label: asString(profile.region_label, endpoint),
  }
}

function parseSession(value: unknown): DemoSessionResponse {
  const response = asRecord(value, SESSION_ENDPOINT)
  const expiresIn = response.expires_in_seconds
  if (typeof expiresIn !== 'number' || !Number.isInteger(expiresIn) || expiresIn <= 0) {
    throw new InvalidDemoAuthResponseError(SESSION_ENDPOINT)
  }

  return {
    session_id: asString(response.session_id, SESSION_ENDPOINT),
    expires_in_seconds: expiresIn,
    profile: parseProfile(response.profile, SESSION_ENDPOINT),
  }
}

function withSessionHeader(sessionId: string): Headers {
  const headers = new Headers()
  headers.set(DEMO_SESSION_HEADER, sessionId)
  return headers
}

export async function listDemoProfiles(signal?: AbortSignal): Promise<DemoProfile[]> {
  const endpoint = PROFILES_ENDPOINT
  const response = await apiRequest<unknown>(endpoint, { signal })
  if (!Array.isArray(response)) throw new InvalidDemoAuthResponseError(endpoint)
  return response.map((profile) => parseProfile(profile, endpoint))
}

export async function startDemoSession(
  profileId: DemoProfileId,
): Promise<DemoSessionResponse> {
  const rawResponse = await apiRequest<unknown>(SESSION_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_id: profileId }),
  })
  const session = parseSession(rawResponse)

  storeDemoSessionId(session.session_id)

  return session
}

export async function getCurrentDemoSession(
  signal?: AbortSignal,
): Promise<DemoProfile> {
  const sessionId = getDemoSessionId()
  if (!sessionId) throw new DemoSessionMissingError()

  try {
    const response = await apiRequest<unknown>(SESSION_ENDPOINT, {
      headers: withSessionHeader(sessionId),
      signal,
    })
    return parseProfile(response, SESSION_ENDPOINT)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) clearDemoSessionId()
    throw error
  }
}

export async function endDemoSession(): Promise<void> {
  const sessionId = getDemoSessionId()
  if (!sessionId) return

  try {
    await apiRequest<void>(SESSION_ENDPOINT, {
      method: 'DELETE',
      headers: withSessionHeader(sessionId),
    })
  } finally {
    clearDemoSessionId()
  }
}