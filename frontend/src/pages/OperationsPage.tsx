import { useEffect, useState } from 'react'
import {
  AlertOctagon,
  CheckCircle2,
  Clock3,
  PackageOpen,
  Search,
  Truck,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import MetricCard from '../components/MetricCard'
import Panel from '../components/Panel'
import QueryState from '../components/QueryState'
import { fetchOperations, fetchOrderDetail, fetchOverview } from '../services/analytics'
import type {
  AnalyticsFilters,
  OperationsResponse,
  OrderDetailResponse,
  OverviewResponse,
} from '../types/api'
import { formatCurrency, formatDate, formatDays, formatInteger, formatPercent } from '../utils/format'
import { getErrorMessage } from '../utils/errors'
import { useChartTheme } from '../utils/chartTheme'

interface OperationsPageProps {
  filters: AnalyticsFilters
}

interface OrderLookupSnapshot {
  key: string
  error: string | null
  order: OrderDetailResponse | null
}

function OperationsPage({ filters }: OperationsPageProps) {
  const chartTheme = useChartTheme()
  const [operations, setOperations] = useState<OperationsResponse | null>(null)
  const [overview, setOverview] = useState<OverviewResponse | null>(null)
  const [queryState, setQueryState] = useState<{
    key: string
    error: string | null
  }>({ key: '', error: null })
  const [retryKey, setRetryKey] = useState(0)
  const [orderInput, setOrderInput] = useState('')
  const [submittedOrderId, setSubmittedOrderId] = useState<string | null>(null)
  const [lookup, setLookup] = useState<OrderLookupSnapshot>({ key: '', error: null, order: null })
  const [lookupRetryKey, setLookupRetryKey] = useState(0)
  const requestKey = JSON.stringify(filters)
  const lookupKey = submittedOrderId ? `${submittedOrderId}:${lookupRetryKey}` : ''

  useEffect(() => {
    const controller = new AbortController()

    Promise.all([
      fetchOperations(filters, controller.signal),
      fetchOverview(filters, controller.signal),
    ])
      .then(([operationsResult, overviewResult]) => {
        setOperations(operationsResult)
        setOverview(overviewResult)
        setQueryState({ key: requestKey, error: null })
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setQueryState({ key: requestKey, error: getErrorMessage(requestError) })
        }
      })

    return () => controller.abort()
  }, [filters, requestKey, retryKey])

  useEffect(() => {
    if (!submittedOrderId) return
    const controller = new AbortController()

    fetchOrderDetail(submittedOrderId, controller.signal)
      .then((order) => setLookup({ key: lookupKey, error: null, order }))
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setLookup({ key: lookupKey, error: getErrorMessage(requestError), order: null })
        }
      })

    return () => controller.abort()
  }, [submittedOrderId, lookupKey, lookupRetryKey])

  const loading = queryState.key !== requestKey
  const error = queryState.key === requestKey ? queryState.error : null
  const currentOperations = loading || error ? null : operations
  const currentOverview = loading || error ? null : overview
  const metrics = currentOperations?.metrics
  const empty = !loading && !error && (metrics?.total_order_count ?? 0) === 0
  const lookupLoading = Boolean(submittedOrderId) && lookup.key !== lookupKey
  const lookupError = lookup.key === lookupKey ? lookup.error : null
  const orderDetail = lookup.key === lookupKey ? lookup.order : null
  const statusData = metrics
    ? [
        { status: 'Entregues', pedidos: metrics.delivered_order_count, fill: chartTheme.success },
        { status: 'Em aberto', pedidos: metrics.open_order_count, fill: chartTheme.warning },
        { status: 'Cancelados', pedidos: metrics.cancelled_order_count, fill: chartTheme.primary },
      ]
    : []

  const submitOrderLookup = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const orderId = orderInput.trim()
    if (orderId) setSubmittedOrderId(orderId)
  }

  return (
    <div className="dashboard-page operations-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow"><span className="eyebrow-line" /> CONTROLE OPERACIONAL</p>
          <h1>Operacional<span className="heading-period">.</span></h1>
          <p className="page-intro">Acompanhe o ciclo do pedido e o desempenho de entrega.</p>
        </div>
        <div className="page-heading-icon page-heading-icon--coral" aria-hidden="true"><Truck size={23} /></div>
      </section>

      <section className="metric-grid metric-grid--five" aria-label="Indicadores operacionais">
        <MetricCard label="Pedidos em aberto" value={formatInteger(metrics?.open_order_count)} detail="Pendentes ou enviados" icon={PackageOpen} tone="amber" loading={loading} />
        <MetricCard label="Cancelamentos" value={formatInteger(metrics?.cancelled_order_count)} detail={formatPercent(metrics?.cancellation_rate_pct)} icon={AlertOctagon} tone="red" loading={loading} />
        <MetricCard label="Unidades vendidas" value={formatInteger(currentOverview?.metrics.units_sold)} detail="Pedidos não cancelados" icon={CheckCircle2} tone="green" loading={loading} />
        <MetricCard label="Prazo médio" value={formatDays(metrics?.average_delivery_days)} detail="Criação até a entrega" icon={Clock3} tone="blue" loading={loading} />
        <MetricCard label="Entregas no prazo" value={formatPercent(metrics?.on_time_delivery_rate_pct)} detail="Base: pedidos entregues" icon={Truck} tone="green" loading={loading} />
      </section>

      <QueryState
        loading={loading}
        error={error}
        empty={empty}
        emptyMessage="Não há pedidos no período e nos filtros selecionados."
        onRetry={() => setRetryKey((key) => key + 1)}
      >
        {metrics && (
          <div className="operations-grid">
            <Panel eyebrow="CARTEIRA DE PEDIDOS" title="Situação dos pedidos" className="chart-panel">
              <div className="chart-frame chart-frame--status">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData} layout="vertical" margin={{ top: 8, right: 22, left: 5, bottom: 4 }}>
                    <CartesianGrid stroke={chartTheme.grid} horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: chartTheme.tick, fontSize: 10 }} />
                    <YAxis type="category" dataKey="status" width={96} tickLine={false} axisLine={false} tick={{ fill: chartTheme.tick, fontSize: 11 }} />
                    <Tooltip
                      formatter={(value) => formatInteger(Number(value))}
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
                    <Bar dataKey="pedidos" name="Pedidos" radius={[0, 4, 4, 0]} maxBarSize={26}>
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="chart-footnote">“Em aberto” agrega os estados `pending` e `shipped`, conforme o contrato da API.</p>
            </Panel>

            <Panel eyebrow="NÍVEL DE SERVIÇO" title="Pontualidade de entrega" className="delivery-panel">
              {metrics.on_time_delivery_rate_pct == null ? (
                <div className="inline-empty">Sem pedidos entregues para calcular a pontualidade.</div>
              ) : (
                <div className="delivery-gauge">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      data={[{ name: 'No prazo', value: metrics.on_time_delivery_rate_pct, fill: chartTheme.success }]}
                      startAngle={210}
                      endAngle={-30}
                      innerRadius="78%"
                      outerRadius="100%"
                      barSize={14}
                    >
                      <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                      <RadialBar dataKey="value" background={{ fill: chartTheme.track }} cornerRadius={7} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <strong>{formatPercent(metrics.on_time_delivery_rate_pct)}</strong>
                  <span>entregas no prazo</span>
                </div>
              )}
              <div className="delivery-base">
                <span>ENTREGAS CONCLUÍDAS</span>
                <strong>{formatInteger(metrics.delivered_order_count)}</strong>
              </div>
            </Panel>
          </div>
        )}
      </QueryState>

      <Panel eyebrow="CONSULTA PONTUAL" title="Detalhe de pedido" className="order-lookup-panel">
        <p className="lookup-description">Consulte um registro pelo identificador retornado pela fonte Demo.</p>
        <form className="order-lookup-form" onSubmit={submitOrderLookup}>
          <label className="visually-hidden" htmlFor="order-id-input">Identificador do pedido</label>
          <input
            id="order-id-input"
            value={orderInput}
            onChange={(event) => setOrderInput(event.target.value)}
            placeholder="Ex.: ORD-2026-09-001"
            autoComplete="off"
          />
          <button type="submit" disabled={!orderInput.trim() || lookupLoading}>
            <Search size={15} aria-hidden="true" />
            Consultar
          </button>
        </form>

        {lookupLoading && <p className="lookup-feedback" role="status">Consultando pedido…</p>}
        {lookupError && (
          <div className="lookup-error" role="alert">
            <span>{lookupError}</span>
            <button type="button" onClick={() => setLookupRetryKey((key) => key + 1)}>Tentar novamente</button>
          </div>
        )}
        {orderDetail && (
          <div className="order-detail-grid">
            <div><span>PEDIDO</span><strong>{orderDetail.order_id}</strong></div>
            <div><span>STATUS</span><strong className={`order-status order-status--${orderDetail.status}`}>{orderDetail.status}</strong></div>
            <div><span>DATA DO PEDIDO</span><strong>{formatDate(orderDetail.order_date)}</strong></div>
            <div><span>REGIÃO · CANAL</span><strong>{orderDetail.region} · {orderDetail.sales_channel}</strong></div>
            <div><span>CATEGORIA</span><strong>{orderDetail.product_category}</strong></div>
            <div><span>UNIDADES</span><strong>{formatInteger(orderDetail.units)}</strong></div>
            <div><span>FATURAMENTO LÍQUIDO</span><strong>{formatCurrency(orderDetail.net_revenue)}</strong></div>
            <div><span>LUCRO BRUTO</span><strong>{formatCurrency(orderDetail.gross_profit)}</strong></div>
            <div><span>PREVISÃO DE ENTREGA</span><strong>{formatDate(orderDetail.promised_delivery_date)}</strong></div>
            <div><span>ENTREGUE EM</span><strong>{formatDate(orderDetail.delivered_at)}</strong></div>
          </div>
        )}
      </Panel>
    </div>
  )
}

export default OperationsPage