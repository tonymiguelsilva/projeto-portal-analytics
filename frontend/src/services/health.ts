import { apiRequest } from './api'
import type { HealthResponse } from '../types/api'

export function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return apiRequest<HealthResponse>('/health', { signal })
}