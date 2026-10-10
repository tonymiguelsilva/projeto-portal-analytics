import { lazy, Suspense, useEffect, useState } from 'react'
import ConnectionStatus from './components/ConnectionStatus'
import DashboardFilters from './components/DashboardFilters'
import Sidebar from './components/Sidebar'
import { fetchFilterOptions } from './services/analytics'
import type { AnalyticsFilters, FilterOptionsResponse } from './types/api'
import { NAV_ITEMS } from './types/navigation'
import type { ViewId } from './types/navigation'
import { getErrorMessage } from './utils/errors'
import './styles/app.css'
import './styles/dashboards.css'

const OverviewPage = lazy(() => import('./pages/OverviewPage'))
const CommercialPage = lazy(() => import('./pages/CommercialPage'))
const OperationsPage = lazy(() => import('./pages/OperationsPage'))

function App() {
  const [activeView, setActiveView] = useState<ViewId>('overview')
  const [filters, setFilters] = useState<AnalyticsFilters>({})
  const [filterOptions, setFilterOptions] = useState<FilterOptionsResponse | null>(null)
  const [filterOptionsLoading, setFilterOptionsLoading] = useState(true)
  const [filterOptionsError, setFilterOptionsError] = useState<string | null>(null)
  const currentView = NAV_ITEMS.find((item) => item.id === activeView) ?? NAV_ITEMS[0]

  useEffect(() => {
    const controller = new AbortController()
    fetchFilterOptions(controller.signal)
      .then(setFilterOptions)
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) setFilterOptionsError(getErrorMessage(requestError))
      })
      .finally(() => {
        if (!controller.signal.aborted) setFilterOptionsLoading(false)
      })
    return () => controller.abort()
  }, [])

  const updateFilters = (nextFilters: AnalyticsFilters) => setFilters(nextFilters)

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />
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
          <span>PORTAL WEB ANALÍTICO</span>
          <span>AMBIENTE LOCAL · FONTE DEMO</span>
        </footer>
      </div>
    </div>
  )
}

export default App
