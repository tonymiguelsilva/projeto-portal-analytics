export type ViewId = 'overview' | 'commercial' | 'operations'

export interface NavigationItem {
  id: ViewId
  label: string
  index: string
}

export const NAV_ITEMS: NavigationItem[] = [
  { id: 'overview', label: 'Visão Geral', index: '01' },
  { id: 'commercial', label: 'Comercial', index: '02' },
  { id: 'operations', label: 'Operacional', index: '03' },
]