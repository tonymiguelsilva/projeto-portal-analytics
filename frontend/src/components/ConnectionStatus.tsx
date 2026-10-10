import { useEffect, useState } from 'react'
import { fetchHealth } from '../services/health'

type ConnectionState = 'checking' | 'online' | 'offline'

const STATUS_LABELS: Record<ConnectionState, string> = {
  checking: 'Verificando API',
  online: 'API conectada',
  offline: 'API indisponível',
}

function ConnectionStatus() {
  const [state, setState] = useState<ConnectionState>('checking')

  useEffect(() => {
    let active = true
    let timeoutId = 0
    const controller = new AbortController()

    const checkConnection = async () => {
      try {
        const health = await fetchHealth(controller.signal)
        if (active) setState(health.status === 'ok' ? 'online' : 'offline')
      } catch {
        if (active) setState('offline')
      } finally {
        if (active) {
          timeoutId = window.setTimeout(() => void checkConnection(), 30_000)
        }
      }
    }

    void checkConnection()
    return () => {
      active = false
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [])

  return (
    <div
      className={`connection-status connection-status--${state}`}
      role="status"
      aria-live="polite"
    >
      <span className="connection-dot" aria-hidden="true" />
      <span>{STATUS_LABELS[state]}</span>
    </div>
  )
}

export default ConnectionStatus