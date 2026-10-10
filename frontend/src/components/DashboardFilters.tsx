import { RotateCcw } from 'lucide-react'
import type { AnalyticsFilters, FilterOptionsResponse } from '../types/api'
import { formatDate } from '../utils/format'

interface DashboardFiltersProps {
  options: FilterOptionsResponse | null
  filters: AnalyticsFilters
  loading: boolean
  onChange: (filters: AnalyticsFilters) => void
}

function DashboardFilters({ options, filters, loading, onChange }: DashboardFiltersProps) {
  const update = (key: keyof AnalyticsFilters, value: string) => {
    onChange({ ...filters, [key]: value || undefined })
  }

  const reset = () => onChange({})

  return (
    <section className="filter-bar" aria-label="Filtros do painel">
      <div className="filter-bar-heading">
        <span className="filter-heading-label">FILTRAR POR</span>
        {loading && <span className="filter-loading">Carregando opções…</span>}
      </div>
      <div className="filter-controls">
        <label className="filter-field filter-date-field">
          <span>De</span>
          <input
            type="date"
            value={filters.start_date ?? ''}
            max={filters.end_date || options?.period.end_date || undefined}
            onChange={(event) => update('start_date', event.target.value)}
            aria-label="Data inicial"
          />
        </label>
        <label className="filter-field filter-date-field">
          <span>Até</span>
          <input
            type="date"
            value={filters.end_date ?? ''}
            min={filters.start_date || options?.period.start_date || undefined}
            onChange={(event) => update('end_date', event.target.value)}
            aria-label="Data final"
          />
        </label>
        <label className="filter-field">
          <span>Região</span>
          <select
            value={filters.region ?? ''}
            disabled={!options}
            onChange={(event) => update('region', event.target.value)}
            aria-label="Filtrar por região"
          >
            <option value="">Todas</option>
            {options?.regions.map((region) => <option key={region}>{region}</option>)}
          </select>
        </label>
        <label className="filter-field">
          <span>Canal</span>
          <select
            value={filters.channel ?? ''}
            disabled={!options}
            onChange={(event) => update('channel', event.target.value)}
            aria-label="Filtrar por canal"
          >
            <option value="">Todos</option>
            {options?.channels.map((channel) => <option key={channel}>{channel}</option>)}
          </select>
        </label>
        <label className="filter-field">
          <span>Categoria</span>
          <select
            value={filters.category ?? ''}
            disabled={!options}
            onChange={(event) => update('category', event.target.value)}
            aria-label="Filtrar por categoria"
          >
            <option value="">Todas</option>
            {options?.categories.map((category) => <option key={category}>{category}</option>)}
          </select>
        </label>
        <button className="filter-reset" type="button" onClick={reset} title="Limpar filtros">
          <RotateCcw size={15} aria-hidden="true" />
          <span>Limpar</span>
        </button>
      </div>
      {options?.period.start_date && options.period.end_date && (
        <div className="filter-period-note">
          Período disponível: {formatDate(options.period.start_date)} — {formatDate(options.period.end_date)}
        </div>
      )}
    </section>
  )
}

export default DashboardFilters