import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string
  detail?: string
  icon: LucideIcon
  tone?: 'forest' | 'lime' | 'coral' | 'blue'
  loading?: boolean
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'forest',
  loading = false,
}: MetricCardProps) {
  return (
    <article className={`metric-card metric-card--${tone}`} aria-busy={loading}>
      <div className="metric-card-top">
        <span>{label}</span>
        <span className="metric-icon"><Icon size={16} strokeWidth={1.8} aria-hidden="true" /></span>
      </div>
      {loading ? (
        <div className="metric-skeleton" />
      ) : (
        <strong className="metric-value">{value}</strong>
      )}
      <span className="metric-detail">{loading ? 'Buscando dados…' : detail || '\u00a0'}</span>
    </article>
  )
}

export default MetricCard