import type { ReactNode } from 'react'

interface PanelProps {
  eyebrow: string
  title: string
  action?: ReactNode
  className?: string
  children: ReactNode
}

function Panel({ eyebrow, title, action, className = '', children }: PanelProps) {
  return (
    <section className={`data-panel ${className}`}>
      <header className="data-panel-header">
        <div>
          <p className="panel-eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}

export default Panel