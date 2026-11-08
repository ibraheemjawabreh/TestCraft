export const curriculumDownloadNames = {
  schema: 'curriculum-schema.json',
  example: 'curriculum-example.json',
  export: 'testcraft-curriculum.json',
  backup: 'testcraft-curriculum-backup.json',
} as const

export type CurriculumDownload = keyof typeof curriculumDownloadNames

export function curriculumJSONDownload(value: unknown, file: CurriculumDownload) {
  return new Response(JSON.stringify(value, null, 2) + '\n', {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${curriculumDownloadNames[file]}"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
