import { AlertTriangle, LoaderCircle, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'

interface QueryStateProps {
  loading: boolean
  error: string | null
  empty: boolean
  emptyMessage?: string
  onRetry: () => void
  children: ReactNode
}

function QueryState({
  loading,
  error,
  empty,
  emptyMessage = 'Não há dados para os filtros selecionados.',
  onRetry,
  children,
}: QueryStateProps) {
  if (loading) {
    return (
      <div className="query-state" role="status" aria-live="polite">
        <LoaderCircle className="state-spinner" size={22} aria-hidden="true" />
        <span>Consultando dados analíticos…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="query-state query-state--error" role="alert">
        <AlertTriangle size={20} aria-hidden="true" />
        <div>
          <strong>Não foi possível carregar os dados</strong>
          <span>{error}</span>
        </div>
        <button className="state-retry" type="button" onClick={onRetry}>
          <RefreshCw size={14} aria-hidden="true" />
          Tentar novamente
        </button>
      </div>
    )
  }

  if (empty) {
    return (
      <div className="query-state query-state--empty" role="status">
        <span className="empty-state-symbol" aria-hidden="true">—</span>
        <span>{emptyMessage}</span>
      </div>
    )
  }

  return children
}

export default QueryState