export const curriculumMigrationPath = 'supabase/migrations/034_simple_curriculum.sql'
export const curriculumSetupMessage = `Apply ${curriculumMigrationPath} in Supabase SQL Editor, then reload the curriculum page.`

export function isCurriculumSchemaError(error: { code?: string } | null | undefined): boolean {
  return !!error?.code && ['42703', '42883', '42P01', 'PGRST202', 'PGRST204', 'PGRST205'].includes(error.code)
}
