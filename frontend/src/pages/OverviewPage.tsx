import { useEffect, useState } from 'react'
import {
  Activity,
  BadgePercent,
  Banknote,
  ClipboardCheck,
  PackageCheck,
  ShoppingCart,
  Truck,
} from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import MetricCard from '../components/MetricCard'
import Panel from '../components/Panel'
import QueryState from '../components/QueryState'
import AutomatedInsights from '../components/AutomatedInsights'
import { fetchOverview, fetchTrends } from '../services/analytics'
import type { AnalyticsFilters, OverviewResponse, TrendsResponse } from '../types/api'
import { formatCompactCurrency, formatCurrency, formatInteger, formatMonth, formatPercent, formatVariation } from '../utils/format'
import { getErrorMessage } from '../utils/errors'
import { useChartTheme } from '../utils/chartTheme'

interface OverviewPageProps {
  filters: AnalyticsFilters
}

function OverviewPage({ filters }: OverviewPageProps) {
  const chartTheme = useChartTheme()
  const [overview, setOverview] = useState<OverviewResponse | null>(null)
  const [trends, setTrends] = useState<TrendsResponse | null>(null)
  const [queryState, setQueryState] = useState<{
    key: string
    error: string | null
  }>({ key: '', error: null })
  const [retryKey, setRetryKey] = useState(0)
  const requestKey = JSON.stringify(filters)

  useEffect(() => {
    const controller = new AbortController()

    Promise.all([
      fetchOverview(filters, controller.signal),
      fetchTrends(filters, controller.signal),
    ])
      .then(([overviewResult, trendResult]) => {
        setOverview(overviewResult)
        setTrends(trendResult)
        setQueryState({ key: requestKey, error: null })
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setQueryState({ key: requestKey, error: getErrorMessage(requestError) })
        }
      })

    return () => controller.abort()
  }, [filters, requestKey, retryKey])

  const loading = queryState.key !== requestKey
  const error = queryState.key === requestKey ? queryState.error : null
  const currentOverview = loading || error ? null : overview
  const currentTrends = loading || error ? null : trends
  const metrics = currentOverview?.metrics
  const empty = !loading && !error && (metrics?.total_order_count ?? 0) === 0
  const periodLabel = currentOverview?.period.start_date && currentOverview.period.end_date
    ? `${formatMonth(currentOverview.period.start_date.slice(0, 7))} — ${formatMonth(currentOverview.period.end_date.slice(0, 7))}`
    : 'Período sem registros'

  return (
    <div className="overview-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow"><span className="eyebrow-line" /> PAINEL EXECUTIVO</p>
          <h1>Visão geral<span className="heading-period">.</span></h1>
          <p className="page-intro">Panorama executivo · {periodLabel}</p>
        </div>
        <div className="dataset-badge">
          <span className="dataset-badge-label">ORIGEM DOS DADOS</span>
          <strong>API <span>·</span> DEMO</strong>
          <span className="dataset-badge-foot">ATUALIZADO SOB DEMANDA</span>
        </div>
      </section>

      <QueryState
        loading={loading}
        error={error}
        empty={empty}
        onRetry={() => setRetryKey((key) => key + 1)}
      >
        {metrics && currentOverview && currentTrends && (
          <div className="overview-content">
            <section className="metric-grid" aria-label="Indicadores executivos">
              <MetricCard label="Faturamento líquido" value={formatCurrency(metrics.net_revenue)} detail={formatVariation(currentOverview.variation_pct.net_revenue)} icon={Banknote} tone="red" />
              <MetricCard label="Pedidos válidos" value={formatInteger(metrics.valid_order_count)} detail={formatVariation(currentOverview.variation_pct.valid_order_count)} icon={ShoppingCart} tone="blue" />
              <MetricCard label="Ticket médio" value={formatCurrency(metrics.average_ticket)} detail="Por pedido não cancelado" icon={ClipboardCheck} tone="green" />
              <MetricCard label="Lucro bruto" value={formatCurrency(metrics.gross_profit)} detail={formatVariation(currentOverview.variation_pct.gross_profit)} icon={Activity} tone="amber" />
              <MetricCard label="Margem bruta" value={formatPercent(metrics.gross_margin_pct)} detail="Lucro bruto / faturamento líquido" icon={BadgePercent} tone="red" />
            </section>

            <section className="secondary-metrics" aria-label="Indicadores complementares">
              <div className="secondary-metric">
                <span className="secondary-icon secondary-icon--coral"><PackageCheck size={17} /></span>
                <div><span>Cancelamentos</span><strong>{formatInteger(metrics.cancelled_order_count)} <small>· {formatPercent(metrics.cancellation_rate_pct)}</small></strong></div>
              </div>
              <div className="secondary-metric">
                <span className="secondary-icon secondary-icon--lime"><Truck size={17} /></span>
                <div><span>Entregas no prazo</span><strong>{formatPercent(metrics.on_time_delivery_rate_pct)} <small>· base: pedidos entregues</small></strong></div>
              </div>
            </section>
            <AutomatedInsights filters={filters} />

            <Panel
              eyebrow="SÉRIE TEMPORAL"
              title="Evolução do faturamento líquido"
              className="chart-panel"
              action={<span className="chart-period-chip">{currentTrends.items.length} períodos mensais</span>}
            >
              {currentTrends.items.length === 0 ? (
                <div className="inline-empty">Sem meses para os filtros selecionados.</div>
              ) : (
                <div className="chart-frame chart-frame--overview">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={currentTrends.items} margin={{ top: 12, right: 12, left: 6, bottom: 2 }}>
                      <CartesianGrid stroke={chartTheme.grid} vertical={false} />
                      <XAxis dataKey="month" tickFormatter={formatMonth} tickLine={false} axisLine={false} tick={{ fill: chartTheme.tick, fontSize: 11 }} minTickGap={24} />
                      <YAxis tickFormatter={formatCompactCurrency} tickLine={false} axisLine={false} width={68} tick={{ fill: chartTheme.tick, fontSize: 10 }} />
                      <Tooltip
                        labelFormatter={(label) => formatMonth(String(label))}
                        formatter={(value) => formatCurrency(Number(value))}
                        contentStyle={{
                          backgroundColor: chartTheme.tooltipBg,
                          borderColor: chartTheme.tooltipBorder,
                          color: chartTheme.tooltipText,
                          borderRadius: 8,
                          fontSize: 12,
                          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="net_revenue"
                        name="Faturamento líquido"
                        stroke={chartTheme.primary}
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: chartTheme.tooltipBg, stroke: chartTheme.primary, strokeWidth: 2 }}
                        activeDot={{ r: 5, fill: chartTheme.primary }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="chart-footnote">Comparação exibida contra a janela anterior de mesma duração, quando houver base válida.</div>
            </Panel>
          </div>
        )}
      </QueryState>
    </div>
  )
}

export default OverviewPage
