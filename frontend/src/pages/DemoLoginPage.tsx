import { useEffect, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Check,
  LoaderCircle,
  MapPin,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react'
import {
  DemoSessionStorageError,
  InvalidDemoAuthResponseError,
  listDemoProfiles,
  startDemoSession,
} from '../services/demoAuth'
import { ApiError } from '../services/api'
import type {
  DemoProfile,
  DemoProfileId,
  DemoSessionResponse,
} from '../types/demoAuth'
import '../styles/demo-login.css'

interface DemoLoginPageProps {
  onSessionStarted?: (session: DemoSessionResponse) => void
}

type ProfileLoadState =
  | { status: 'loading' }
  | { status: 'ready'; profiles: DemoProfile[] }
  | { status: 'error'; message: string }

type SubmissionState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; session: DemoSessionResponse }
  | { status: 'error'; message: string }

function getProfileLoadError(error: unknown): string {
  if (error instanceof InvalidDemoAuthResponseError) {
    return 'A lista de perfis recebida não corresponde ao contrato da API.'
  }
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Não foi possível carregar os perfis demonstrativos.'
}

function getSubmissionError(error: unknown): string {
  if (error instanceof DemoSessionStorageError) {
    return 'A sessão foi criada, mas não pôde ser guardada neste navegador. Verifique as permissões de armazenamento.'
  }
  if (error instanceof InvalidDemoAuthResponseError) {
    return 'A resposta de início de sessão não corresponde ao contrato da API.'
  }
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Não foi possível iniciar a sessão demonstrativa.'
}

function roleLabel(role: DemoProfile['role']): string {
  const labels: Record<DemoProfile['role'], string> = {
    analyst: 'Analista',
    manager: 'Gerente',
    director: 'Diretor',
  }
  return labels[role]
}

function profileIcon(role: DemoProfile['role']) {
  if (role === 'director') return Building2
  if (role === 'manager') return BriefcaseBusiness
  return BarChart3
}

