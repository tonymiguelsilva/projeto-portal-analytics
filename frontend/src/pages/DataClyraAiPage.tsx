import { useState } from 'react'
import type { FormEvent } from 'react'
import { apiRequest } from '../services/api'
import type { AnalyticsFilters } from '../types/api'

interface Props { filters: AnalyticsFilters }

export default function DataClyraAiPage({ filters }: Props) {
  const [question, setQuestion] = useState('Qual é o faturamento no período?')
  const [answer, setAnswer] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ask = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError(null)
    const query = new URLSearchParams({ question })
    Object.entries(filters).forEach(([key, value]) => { if (value) query.set(key, value) })
    try { const result = await apiRequest<{ answer: string }>(`/api/v1/analytics/assistant?${query}`); setAnswer(result.answer) }
    catch { setError('Não foi possível consultar o assistente demonstrativo.') }
    finally { setLoading(false) }
  }
  return <div className="dashboard-page"><section className="page-heading"><div><p className="eyebrow"><span className="eyebrow-line" /> ASSISTENTE DEMONSTRATIVO</p><h1>DataClyra AI<span className="heading-period">.</span></h1><p className="page-intro">Respostas determinísticas com os dados demo, filtros ativos e escopo regional.</p></div></section><section className="panel"><form onSubmit={ask}><label htmlFor="ai-question">Pergunte sobre faturamento, pedidos, ticket, regiões ou categorias</label><div className="ai-form"><input id="ai-question" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={500} /><button disabled={loading}>{loading ? 'Consultando…' : 'Perguntar'}</button></div></form>{error && <p role="alert">{error}</p>}{answer && <div className="ai-answer"><strong>Resposta</strong><p>{answer}</p><small>Período e filtros ativos são considerados. Este é um assistente analítico demonstrativo, sem LLM conectado.</small></div>}</section></div>
}
