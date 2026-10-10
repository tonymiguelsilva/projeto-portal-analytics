import { apiRequest } from './api'
import type {
  AnalyticsFilters,
  AnalyticsMetrics,
  AnalyticsPeriod,
  FilterOptionsResponse,
  OperationsResponse,
  OrderDetailResponse,
  OrderStatus,
  OverviewResponse,
  SalesDimension,
  SalesResponse,
  TrendItem,
  TrendsResponse,
} from '../types/api'

export class InvalidAnalyticsResponseError extends Error {
  constructor(endpoint: string) {
    super(`A API retornou dados inválidos em ${endpoint}.`)
    this.name = 'InvalidAnalyticsResponseError'
  }
}

type JsonRecord = Record<string, unknown>
type Validator<T> = (value: unknown, endpoint: string) => T

function asRecord(value: unknown, endpoint: string): JsonRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new InvalidAnalyticsResponseError(endpoint)
  }
  return value as JsonRecord
}

function asString(value: unknown, endpoint: string): string {
  if (typeof value !== 'string') throw new InvalidAnalyticsResponseError(endpoint)
  return value
}

function asNumber(value: unknown, endpoint: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  throw new InvalidAnalyticsResponseError(endpoint)
}

function asNullableNumber(value: unknown, endpoint: string): number | null {
  return value === null ? null : asNumber(value, endpoint)
}

function asStringArray(value: unknown, endpoint: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new InvalidAnalyticsResponseError(endpoint)
  }
  return value
}

function parsePeriod(value: unknown, endpoint: string): AnalyticsPeriod {
  const period = asRecord(value, endpoint)
  const start = period.start_date
  const end = period.end_date
  if ((start !== null && typeof start !== 'string') || (end !== null && typeof end !== 'string')) {
    throw new InvalidAnalyticsResponseError(endpoint)
  }
  return { start_date: start, end_date: end }
}

function parseMetrics(value: unknown, endpoint: string): AnalyticsMetrics {
  const metrics = asRecord(value, endpoint)
  return {
    total_order_count: asNumber(metrics.total_order_count, endpoint),
    valid_order_count: asNumber(metrics.valid_order_count, endpoint),
    cancelled_order_count: asNumber(metrics.cancelled_order_count, endpoint),
    units_sold: asNumber(metrics.units_sold, endpoint),
    net_revenue: asNumber(metrics.net_revenue, endpoint),
    average_ticket: asNullableNumber(metrics.average_ticket, endpoint),
    gross_profit: asNumber(metrics.gross_profit, endpoint),
    gross_margin_pct: asNullableNumber(metrics.gross_margin_pct, endpoint),
    cancellation_rate_pct: asNullableNumber(metrics.cancellation_rate_pct, endpoint),
    on_time_delivery_rate_pct: asNullableNumber(metrics.on_time_delivery_rate_pct, endpoint),
    average_delivery_days: asNullableNumber(metrics.average_delivery_days, endpoint),
    open_order_count: asNumber(metrics.open_order_count, endpoint),
  }
}

function parseOverview(value: unknown, endpoint: string): OverviewResponse {
  const result = asRecord(value, endpoint)
  const variation = asRecord(result.variation_pct, endpoint)
  return {
    period: parsePeriod(result.period, endpoint),
    metrics: parseMetrics(result.metrics, endpoint),
    variation_pct: {
      net_revenue: asNullableNumber(variation.net_revenue, endpoint),
      valid_order_count: asNullableNumber(variation.valid_order_count, endpoint),
      gross_profit: asNullableNumber(variation.gross_profit, endpoint),
    },
  }
}

function parseTrends(value: unknown, endpoint: string): TrendsResponse {
  const result = asRecord(value, endpoint)
  if (!Array.isArray(result.items)) throw new InvalidAnalyticsResponseError(endpoint)
  const items: TrendItem[] = result.items.map((entry) => {
    const item = asRecord(entry, endpoint)
    return { month: asString(item.month, endpoint), ...parseMetrics(item, endpoint) }
  })
  return { period: parsePeriod(result.period, endpoint), items }
}

function parseSales(value: unknown, endpoint: string): SalesResponse {
  const result = asRecord(value, endpoint)
  const dimension = result.dimension
  if (!['region', 'channel', 'category'].includes(String(dimension)) || !Array.isArray(result.items)) {
    throw new InvalidAnalyticsResponseError(endpoint)
  }
  const items = result.items.map((entry) => {
    const item = asRecord(entry, endpoint)
    return { value: asString(item.value, endpoint), ...parseMetrics(item, endpoint) }
  })
  return {
    period: parsePeriod(result.period, endpoint),
    dimension: dimension as SalesDimension,
    items,
  }
}

