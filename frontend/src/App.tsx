import { lazy, Suspense, useEffect, useState } from 'react'
import { AlertTriangle, LoaderCircle, RefreshCw } from 'lucide-react'
import ConnectionStatus from './components/ConnectionStatus'
import DashboardFilters from './components/DashboardFilters'
import Sidebar from './components/Sidebar'
import DemoLoginPage from './pages/DemoLoginPage'
import { ApiError } from './services/api'
import { fetchFilterOptions } from './services/analytics'
import {
  DemoSessionMissingError,
  endDemoSession,
  getCurrentDemoSession,
} from './services/demoAuth'
import { onDemoSessionInvalidated } from './services/demoSessionStorage'
import type { DemoProfile, DemoSessionResponse } from './types/demoAuth'
import type { AnalyticsFilters, FilterOptionsResponse } from './types/api'
import { NAV_ITEMS } from './types/navigation'
import type { ViewId } from './types/navigation'
import { getErrorMessage } from './utils/errors'
import './styles/app.css'
import './styles/dashboards.css'
import './styles/session-state.css'

const OverviewPage = lazy(() => import('./pages/OverviewPage'))
const CommercialPage = lazy(() => import('./pages/CommercialPage'))
const OperationsPage = lazy(() => import('./pages/OperationsPage'))

type SessionState =
  | { status: 'checking' }
  | { status: 'authenticated'; profile: DemoProfile }
  | { status: 'anonymous'; notice?: string }
  | { status: 'error'; message: string }

function App() {
  const [sessionState, setSessionState] = useState<SessionState>({ status: 'checking' })
  const [sessionCheckKey, setSessionCheckKey] = useState(0)
  const [activeView, setActiveView] = useState<ViewId>('overview')
  const [filters, setFilters] = useState<AnalyticsFilters>({})
  const [filterOptions, setFilterOptions] = useState<FilterOptionsResponse | null>(null)
  const [filterOptionsProfileId, setFilterOptionsProfileId] = useState<string | null>(null)
  const [filterOptionsErrorState, setFilterOptionsErrorState] = useState<{
    profileId: string
    message: string | null
  } | null>(null)
  const activeProfileId = sessionState.status === 'authenticated'
    ? sessionState.profile.profile_id
    : null
  const filterOptionsLoading = activeProfileId !== null
    && filterOptionsProfileId !== activeProfileId
  const filterOptionsError = activeProfileId !== null
    && filterOptionsErrorState?.profileId === activeProfileId
    ? filterOptionsErrorState.message
    : null
  const currentView = NAV_ITEMS.find((item) => item.id === activeView) ?? NAV_ITEMS[0]

  useEffect(() => {
    const unsubscribe = onDemoSessionInvalidated(() => {
      setFilterOptions(null)
      setFilterOptionsProfileId(null)
      setFilterOptionsErrorState(null)
      setFilters({})
      setSessionState({
        status: 'anonymous',
        notice: 'Sua sessão expirou. Selecione um perfil para continuar.',
      })
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    getCurrentDemoSession(controller.signal)
      .then((profile) => {
        if (!controller.signal.aborted) {
          setSessionState({ status: 'authenticated', profile })
        }
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return
        if (requestError instanceof DemoSessionMissingError) {
          setSessionState({ status: 'anonymous' })
        } else if (requestError instanceof ApiError && requestError.status === 401) {
          setSessionState({
            status: 'anonymous',
            notice: 'Sua sessão expirou. Selecione um perfil para continuar.',
          })
        } else {
          setSessionState({ status: 'error', message: getErrorMessage(requestError) })
        }
      })
    return () => controller.abort()
  }, [sessionCheckKey])

  useEffect(() => {
    if (activeProfileId === null) return
    const controller = new AbortController()

    fetchFilterOptions(controller.signal)
      .then((options) => {
        if (!controller.signal.aborted) {
          setFilterOptions(options)
          setFilterOptionsProfileId(activeProfileId)
          setFilterOptionsErrorState({ profileId: activeProfileId, message: null })
        }
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setFilterOptionsProfileId(activeProfileId)
          setFilterOptionsErrorState({
            profileId: activeProfileId,
            message: getErrorMessage(requestError),
          })
        }
      })
    return () => controller.abort()
  }, [activeProfileId])

  const updateFilters = (nextFilters: AnalyticsFilters) => setFilters(nextFilters)

  const handleSessionStarted = (session: DemoSessionResponse) => {
    setFilterOptions(null)
    setFilterOptionsProfileId(null)
    setFilterOptionsErrorState(null)
    setFilters({})
    setSessionState({ status: 'authenticated', profile: session.profile })
  }

  const handleLogout = async () => {
    setFilterOptions(null)
    setFilterOptionsProfileId(null)
    setFilterOptionsErrorState(null)
    setFilters({})
    setSessionState({ status: 'anonymous', notice: 'Sessão encerrada neste navegador.' })
    try {
      await endDemoSession()
    } catch {
      setSessionState({
        status: 'anonymous',
        notice: 'Sessão removida deste navegador. O backend não confirmou a revogação; ela expira em até 1 hora.',
      })
    }
  }

  if (sessionState.status === 'checking') {
    return (
      <main className="session-state-page" role="status" aria-live="polite">
        <LoaderCircle className="session-state-spinner" size={23} aria-hidden="true" />
        <strong>Validando sessão DataLens</strong>
        <span>Consultando o backend antes de abrir o portal.</span>
      </main>
    )
  }

  if (sessionState.status === 'error') {
    return (
      <main className="session-state-page session-state-page--error" role="alert">
        <AlertTriangle size={22} aria-hidden="true" />
        <strong>Não foi possível validar sua sessão</strong>
        <span>{sessionState.message}</span>
        <button type="button" onClick={() => setSessionCheckKey((key) => key + 1)}>
          <RefreshCw size={15} aria-hidden="true" />
          Tentar novamente
        </button>
      </main>
    )
  }

  if (sessionState.status === 'anonymous') {
    return (
      <>
        {sessionState.notice && (
          <div className="session-notice" role="status">{sessionState.notice}</div>
        )}
        <DemoLoginPage onSessionStarted={handleSessionStarted} />
      </>
    )
  }

  return (
    <div className="app-shell">
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        identity={sessionState.profile}
        onLogout={() => void handleLogout()}
      />
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumbs" aria-label="Localização atual">
            <span>PORTAL</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{currentView.label}</strong>
          </div>
          <ConnectionStatus />
        </header>
        <main className="page-main">
          <DashboardFilters
            options={filterOptions}
            filters={filters}
            loading={filterOptionsLoading}
            onChange={updateFilters}
          />
          {filterOptionsError && (
            <div className="filter-error-banner" role="status">
              Opções de filtro indisponíveis: {filterOptionsError}
            </div>
          )}
          <Suspense fallback={<div className="page-load-state" role="status">Preparando painel…</div>}>
            {activeView === 'overview' && <OverviewPage filters={filters} />}
            {activeView === 'commercial' && <CommercialPage filters={filters} />}
            {activeView === 'operations' && <OperationsPage filters={filters} />}
          </Suspense>
        </main>
        <footer className="workspace-footer">
          <span>DATALENS ANALYTICS</span>
          <span>AMBIENTE DEMO · ESCOPO REGIONAL ATIVO</span>
        </footer>
      </div>
    </div>
  )
}

export default App
