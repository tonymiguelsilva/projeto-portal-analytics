import { Activity, BarChart3, BookOpen, Bot, Database, GitBranch, LayoutDashboard, LogOut, ServerCog, UserRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NAV_ITEMS } from '../types/navigation'
import type { ViewId } from '../types/navigation'
import type { DemoProfile } from '../types/demoAuth'

interface SidebarProps {
  activeView: ViewId
  onNavigate: (view: ViewId) => void
  identity: DemoProfile
  onLogout: () => void
}

const NAV_ICONS: Record<ViewId, LucideIcon> = {
  overview: LayoutDashboard,
  commercial: BarChart3,
  operations: Activity,
  data_quality: Database,
  ai: Bot,
  lineage: GitBranch,
  status: ServerCog,
  catalog: BookOpen,
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
        <span className="brand-mark" aria-hidden="true" />
        <span className="brand-copy">
          <strong>DataClyra</strong>
          <small>ANALYTICS PLATFORM</small>
        </span>
      </button>

      <div className="sidebar-rule" />
      <p className="sidebar-label">ESPAÇO DE TRABALHO</p>
      <nav className="primary-navigation" aria-label="Seções do portal">
        {NAV_ITEMS.filter((item) => item.id !== 'ai' && (!['data_quality', 'status'].includes(item.id) || identity.role === 'data_engineer')).map((item) => {
          const Icon = NAV_ICONS[item.id]
          return (
            <button
              className={`navigation-item${activeView === item.id ? ' is-active' : ''}`}
              key={item.id}
              type="button"
              aria-current={activeView === item.id ? 'page' : undefined}
              onClick={() => onNavigate(item.id)}
            >
              <span className="navigation-icon">
                <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <span>{item.label}</span>
              {activeView === item.id && <span className="navigation-marker" />}
            </button>
          )
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-account">
          <div className="sidebar-bottom-label">PERFIL ATIVO</div>
          <div className="sidebar-account-identity">
            <span className="sidebar-account-avatar"><UserRound size={16} aria-hidden="true" /></span>
            <span className="sidebar-account-copy">
              <span className="sidebar-account-name">{identity.label}</span>
              <span className="sidebar-account-region">{identity.region_label}</span>
            </span>
          </div>
          <div className="source-chip">
            <span className="source-chip-dot" />
            <span>Demo local</span>
          </div>
          <p className="sidebar-version">DATACLYRA <span>·</span> DEMO</p>
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