function parseOperations(value: unknown, endpoint: string): OperationsResponse {
  const result = asRecord(value, endpoint)
  const metrics = asRecord(result.metrics, endpoint)
  return {
    period: parsePeriod(result.period, endpoint),
    metrics: {
      total_order_count: asNumber(metrics.total_order_count, endpoint),
      cancelled_order_count: asNumber(metrics.cancelled_order_count, endpoint),
      cancellation_rate_pct: asNullableNumber(metrics.cancellation_rate_pct, endpoint),
      delivered_order_count: asNumber(metrics.delivered_order_count, endpoint),
      on_time_delivery_rate_pct: asNullableNumber(metrics.on_time_delivery_rate_pct, endpoint),
      average_delivery_days: asNullableNumber(metrics.average_delivery_days, endpoint),
      open_order_count: asNumber(metrics.open_order_count, endpoint),
    },
  }
}

function parseFilters(value: unknown, endpoint: string): FilterOptionsResponse {
  const result = asRecord(value, endpoint)
  const statuses = asStringArray(result.statuses, endpoint)
  const allowedStatuses: OrderStatus[] = ['delivered', 'shipped', 'pending', 'cancelled']
  if (statuses.some((status) => !allowedStatuses.includes(status as OrderStatus))) {
    throw new InvalidAnalyticsResponseError(endpoint)
  }
  return {
    period: parsePeriod(result.period, endpoint),
    regions: asStringArray(result.regions, endpoint),
    channels: asStringArray(result.channels, endpoint),
    categories: asStringArray(result.categories, endpoint),
    statuses: statuses as OrderStatus[],
  }
}

function parseOrder(value: unknown, endpoint: string): OrderDetailResponse {
  const order = asRecord(value, endpoint)
  const status = asString(order.status, endpoint)
  const allowedStatuses: OrderStatus[] = ['delivered', 'shipped', 'pending', 'cancelled']
  if (!allowedStatuses.includes(status as OrderStatus)) {
    throw new InvalidAnalyticsResponseError(endpoint)
  }
  const nullableString = (field: unknown) =>
    field === null ? null : asString(field, endpoint)
  return {
    order_id: asString(order.order_id, endpoint),
    order_date: asString(order.order_date, endpoint),
    region: asString(order.region, endpoint),
    sales_channel: asString(order.sales_channel, endpoint),
    product_category: asString(order.product_category, endpoint),
    customer_segment: asString(order.customer_segment, endpoint),
    units: asNumber(order.units, endpoint),
    gross_revenue: asNumber(order.gross_revenue, endpoint),
    discount_amount: asNumber(order.discount_amount, endpoint),
    cost_amount: asNumber(order.cost_amount, endpoint),
    status: status as OrderStatus,
    promised_delivery_date: asString(order.promised_delivery_date, endpoint),
    shipped_at: nullableString(order.shipped_at),
    delivered_at: nullableString(order.delivered_at),
    net_revenue: asNumber(order.net_revenue, endpoint),
    gross_profit: asNumber(order.gross_profit, endpoint),
  }
}

function buildQuery(filters: AnalyticsFilters, extra?: Record<string, string>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value)
  }
  for (const [key, value] of Object.entries(extra ?? {})) params.set(key, value)
  const query = params.toString()
  return query ? `?${query}` : ''
}

async function getValidated<T>(
  path: string,
  validator: Validator<T>,
  signal?: AbortSignal,
): Promise<T> {
  const payload = await apiRequest<unknown>(path, { signal })
  return validator(payload, path.split('?')[0])
}

export function fetchOverview(filters: AnalyticsFilters, signal?: AbortSignal) {
  return getValidated(
    `/api/v1/analytics/overview${buildQuery(filters)}`,
    parseOverview,
    signal,
  )
}

export function fetchTrends(filters: AnalyticsFilters, signal?: AbortSignal) {
  return getValidated(
    `/api/v1/analytics/trends${buildQuery(filters)}`,
    parseTrends,
    signal,
  )
}

export function fetchSales(
  filters: AnalyticsFilters,
  dimension: SalesDimension,
  signal?: AbortSignal,
) {
  return getValidated(
    `/api/v1/analytics/sales${buildQuery(filters, { dimension })}`,
    parseSales,
    signal,
  )
}

export function fetchOperations(filters: AnalyticsFilters, signal?: AbortSignal) {
  return getValidated(
    `/api/v1/analytics/operations${buildQuery(filters)}`,
    parseOperations,
    signal,
  )
}

export function fetchFilterOptions(signal?: AbortSignal) {
  return getValidated('/api/v1/analytics/filters', parseFilters, signal)
}

export function fetchOrderDetail(orderId: string, signal?: AbortSignal) {
  const path = `/api/v1/analytics/orders/${encodeURIComponent(orderId)}`
  return getValidated(path, parseOrder, signal)
}