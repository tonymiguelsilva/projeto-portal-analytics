import { useEffect, useState } from 'react'
import { Lightbulb } from 'lucide-react'
import { fetchOverview, fetchSales } from '../services/analytics'
import type { AnalyticsFilters, OverviewResponse, SalesResponse } from '../types/api'
import { formatCurrency, formatPercent, formatVariation } from '../utils/format'

export default function AutomatedInsights({ filters }: { filters: AnalyticsFilters }) {
  const [overview, setOverview] = useState<OverviewResponse | null>(null); const [sales, setSales] = useState<SalesResponse | null>(null)
  useEffect(() => { const controller = new AbortController(); Promise.all([fetchOverview(filters, controller.signal), fetchSales(filters, 'region', controller.signal)]).then(([o, s]) => { if (!controller.signal.aborted) { setOverview(o); setSales(s) } }).catch(() => { if (!controller.signal.aborted) { setOverview(null); setSales(null) } }); return () => controller.abort() }, [filters])
  if (!overview || !sales || overview.metrics.total_order_count < 2) return null
  const top = [...sales.items].sort((a, b) => b.net_revenue - a.net_revenue)[0]
  const insights = [
    overview.variation_pct.net_revenue != null && `Faturamento líquido: ${formatVariation(overview.variation_pct.net_revenue)}.`,
    overview.variation_pct.gross_profit != null && `Lucro bruto: ${formatVariation(overview.variation_pct.gross_profit)}.`,
    top && `Maior contribuição regional: ${top.value}, com ${formatCurrency(top.net_revenue)} de faturamento líquido.`,
    overview.metrics.cancellation_rate_pct != null && overview.metrics.cancellation_rate_pct > 0 && `Cancelamentos representam ${formatPercent(overview.metrics.cancellation_rate_pct)} dos pedidos do recorte.`,
  ].filter((insight): insight is string => Boolean(insight))
  if (!insights.length) return null
  return <section className="insights-panel" aria-label="Insights automatizados"><div><Lightbulb size={18} aria-hidden="true" /><span>ANÁLISE AUTOMATIZADA POR REGRAS</span></div><ul>{insights.map((text) => <li key={text}>{text}</li>)}</ul><small>Observações descritivas do período e filtros ativos; não inferem causas.</small></section>
}
