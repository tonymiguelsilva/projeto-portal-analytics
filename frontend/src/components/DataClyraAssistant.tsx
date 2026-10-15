import { useRef, useState } from 'react'
import { Bot, Send, Sparkles, X } from 'lucide-react'
import { apiRequest } from '../services/api'
import type { AnalyticsFilters } from '../types/api'
import { formatCurrency } from '../utils/format'

const SUGGESTIONS = ['Qual foi o faturamento total?', 'Qual foi o lucro?', 'Qual foi o ticket médio?', 'Qual região teve melhor resultado?', 'Qual categoria vendeu mais?', 'Como estão os pedidos?']
type Message = { question: string; answer: string }
const formatAssistantAnswer = (answer: string) => answer.replace(/\b\d+\.\d{1,2}\b/g, (value) => formatCurrency(Number(value)))

export default function DataClyraAssistant({ filters }: { filters: AnalyticsFilters }) {
  const [open, setOpen] = useState(false); const [question, setQuestion] = useState(''); const [history, setHistory] = useState<Message[]>([]); const [loading, setLoading] = useState(false); const [error, setError] = useState('')
  const requestController = useRef<AbortController | null>(null); const conversationId = useRef(0)
  const resetConversation = () => { conversationId.current += 1; requestController.current?.abort(); requestController.current = null; setQuestion(''); setHistory([]); setLoading(false); setError(''); setOpen(false) }
  const ask = async (value: string) => {
    if (!value.trim() || loading) return
    setQuestion(''); setLoading(true); setError('')
    const controller = new AbortController(); requestController.current = controller; const requestConversation = conversationId.current
    const params = new URLSearchParams({ question: value }); Object.entries(filters).forEach(([key, item]) => { if (item) params.set(key, item) })
    try { const response = await apiRequest<{ answer: string }>(`/api/v1/analytics/assistant?${params}`, { signal: controller.signal }); if (conversationId.current === requestConversation) setHistory((items) => [...items, { question: value, answer: formatAssistantAnswer(response.answer) }]) } catch { if (!controller.signal.aborted && conversationId.current === requestConversation) setError('Não foi possível consultar os dados deste recorte.') } finally { if (conversationId.current === requestConversation) setLoading(false) }
  }
  return <aside className="ai-assistant" aria-label="Assistente DataClyra AI">
    {open && <section className="ai-assistant-panel" role="dialog" aria-modal="false" aria-label="Conversa com DataClyra AI">
      <header><span><Sparkles size={16} aria-hidden="true" /> DataClyra AI</span><button type="button" onClick={resetConversation} aria-label="Fechar assistente"><X size={18} /></button></header>
      <p className="ai-disclaimer">Demonstração determinística, sem modelo externo. Respeita filtros e escopo regional ativos.</p>
      <div className="ai-history" aria-live="polite">{history.map((item, index) => <article className="ai-response" key={`${item.question}-${index}`}><span>VOCÊ</span><strong>{item.question}</strong><span>RESPOSTA DO RECORTE ATIVO</span><p>{item.answer}</p></article>)}</div>
      {loading && <p className="ai-response" role="status">Analisando o recorte…</p>}{error && <p className="ai-error" role="alert">{error}</p>}
      <div className="ai-suggestions" aria-label="Perguntas sugeridas">{SUGGESTIONS.map((item) => <button type="button" key={item} onClick={() => void ask(item)} disabled={loading}>{item}</button>)}</div>
      <form onSubmit={(event) => { event.preventDefault(); void ask(question) }}><label className="visually-hidden" htmlFor="assistant-question">Pergunta para o DataClyra AI</label><input id="assistant-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Faça uma pergunta…" maxLength={500} disabled={loading} /><button type="submit" disabled={loading || !question.trim()} aria-label="Enviar pergunta"><Send size={16} /></button></form>
    </section>}
    {!open && <button className="ai-launcher" type="button" onClick={() => setOpen(true)} aria-expanded="false" aria-label="Abrir Assistente IA"><Bot size={22} aria-hidden="true" /><span>Assistente IA</span></button>}
  </aside>
}