function DemoLoginPage({ onSessionStarted }: DemoLoginPageProps) {
  const [profileState, setProfileState] = useState<ProfileLoadState>({ status: 'loading' })
  const [selectedProfileId, setSelectedProfileId] = useState<DemoProfileId | null>(null)
  const [submission, setSubmission] = useState<SubmissionState>({ status: 'idle' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    listDemoProfiles(controller.signal)
      .then((profiles) => {
        if (!controller.signal.aborted) {
          setProfileState({ status: 'ready', profiles })
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setProfileState({ status: 'error', message: getProfileLoadError(error) })
        }
      })

    return () => controller.abort()
  }, [reloadKey])

  const isSubmitting = submission.status === 'submitting'
  const selectedProfile = profileState.status === 'ready'
    ? profileState.profiles.find((profile) => profile.profile_id === selectedProfileId) ?? null
    : null

  const selectProfile = (profileId: DemoProfileId) => {
    if (isSubmitting) return
    setSelectedProfileId(profileId)
    setSubmission({ status: 'idle' })
  }

  const confirmSelection = async () => {
    if (!selectedProfile || isSubmitting) return

    setSubmission({ status: 'submitting' })
    try {
      const session = await startDemoSession(selectedProfile.profile_id)
      setSubmission({ status: 'success', session })
      onSessionStarted?.(session)
    } catch (error) {
      setSubmission({ status: 'error', message: getSubmissionError(error) })
    }
  }

  return (
    <main className="demo-login-page">
      <header className="demo-login-topbar">
        <div className="demo-login-brand" aria-label="DataLens">
          <span className="demo-login-brand-mark" aria-hidden="true">D</span>
          <span className="demo-login-brand-name">DataLens</span>
        </div>
        <span className="demo-login-mode">
          <span className="demo-login-mode-dot" aria-hidden="true" />
          Ambiente demonstrativo
        </span>
      </header>

      <div className="demo-login-content">
        <section className="demo-login-intro" aria-labelledby="demo-login-title">
          <p className="demo-login-eyebrow">
            <span className="demo-login-eyebrow-rule" /> PORTAL WEB ANALÍTICO
          </p>
          <h1 id="demo-login-title">Entre no DataLens<span>.</span></h1>
          <p className="demo-login-description">
            Selecione uma perspectiva para explorar os indicadores do negócio.
          </p>
        </section>

        <section className="demo-profile-section" aria-labelledby="profile-list-title">
          <div className="demo-profile-heading">
            <div>
              <span className="demo-section-index">01 / ACESSO</span>
              <h2 id="profile-list-title">Escolha seu perfil</h2>
            </div>
            {profileState.status === 'ready' && (
              <span className="demo-profile-count">{profileState.profiles.length} perfis disponíveis</span>
            )}
          </div>

          {profileState.status === 'loading' && (
            <div className="demo-profile-loading" role="status" aria-live="polite">
              <LoaderCircle size={19} className="demo-loading-icon" aria-hidden="true" />
              Carregando perfis demonstrativos…
            </div>
          )}

          {profileState.status === 'error' && (
            <div className="demo-profile-error" role="alert">
              <AlertCircle size={19} aria-hidden="true" />
              <span>{profileState.message}</span>
              <button
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
              >
                <RefreshCw size={14} aria-hidden="true" />
                Tentar novamente
              </button>
            </div>
          )}

          {profileState.status === 'ready' && profileState.profiles.length === 0 && (
            <div className="demo-profile-empty" role="status">
              Nenhum perfil demonstrativo está disponível no momento.
            </div>
          )}

          {profileState.status === 'ready' && profileState.profiles.length > 0 && (
            <div className="demo-profile-grid" role="radiogroup" aria-label="Perfis demonstrativos">
              {profileState.profiles.map((profile) => {
                const Icon = profileIcon(profile.role)
                const isSelected = selectedProfileId === profile.profile_id
                return (
                  <button
                    key={profile.profile_id}
                    className={`demo-profile-option${isSelected ? ' is-selected' : ''}`}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={isSubmitting}
                    onClick={() => selectProfile(profile.profile_id)}
                  >
                    <span className="demo-profile-option-top">
                      <span className="demo-profile-icon"><Icon size={19} strokeWidth={1.8} aria-hidden="true" /></span>
                      <span className="demo-profile-check" aria-hidden="true">
                        {isSelected && <Check size={13} strokeWidth={2.5} />}
                      </span>
                    </span>
                    <span className="demo-profile-label">{profile.label}</span>
                    <span className="demo-profile-meta">
                      <span>{roleLabel(profile.role)}</span>
                      <span className="demo-profile-meta-divider">·</span>
                      <span className="demo-profile-region"><MapPin size={12} aria-hidden="true" />{profile.region_label}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <div className="demo-login-confirm-row">
          <div className="demo-login-selection" aria-live="polite">
            {submission.status === 'success' ? (
              <span className="demo-login-success">
                <Check size={15} aria-hidden="true" />
                Sessão iniciada para {submission.session.profile.label} · válida por {Math.ceil(submission.session.expires_in_seconds / 60)} min
              </span>
            ) : selectedProfile ? (
              <span>Selecionado: <strong>{selectedProfile.label}</strong></span>
            ) : (
              <span>Escolha um perfil para continuar.</span>
            )}
          </div>
          <button
            className="demo-login-confirm"
            type="button"
            disabled={!selectedProfile || isSubmitting || profileState.status !== 'ready'}
            onClick={() => void confirmSelection()}
          >
            {isSubmitting ? (
              <><LoaderCircle size={16} className="demo-loading-icon" aria-hidden="true" />Iniciando…</>
            ) : (
              <>Continuar<ArrowRight size={16} aria-hidden="true" /></>
            )}
          </button>
        </div>

        {submission.status === 'error' && (
          <div className="demo-submit-error" role="alert">
            <AlertCircle size={16} aria-hidden="true" />
            {submission.message}
          </div>
        )}

        <aside className="demo-disclaimer">
          <ShieldAlert size={17} aria-hidden="true" />
          <p>
            <strong>Acesso de demonstração.</strong> Não é necessário usar senha. Qualquer visitante pode selecionar qualquer perfil; esta experiência é demonstrativa e não representa autenticação de produção.
          </p>
        </aside>
      </div>

      <footer className="demo-login-footer">
        <span>DATALENS · PORTAL ANALÍTICO</span>
        <span>AMBIENTE LOCAL · DADOS DEMO</span>
      </footer>
    </main>
  )
}

export default DemoLoginPage