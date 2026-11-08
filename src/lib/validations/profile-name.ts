import { z } from 'zod'

export const displayNameSchema = z.string().trim().refine((value) => {
  const length = [...value].length
  return length >= 2 && length <= 80 && /[\p{L}\p{N}]/u.test(value) && !/[\p{Cc}\p{Cf}]/u.test(value)
}, 'displayNameInvalid')
