'use client'

import { useEffect, useRef } from 'react'

export function LessonOpenTracker({ lessonId, hasProgress }: { lessonId: string; hasProgress: boolean }) {
  const sent = useRef(false)
  useEffect(() => {
    const track = () => {
      if (sent.current || document.visibilityState !== 'visible') return
      sent.current = true
      // Lesson reads/prefetches never write progress. Track only a displayed page.
      void fetch('/api/academy/lesson-open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, hasProgress }),
        keepalive: true,
      }).catch(() => {
        // The next real visit can retry. Completion is a separate, explicit action.
      })
    }
    track()
    document.addEventListener('visibilitychange', track)
    return () => document.removeEventListener('visibilitychange', track)
  }, [lessonId, hasProgress])
  return null
}
