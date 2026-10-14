export type ViewId = 'overview' | 'commercial' | 'operations' | 'data_quality' | 'ai' | 'lineage' | 'status' | 'catalog'

export interface NavigationItem {
  id: ViewId
  label: string
  index: string
}

export const NAV_ITEMS: NavigationItem[] = [
  { id: 'overview', label: 'Visão Geral', index: '01' },
  { id: 'commercial', label: 'Comercial', index: '02' },
  { id: 'operations', label: 'Operacional', index: '03' },
  { id: 'data_quality', label: 'Qualidade dos Dados', index: '04' },
  { id: 'ai', label: 'DataClyra AI', index: '05' },
  { id: 'lineage', label: 'Linhagem dos Dados', index: '06' },
  { id: 'status', label: 'Status do Sistema', index: '07' },
  { id: 'catalog', label: 'Catálogo de Dados', index: '08' },
]
