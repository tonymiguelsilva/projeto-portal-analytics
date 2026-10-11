import { useEffect, useState } from 'react'
import { BarChart3, Boxes, MapPinned, Store } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import MetricCard from '../components/MetricCard'
import Panel from '../components/Panel'
import QueryState from '../components/QueryState'
import { fetchSales } from '../services/analytics'
import type { AnalyticsFilters, SalesDimension, SalesResponse } from '../types/api'
import { formatCompactCurrency, formatCurrency, formatInteger, formatPercent } from '../utils/format'
import { getErrorMessage } from '../utils/errors'
import { useChartTheme } from '../utils/chartTheme'

interface CommercialPageProps {
  filters: AnalyticsFilters
}

const DIMENSIONS: { id: SalesDimension; label: string; icon: typeof MapPinned }[] = [
  { id: 'region', label: 'Região', icon: MapPinned },
  { id: 'channel', label: 'Canal', icon: Store },
  { id: 'category', label: 'Categoria', icon: Boxes },
]

function CommercialPage({ filters }: CommercialPageProps) {
  const chartTheme = useChartTheme()
  const [dimension, setDimension] = useState<SalesDimension>('region')
  const [sales, setSales] = useState<SalesResponse | null>(null)
  const [queryState, setQueryState] = useState<{
    key: string
    error: string | null
  }>({ key: '', error: null })
  const [retryKey, setRetryKey] = useState(0)
  const requestKey = `${JSON.stringify(filters)}:${dimension}`

  useEffect(() => {
    const controller = new AbortController()

    fetchSales(filters, dimension, controller.signal)
      .then((result) => {
        setSales(result)
        setQueryState({ key: requestKey, error: null })
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setQueryState({ key: requestKey, error: getErrorMessage(requestError) })
        }
      })

    return () => controller.abort()
  }, [filters, dimension, requestKey, retryKey])

  const loading = queryState.key !== requestKey
  const error = queryState.key === requestKey ? queryState.error : null
  const currentSales = loading || error ? null : sales
  const items = currentSales?.items ?? []
  const totalRevenue = items.reduce((total, item) => total + item.net_revenue, 0)
  const totalUnits = items.reduce((total, item) => total + item.units_sold, 0)
  const totalOrders = items.reduce((total, item) => total + item.valid_order_count, 0)
  const weightedProfit = items.reduce((total, item) => total + item.gross_profit, 0)
  const totalMargin = totalRevenue === 0 ? null : (weightedProfit / totalRevenue) * 100

  return (
    <div className="dashboard-page commercial-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow"><span className="eyebrow-line" /> DESEMPENHO DE VENDAS</p>
          <h1>Comercial<span className="heading-period">.</span></h1>
          <p className="page-intro">Compare a composição das vendas pelos recortes disponíveis.</p>
        </div>
        <div className="page-heading-icon" aria-hidden="true"><BarChart3 size={23} /></div>
      </section>

      <div className="dimension-switch" role="group" aria-label="Dimensão comercial">
        {DIMENSIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={dimension === id ? 'is-selected' : ''}
            type="button"
            aria-pressed={dimension === id}
            onClick={() => setDimension(id)}
          >
            <Icon size={15} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <section className="metric-grid metric-grid--four" aria-label="Resumo comercial">
        <MetricCard label="Faturamento líquido" value={formatCurrency(totalRevenue)} detail="Soma dos grupos retornados" icon={BarChart3} tone="red" loading={loading} />
        <MetricCard label="Pedidos válidos" value={formatInteger(totalOrders)} detail="Pedidos não cancelados" icon={Store} tone="blue" loading={loading} />
        <MetricCard label="Unidades vendidas" value={formatInteger(totalUnits)} detail="Nos grupos retornados" icon={Boxes} tone="green" loading={loading} />
        <MetricCard label="Margem bruta" value={formatPercent(totalMargin)} detail="Lucro bruto / faturamento líquido" icon={MapPinned} tone="amber" loading={loading} />
      </section>

      <QueryState
        loading={loading}
        error={error}
        empty={!loading && !error && items.length === 0}
        emptyMessage="Nenhum grupo comercial encontrado para os filtros selecionados."
        onRetry={() => setRetryKey((key) => key + 1)}
      >
        {sales && items.length > 0 && (
          <div className="commercial-content">
            <Panel
              eyebrow="COMPARATIVO"
              title={`Faturamento por ${DIMENSIONS.find((item) => item.id === dimension)?.label.toLowerCase()}`}
              className="chart-panel"
              action={<span className="chart-period-chip">{items.length} grupos</span>}
            >
              <div className="chart-frame chart-frame--bars">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={items} layout="vertical" margin={{ top: 8, right: 22, left: 12, bottom: 4 }}>
                    <CartesianGrid stroke={chartTheme.grid} horizontal={false} />
                    <XAxis type="number" tickFormatter={formatCompactCurrency} tickLine={false} axisLine={false} tick={{ fill: chartTheme.tick, fontSize: 10 }} />
                    <YAxis type="category" dataKey="value" width={104} tickLine={false} axisLine={false} tick={{ fill: chartTheme.tick, fontSize: 11 }} />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                      cursor={{ fill: 'rgba(244, 245, 247, 0.05)' }}
                      contentStyle={{
                        backgroundColor: chartTheme.tooltipBg,
                        borderColor: chartTheme.tooltipBorder,
                        color: chartTheme.tooltipText,
                        borderRadius: 8,
                        fontSize: 12,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                      }}
                    />
                    <Bar dataKey="net_revenue" name="Faturamento líquido" fill={chartTheme.primary} radius={[0, 4, 4, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel eyebrow="DETALHAMENTO" title="Indicadores por grupo" className="table-panel">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{DIMENSIONS.find((item) => item.id === dimension)?.label}</th>
                      <th>Pedidos</th>
                      <th>Unidades</th>
                      <th>Faturamento líquido</th>
                      <th>Lucro bruto</th>
                      <th>Margem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.value}>
                        <th scope="row">{item.value}</th>
                        <td>{formatInteger(item.valid_order_count)}</td>
                        <td>{formatInteger(item.units_sold)}</td>
                        <td>{formatCurrency(item.net_revenue)}</td>
                        <td>{formatCurrency(item.gross_profit)}</td>
                        <td>{formatPercent(item.gross_margin_pct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        )}
      </QueryState>
    </div>
  )
}

export default CommercialPage