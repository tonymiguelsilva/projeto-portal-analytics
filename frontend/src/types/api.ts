export interface HealthResponse {
  status: string
  message: string
}

export type OrderStatus = 'delivered' | 'shipped' | 'pending' | 'cancelled'
export type SalesDimension = 'region' | 'channel' | 'category'

export interface AnalyticsFilters {
  start_date?: string
  end_date?: string
  region?: string
  channel?: string
  category?: string
}

export interface AnalyticsPeriod {
  start_date: string | null
  end_date: string | null
}

export interface AnalyticsMetrics {
  total_order_count: number
  valid_order_count: number
  cancelled_order_count: number
  units_sold: number
  net_revenue: number
  average_ticket: number | null
  gross_profit: number
  gross_margin_pct: number | null
  cancellation_rate_pct: number | null
  on_time_delivery_rate_pct: number | null
  average_delivery_days: number | null
  open_order_count: number
}

export interface OverviewResponse {
  period: AnalyticsPeriod
  metrics: AnalyticsMetrics
  variation_pct: {
    net_revenue: number | null
    valid_order_count: number | null
    gross_profit: number | null
  }
}

export interface TrendItem extends AnalyticsMetrics {
  month: string
}

export interface TrendsResponse {
  period: AnalyticsPeriod
  items: TrendItem[]
}

export interface SalesItem extends AnalyticsMetrics {
  value: string
}

export interface SalesResponse {
  period: AnalyticsPeriod
  dimension: SalesDimension
  items: SalesItem[]
}

export interface OperationsResponse {
  period: AnalyticsPeriod
  metrics: {
    total_order_count: number
    cancelled_order_count: number
    cancellation_rate_pct: number | null
    delivered_order_count: number
    on_time_delivery_rate_pct: number | null
    average_delivery_days: number | null
    open_order_count: number
  }
}

export interface QualityRuleResult {
  valid_record_count: number
  invalid_record_count: number
  valid_pct: number | null
}

export interface DataQualityResponse {
  period: AnalyticsPeriod
  records_evaluated: number
  duplicate_order_ids: number
  duplicate_order_id_pct: number | null
  required_fields: {
    field_count: number
    values_populated: number
    values_expected: number
    completeness_pct: number | null
  }
  units: QualityRuleResult
  monetary_values: QualityRuleResult
  temporal_consistency: QualityRuleResult
  status_distribution: Array<{
    status: OrderStatus
    record_count: number
    percentage: number | null
  }>
}

export interface FilterOptionsResponse {
  period: AnalyticsPeriod
  regions: string[]
  channels: string[]
  categories: string[]
  statuses: OrderStatus[]
}

export interface OrderDetailResponse {
  order_id: string
  order_date: string
  region: string
  sales_channel: string
  product_category: string
  customer_segment: string
  units: number
  gross_revenue: number
  discount_amount: number
  cost_amount: number
  status: OrderStatus
  promised_delivery_date: string
  shipped_at: string | null
  delivered_at: string | null
  net_revenue: number
  gross_profit: number
}
