import { useEffect, useState } from 'react'
import { CalendarCheck2, Database, Hash, ReceiptText, Ruler, Scale } from 'lucide-react'
import MetricCard from '../components/MetricCard'
import Panel from '../components/Panel'
import QueryState from '../components/QueryState'
import { fetchDataQuality } from '../services/analytics'
import type { AnalyticsFilters, DataQualityResponse } from '../types/api'
import { formatInteger, formatPercent } from '../utils/format'
import { getErrorMessage } from '../utils/errors'

interface DataQualityPageProps {
  filters: AnalyticsFilters
}

function DataQualityPage({ filters }: DataQualityPageProps) {
  const [quality, setQuality] = useState<DataQualityResponse | null>(null)
  const [queryState, setQueryState] = useState<{ key: string; error: string | null }>({ key: '', error: null })
  const [retryKey, setRetryKey] = useState(0)
  const requestKey = JSON.stringify(filters)

  useEffect(() => {
    const controller = new AbortController()
    fetchDataQuality(filters, controller.signal)
      .then((result) => {
        setQuality(result)
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
  const currentQuality = loading || error ? null : quality
  const empty = !loading && !error && (currentQuality?.records_evaluated ?? 0) === 0

  return (
    <div className="dashboard-page data-quality-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow"><span className="eyebrow-line" /> CONFIABILIDADE DA BASE</p>
          <h1>Qualidade dos dados<span className="heading-period">.</span></h1>
          <p className="page-intro">Verificação por regra para o recorte autorizado e os filtros ativos.</p>
        </div>
        <div className="page-heading-icon page-heading-icon--quality" aria-hidden="true"><Database size={23} /></div>
      </section>

      <QueryState
        loading={loading}
        error={error}
        empty={empty}
        emptyMessage="Não há registros para avaliar com os filtros selecionados."
        onRetry={() => setRetryKey((key) => key + 1)}
      >
        {currentQuality && (
          <>
            <section className="metric-grid quality-metric-grid" aria-label="Resumo da qualidade dos dados">
              <MetricCard label="Registros avaliados" value={formatInteger(currentQuality.records_evaluated)} detail="Após filtros e escopo regional" icon={Database} tone="blue" />
              <MetricCard label="IDs duplicados" value={formatInteger(currentQuality.duplicate_order_ids)} detail={formatPercent(currentQuality.duplicate_order_id_pct)} icon={Hash} tone="red" />
              <MetricCard label="Campos obrigatórios" value={formatPercent(currentQuality.required_fields.completeness_pct)} detail={`${formatInteger(currentQuality.required_fields.values_populated)} de ${formatInteger(currentQuality.required_fields.values_expected)} valores`} icon={ReceiptText} tone="green" />
              <MetricCard label="Unidades válidas" value={formatPercent(currentQuality.units.valid_pct)} detail={`${formatInteger(currentQuality.units.invalid_record_count)} registros inválidos`} icon={Ruler} tone="amber" />
              <MetricCard label="Valores monetários" value={formatPercent(currentQuality.monetary_values.valid_pct)} detail={`${formatInteger(currentQuality.monetary_values.invalid_record_count)} registros inválidos`} icon={Scale} tone="green" />
              <MetricCard label="Consistência temporal" value={formatPercent(currentQuality.temporal_consistency.valid_pct)} detail={`${formatInteger(currentQuality.temporal_consistency.invalid_record_count)} registros inválidos`} icon={CalendarCheck2} tone="blue" />
            </section>

            <div className="quality-content">
              <Panel eyebrow="REGRAS AVALIADAS" title="Critérios e fórmulas" className="table-panel">
                <div className="table-scroll">
                  <table className="data-table quality-rules-table">
                    <thead><tr><th>Dimensão</th><th>Regra</th><th>Fórmula</th><th>Resultado</th></tr></thead>
                    <tbody>
                      <tr><th scope="row">Identificadores</th><td>O `order_id` não pode se repetir.</td><td>IDs repetidos / registros avaliados</td><td>{formatInteger(currentQuality.duplicate_order_ids)} duplicados</td></tr>
                      <tr><th scope="row">Completude</th><td>Os {currentQuality.required_fields.field_count} campos obrigatórios devem estar preenchidos.</td><td>Valores preenchidos / valores esperados</td><td>{formatPercent(currentQuality.required_fields.completeness_pct)}</td></tr>
                      <tr><th scope="row">Unidades</th><td>`units` deve ser maior que zero.</td><td>Registros válidos / registros avaliados</td><td>{formatPercent(currentQuality.units.valid_pct)}</td></tr>
                      <tr><th scope="row">Valores</th><td>Receita, desconto e custo não podem ser negativos; desconto não supera a receita bruta.</td><td>Registros válidos / registros avaliados</td><td>{formatPercent(currentQuality.monetary_values.valid_pct)}</td></tr>
                      <tr><th scope="row">Datas</th><td>Pedido ≤ envio ≤ entrega; datas exigidas devem corresponder ao status.</td><td>Registros válidos / registros avaliados</td><td>{formatPercent(currentQuality.temporal_consistency.valid_pct)}</td></tr>
                    </tbody>
                  </table>
                </div>
              </Panel>

              <Panel eyebrow="DISTRIBUIÇÃO" title="Registros por status" className="table-panel">
                <div className="table-scroll">
                  <table className="data-table">
                    <thead><tr><th>Status</th><th>Registros</th><th>Participação</th></tr></thead>
                    <tbody>
                      {currentQuality.status_distribution.map((item) => (
                        <tr key={item.status}><th scope="row">{item.status}</th><td>{formatInteger(item.record_count)}</td><td>{formatPercent(item.percentage)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </div>

            <p className="quality-note">A avaliação usa registros já validados pelo contrato Pydantic. Arquivo ausente, vazio, incompatível ou com IDs duplicados impede a avaliação e é retornado pela API como erro de dados, não como percentual de qualidade.</p>
          </>
        )}
      </QueryState>
    </div>
  )
}

export default DataQualityPage
