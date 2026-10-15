import { lazy, Suspense, useEffect, useState } from 'react'
import { AlertTriangle, Download, LoaderCircle, Menu, RefreshCw } from 'lucide-react'
import ConnectionStatus from './components/ConnectionStatus'
import DashboardFilters from './components/DashboardFilters'
import Sidebar from './components/Sidebar'
import ThemeToggle from './components/ThemeToggle'
import DataClyraAssistant from './components/DataClyraAssistant'
import DemoLoginPage from './pages/DemoLoginPage'
import { ApiError } from './services/api'
import { fetchFilterOptions } from './services/analytics'
import {
  DemoSessionMissingError,
  endDemoSession,
  getCurrentDemoSession,
} from './services/demoAuth'
import { DEMO_SESSION_HEADER, getDemoSessionId, onDemoSessionInvalidated } from './services/demoSessionStorage'
import type { DemoProfile, DemoSessionResponse } from './types/demoAuth'
import type { AnalyticsFilters, FilterOptionsResponse } from './types/api'
import { NAV_ITEMS } from './types/navigation'
import type { ViewId } from './types/navigation'
import { getErrorMessage } from './utils/errors'
import { applyTheme, getInitialTheme, type Theme } from './utils/theme'
import './styles/app.css'
import './styles/dashboards.css'
import './styles/session-state.css'

const OverviewPage = lazy(() => import('./pages/OverviewPage'))
const CommercialPage = lazy(() => import('./pages/CommercialPage'))
const OperationsPage = lazy(() => import('./pages/OperationsPage'))
const DataQualityPage = lazy(() => import('./pages/DataQualityPage'))
const DataClyraAiPage = lazy(() => import('./pages/DataClyraAiPage'))
const LineagePage = lazy(() => import('./pages/LineagePage'))
const SystemStatusPage = lazy(() => import('./pages/SystemStatusPage'))
const DataCatalogPage = lazy(() => import('./pages/DataCatalogPage'))

type SessionState =
  | { status: 'checking' }
  | { status: 'authenticated'; profile: DemoProfile }
  | { status: 'anonymous'; notice?: string }
  | { status: 'error'; message: string }

function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [sessionState, setSessionState] = useState<SessionState>({ status: 'checking' })
  const [sessionCheckKey, setSessionCheckKey] = useState(0)
  const [activeView, setActiveView] = useState<ViewId>('overview')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [filters, setFilters] = useState<AnalyticsFilters>({})
  const [exportState, setExportState] = useState<{ loading: boolean; message: string }>({ loading: false, message: '' })
  const [filterOptions, setFilterOptions] = useState<FilterOptionsResponse | null>(null)
  const [filterOptionsProfileId, setFilterOptionsProfileId] = useState<string | null>(null)
  const [filterOptionsErrorState, setFilterOptionsErrorState] = useState<{
    profileId: string
    message: string | null
  } | null>(null)

  useEffect(() => {
    if (!exportState.message) return
    const timeout = window.setTimeout(() => {
      setExportState((state) => state.loading ? state : { ...state, message: '' })
    }, 3500)
    return () => window.clearTimeout(timeout)
  }, [exportState.message])

  const toggleTheme = () => {
    const nextTheme: Theme = theme === 'light' ? 'dark' : 'light'
    setTheme(nextTheme)
    applyTheme(nextTheme)
  }

  useEffect(() => {
    applyTheme(theme)
  }, [theme])
  const activeProfileId = sessionState.status === 'authenticated'
    ? sessionState.profile.profile_id
    : null
  const filterOptionsLoading = activeProfileId !== null
    && filterOptionsProfileId !== activeProfileId
  const filterOptionsError = activeProfileId !== null
    && filterOptionsErrorState?.profileId === activeProfileId
    ? filterOptionsErrorState.message
    : null
  const technical = sessionState.status === 'authenticated' && sessionState.profile.role === 'data_engineer'
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
  const navigateTo = (view: ViewId) => {
    setActiveView(view)
    setIsMobileMenuOpen(false)
  }
  const exportFilteredOrders = async () => {
    setExportState({ loading: true, message: '' })
    try {
    const query = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => { if (value) query.set(key, value) })
    const sessionId = getDemoSessionId()
    const response = await fetch(`/api/v1/analytics/export.csv?${query}`, { headers: sessionId ? { [DEMO_SESSION_HEADER]: sessionId } : {} })
    if (!response.ok) throw new Error('Não foi possível exportar os registros filtrados.')
    const blob = await response.blob()
    if (blob.size <= 3) throw new Error('Não há registros para exportar.')
    const url = URL.createObjectURL(blob); const link = document.createElement('a')
    link.href = url; link.download = 'dataclyra-orders.csv'; link.click(); URL.revokeObjectURL(url)
      setExportState({ loading: false, message: 'Exportação concluída.' })
    } catch (error) {
      setExportState({ loading: false, message: error instanceof Error ? error.message : 'Não foi possível exportar os registros.' })
    }
  }

  const handleSessionStarted = (session: DemoSessionResponse) => {
    setFilterOptions(null)
    setFilterOptionsProfileId(null)
    setFilterOptionsErrorState(null)
    setFilters({})
    setSessionState({ status: 'authenticated', profile: session.profile })
  }

  const handleLogout = async () => {
    setIsMobileMenuOpen(false)
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
        <strong>Validando sessão DataClyra</strong>
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
      {isMobileMenuOpen && <button className="sidebar-backdrop" type="button" aria-label="Fechar menu de navegação" onClick={() => setIsMobileMenuOpen(false)} />}
      <Sidebar
        activeView={activeView}
        onNavigate={navigateTo}
        identity={sessionState.profile}
        onLogout={() => void handleLogout()}
        mobileOpen={isMobileMenuOpen}
        onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
      />
      <div className="workspace">
        <header className="topbar">
          <button className="mobile-menu-toggle" type="button" aria-label="Abrir menu de navegação" aria-expanded={isMobileMenuOpen} aria-controls="primary-sidebar" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu size={20} aria-hidden="true" />
          </button>
          <div className="breadcrumbs" aria-label="Localização atual">
            <span>PORTAL</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{currentView.label}</strong>
          </div>
          <div className="topbar-actions">
            <div className="export-action"><button className="export-button" type="button" onClick={() => void exportFilteredOrders()} disabled={exportState.loading}><Download size={15} aria-hidden="true" />{exportState.loading ? 'Exportando…' : 'Exportar CSV'}</button>{exportState.message && <span role="status">{exportState.message}</span>}</div>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <ConnectionStatus />
          </div>
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
            {activeView === 'data_quality' && <DataQualityPage filters={filters} />}
            {activeView === 'ai' && <DataClyraAiPage filters={filters} />}
            {activeView === 'lineage' && <LineagePage />}
            {activeView === 'status' && technical && <SystemStatusPage />}
            {activeView === 'catalog' && <DataCatalogPage />}
          </Suspense>
        </main>
        <footer className="workspace-footer">
          <span>DATACLYRA ANALYTICS PLATFORM</span>
          <span>AMBIENTE DEMO · ESCOPO REGIONAL ATIVO</span>
        </footer>
        <DataClyraAssistant filters={filters} />
      </div>
    </div>
  )
}

export default App
