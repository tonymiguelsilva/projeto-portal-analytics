const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 2,
})

const integerFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
})

const decimalFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const compactCurrencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function formatCurrency(value: number | null | undefined): string {
  return value == null ? '—' : currencyFormatter.format(value)
}

export function formatInteger(value: number | null | undefined): string {
  return value == null ? '—' : integerFormatter.format(value)
}

export function formatPercent(value: number | null | undefined): string {
  return value == null ? '—' : `${decimalFormatter.format(value)}%`
}

export function formatDays(value: number | null | undefined): string {
  return value == null ? '—' : `${decimalFormatter.format(value)} dias`
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const parsed = new Date(`${value.slice(0, 10)}T12:00:00`)
  return Number.isNaN(parsed.getTime())
    ? '—'
    : new Intl.DateTimeFormat('pt-BR').format(parsed)
}

export function formatMonth(value: string): string {
  const [year, month] = value.split('-').map(Number)
  const parsed = new Date(year, (month || 1) - 1, 1)
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' })
    .format(parsed)
    .replace('.', '')
}

export function formatVariation(value: number | null): string {
  if (value == null) return 'Sem base comparativa'
  const prefix = value > 0 ? '+' : ''
  return `${prefix}${decimalFormatter.format(value)}% vs. período anterior`
}

export function formatCompactCurrency(value: number): string {
  return compactCurrencyFormatter.format(value)
}