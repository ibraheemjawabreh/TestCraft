'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { LearningPathForm } from '@/components/admin/lessons/learning-path-form'
import { ModuleForm } from '@/components/admin/modules/module-form'
import { LessonForm } from '@/components/admin/lessons/lesson-form'
import type { CurriculumPath } from '@/lib/admin/curriculum'
import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/types'
import type { LearningPathWithLessonCount } from '@/lib/admin/learning-paths'

interface CurriculumModalsProps {
  isOpen: boolean
  onClose: () => void
  modalType: 'path' | 'module' | 'lesson' | 'challenge' | null
  mode: 'create' | 'edit'
  // contextual data: for create, contains { pathId?, moduleId? }
  // for edit, contains the full initialData for the form
  contextData?: any
  paths: CurriculumPath[]
  locale: Locale
  dictionary: Dictionary
  onSuccess: () => void
}

export function CurriculumModals({
  isOpen,
  onClose,
  modalType,
  mode,
  contextData,
  paths,
  locale,
  dictionary,
  onSuccess,
}: CurriculumModalsProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pathsForForms = paths.map((p) => ({
    ...p,
    title: p.title_en || '',
    description: p.description_en || '',
    updated_at: p.created_at, // satisfy type contract
    lessons_count: p.modules.reduce((acc, m) => acc + m.lessons.length, 0),
  })) as unknown as LearningPathWithLessonCount[]

  const handleSuccess = () => {
    onSuccess()
    onClose()
  }

  // For LessonForm: find modules of the relevant path
  const modulesForLesson = paths.find((p) => p.id === contextData?.pathId)?.modules || []

  const modalTitles: Record<string, string> = {
    path: modalType === 'path' ? (mode === 'create' ? 'Create Learning Path' : 'Edit Learning Path') : '',
    module: modalType === 'module' ? (mode === 'create' ? 'Create Module' : 'Edit Module') : '',
    lesson: modalType === 'lesson' ? (mode === 'create' ? 'Create Lesson' : 'Edit Lesson') : '',
    challenge: 'Challenge',
  }

  const modalDesc: Record<string, string> = {
    path: 'Learning paths are the top-level containers for your curriculum.',
    module: 'Modules organize lessons and challenges within a learning path.',
    lesson: 'Lessons contain the educational content learners will study.',
    challenge: 'Challenges are practical exercises for learners.',
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {modalType && modalTitles[modalType]}
          </DialogTitle>
          <DialogDescription>
            {modalType && modalDesc[modalType]}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {modalType === 'path' && (
            <LearningPathForm
              locale={locale}
              dictionary={dictionary}
              initialData={mode === 'edit' ? contextData : undefined}
              onSuccess={handleSuccess}
            />
          )}

          {modalType === 'module' && (
            <ModuleForm
              locale={locale}
              paths={pathsForForms}
              initialData={
                mode === 'edit'
                  ? { ...contextData, learning_path_id: contextData.pathId || contextData.learning_path_id }
                  : undefined
              }
              onSuccess={handleSuccess}
              // Pre-select the path when creating inside a path
              defaultPathId={mode === 'create' ? contextData?.pathId : undefined}
            />
          )}

          {modalType === 'lesson' && (
            <LessonForm
              locale={locale}
              dictionary={dictionary}
              paths={pathsForForms}
              modules={modulesForLesson as any[]}
              initialData={mode === 'edit' ? contextData : undefined}
              onSuccess={handleSuccess}
              defaultPathId={mode === 'create' ? contextData?.pathId : undefined}
              defaultModuleId={mode === 'create' ? contextData?.moduleId : undefined}
            />
          )}

          {modalType === 'challenge' && (
            <div className="p-6 text-center text-muted-foreground border border-dashed rounded-lg">
              <p className="text-sm">Challenge creation coming soon.</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
