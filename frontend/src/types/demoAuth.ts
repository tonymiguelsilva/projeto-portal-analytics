export const DEMO_PROFILE_IDS = [
  'analyst_south',
  'manager_south',
  'manager_southeast',
  'director_all',
  'data_engineer_all',
] as const

export type DemoProfileId = (typeof DEMO_PROFILE_IDS)[number]
export type DemoRole = 'analyst' | 'manager' | 'director' | 'data_engineer'

export interface DemoProfile {
  profile_id: DemoProfileId
  label: string
  role: DemoRole
  region_label: string
}

export interface DemoSessionResponse {
  session_id: string
  expires_in_seconds: number
  profile: DemoProfile
}
