export type PracticalAppKey = 'login_form'

export interface BugPreset {
  key: string
  titleEn: string
  titleAr: string
  descriptionEn: string
  descriptionAr: string
  actual_severity: 'Low' | 'Medium' | 'High' | 'Critical'
  bonus_xp: number
}

export interface PracticalAppDefinition<TConfig = Record<string, unknown>> {
  key: PracticalAppKey
  nameEn: string
  nameAr: string
  descriptionEn: string
  descriptionAr: string
  defaultConfig: TConfig
  bugPresets: BugPreset[]
}
