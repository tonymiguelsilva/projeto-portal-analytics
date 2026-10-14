const SESSION_STORAGE_KEY = 'dataclyra.demo.session-id'
const SESSION_INVALIDATED_EVENT = 'dataclyra:demo-session-invalidated'

export const DEMO_SESSION_HEADER = 'X-Demo-Session'

export class DemoSessionStorageError extends Error {
  constructor() {
    super('Não foi possível acessar o armazenamento temporário da sessão.')
    this.name = 'DemoSessionStorageError'
  }
}

export function getDemoSessionId(): string | null {
  try {
    return globalThis.sessionStorage.getItem(SESSION_STORAGE_KEY)
  } catch {
    throw new DemoSessionStorageError()
  }
}

export function storeDemoSessionId(sessionId: string): void {
  try {
    globalThis.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId)
  } catch {
    throw new DemoSessionStorageError()
  }
}

export function clearDemoSessionId(): void {
  try {
    globalThis.sessionStorage.removeItem(SESSION_STORAGE_KEY)
  } catch {
    throw new DemoSessionStorageError()
  }
}

export function notifyDemoSessionInvalidated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SESSION_INVALIDATED_EVENT))
  }
}

export function onDemoSessionInvalidated(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined

  window.addEventListener(SESSION_INVALIDATED_EVENT, listener)
  return () => window.removeEventListener(SESSION_INVALIDATED_EVENT, listener)
}
