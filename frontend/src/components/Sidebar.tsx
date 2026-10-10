import { NAV_ITEMS } from '../types/navigation'
import type { ViewId } from '../types/navigation'
import { LogOut } from 'lucide-react'
import type { DemoProfile } from '../types/demoAuth'

interface SidebarProps {
  activeView: ViewId
  onNavigate: (view: ViewId) => void
  identity: DemoProfile
  onLogout: () => void
}

function Sidebar({ activeView, onNavigate, identity, onLogout }: SidebarProps) {
  return (
    <aside className="sidebar">
      <button
        className="brand"
        type="button"
        aria-label="Ir para visão geral"
        onClick={() => onNavigate('overview')}
      >
        <span className="brand-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span className="brand-copy">
          <strong>NEXO</strong>
          <small>PORTAL ANALÍTICO</small>
        </span>
      </button>

      <div className="sidebar-rule" />
      <p className="sidebar-label">ESPAÇO DE TRABALHO</p>
      <nav className="primary-navigation" aria-label="Seções do portal">
        {NAV_ITEMS.map((item) => (
          <button
            className={`navigation-item${activeView === item.id ? ' is-active' : ''}`}
            key={item.id}
            type="button"
            aria-current={activeView === item.id ? 'page' : undefined}
            onClick={() => onNavigate(item.id)}
          >
            <span className="navigation-index">{item.index}</span>
            <span>{item.label}</span>
            {activeView === item.id && <span className="navigation-marker" />}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-account">
          <div className="sidebar-bottom-label">PERFIL ATIVO</div>
          <div className="sidebar-account-name">{identity.label}</div>
          <div className="sidebar-account-region">{identity.region_label}</div>
          <div className="source-chip">
            <span className="source-chip-dot" />
            <span>Demo local</span>
          </div>
          <p className="sidebar-version">PORTAL ANALÍTICO <span>·</span> 0.1</p>
        </div>
        <button
          className="sidebar-logout"
          type="button"
          onClick={onLogout}
          title="Encerrar sessão Demo"
        >
          <LogOut size={15} aria-hidden="true" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar