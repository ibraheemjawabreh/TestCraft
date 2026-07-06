import { z } from 'zod'

/**
 * Zod schema for bug report submission.
 * All validation messages are i18n keys resolved on the client.
 */
export const bugReportSchema = z.object({
  title: z
    .string()
    .min(5, 'reportTitleMin')
    .max(140, 'reportTitleMax'),

  steps_to_reproduce: z
    .string()
    .min(20, 'stepsMin')
    .max(3000, 'stepsMax'),

  expected_result: z
    .string()
    .min(10, 'resultMin')
    .max(1500, 'resultMax'),

  actual_result: z
    .string()
    .min(10, 'resultMin')
    .max(1500, 'resultMax'),

  reported_severity: z.enum(['Low', 'Medium', 'High', 'Critical'], {
    required_error: 'severityRequired',
    invalid_type_error: 'severityRequired',
  }),
})

export type BugReportFormValues = z.infer<typeof bugReportSchema>
