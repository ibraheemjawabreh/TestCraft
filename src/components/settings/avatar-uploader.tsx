'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Upload, Loader2, Image as ImageIcon } from 'lucide-react'
import { uploadAvatar } from '@/lib/settings/avatar'
import type { Dictionary } from '@/i18n/types'

interface AvatarUploaderProps {
  currentAvatarUrl: string | null
  dictionary: Dictionary
  onUploadSuccess: (url: string) => void
}

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function AvatarUploader({
  currentAvatarUrl,
  dictionary,
  onUploadSuccess,
}: AvatarUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setErrorMsg(null)

    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrorMsg(dictionary.settings.avatarInvalidType)
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrorMsg(dictionary.settings.avatarTooLarge)
      return
    }

    setIsUploading(true)

    try {
      const result = await uploadAvatar(file)

      if (result.error) {
        setErrorMsg(dictionary.settings.avatarUploadFailed)
      } else if (result.data) {
        onUploadSuccess(result.data.url)
      }
    } catch {
      setErrorMsg(dictionary.settings.somethingWentWrong)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative shrink-0">
        {currentAvatarUrl ? (
          <Image
            src={currentAvatarUrl}
            alt="Avatar"
            width={96}
            height={96}
            className="h-24 w-24 rounded-full object-cover ring-4 ring-primary/20"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-secondary/80 ring-4 ring-primary/20">
            <ImageIcon className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
          </div>
        )}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/50 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>

      <div className="flex flex-col items-center sm:items-start gap-3">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/jpeg, image/png, image/webp"
          className="hidden"
          aria-hidden="true"
        />
        <div className="flex flex-wrap items-center gap-3 justify-center sm:justify-start">
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            {dictionary.settings.uploadAvatar}
          </button>
        </div>
        <p className="text-xs text-muted-foreground max-w-xs text-center sm:text-start leading-relaxed">
          JPEG, PNG, or WebP. Max size 2 MB.
        </p>

        {errorMsg && (
          <p className="text-sm font-medium text-destructive mt-1" role="alert">
            {errorMsg}
          </p>
        )}
      </div>
    </div>
  )
}
