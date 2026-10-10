import { ApiError } from '../services/api'
import { InvalidAnalyticsResponseError } from '../services/analytics'

export function getErrorMessage(error: unknown): string {
  if (error instanceof InvalidAnalyticsResponseError) {
    return 'A resposta recebida não corresponde ao contrato da API.'
  }
  if (error instanceof ApiError) {
    if (error.status === 503) return 'A fonte Demo está indisponível no backend.'
    if (error.status >= 500) return error.message || 'O backend encontrou um erro.'
    return error.message
  }
  return 'Não foi possível conectar ao backend. Verifique se a API está em execução.'
}