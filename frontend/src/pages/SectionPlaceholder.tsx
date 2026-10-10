import type { NavigationItem } from '../types/navigation'

interface SectionPlaceholderProps {
  view: NavigationItem
}

function SectionPlaceholder({ view }: SectionPlaceholderProps) {
  return (
    <section className="section-placeholder">
      <p className="eyebrow"><span className="eyebrow-line" /> ÁREA ANALÍTICA</p>
      <div className="section-placeholder-heading">
        <h1>{view.label}<span className="heading-period">.</span></h1>
        <span className="section-index">{view.index}</span>
      </div>
      <div className="section-empty-state">
        <span className="empty-state-index">{view.index} / 03</span>
        <div className="empty-state-rule" />
        <h2>Sem dados carregados</h2>
      </div>
    </section>
  )
}

export default SectionPlaceholder