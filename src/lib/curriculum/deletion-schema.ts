import { z } from 'zod'

export const deletionTargetSchema = z.object({ kind: z.enum(['path', 'module', 'lesson']), id: z.string().uuid() }).strict()
export const deletionRequestSchema = deletionTargetSchema.extend({
  confirmation: z.string().min(1).max(140), revision: z.string().regex(/^[a-f0-9]{32}$/),
}).strict()
export type DeletionTarget = z.infer<typeof deletionTargetSchema>
export type DeletionPreview = DeletionTarget & {
  slug: string; title_en: string | null; title_ar: string | null; revision: string
  counts: { paths: number; modules: number; lessons: number; activities: number; activity_attempts: number;
    lesson_progress: number; module_progress: number; path_progress: number; linked_challenges: number; prerequisite_links: number }
}
export type DeletionResult = { backup_id: string; deleted: DeletionPreview['counts'] }
