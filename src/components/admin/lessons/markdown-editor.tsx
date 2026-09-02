'use client'

import { useRef, useCallback } from 'react'
import {
  Bold,
  Italic,
  Heading2,
  List,
  ListOrdered,
  Code2,
  Quote,
  Link2,
  FileText,
  Minus,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const LESSON_TEMPLATE = `## Summary

Write a brief summary of this lesson (2–3 sentences).

## Learning Objectives

- Objective 1
- Objective 2
- Objective 3

## Why This Lesson Matters

Explain why this topic is important for QA engineers.

## Main Explanation

Write the core lesson content here.

### Example

Add a concrete example.

## Deep Explanation

Expand on the topic with more depth.

## Real-world Example

Describe a real QA scenario where this applies.

## Common Beginner Mistakes

- Mistake 1
- Mistake 2
- Mistake 3

## Mini Practice

Describe a small activity or reflection question for the learner.

## Key Takeaways

- Takeaway 1
- Takeaway 2
- Takeaway 3

## Connection to Next Lesson

Briefly explain what the learner will study next and how it builds on this lesson.
`

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  dir?: 'ltr' | 'rtl'
  placeholder?: string
  disabled?: boolean
  label?: string
}

interface ToolbarAction {
  icon: React.ComponentType<{ className?: string }>
  title: string
  action: (text: string, selStart: number, selEnd: number) => { newText: string; newCursor: number }
}

function wrapSelection(
  text: string,
  selStart: number,
  selEnd: number,
  before: string,
  after: string,
  defaultText = 'text',
): { newText: string; newCursor: number } {
  const selected = text.slice(selStart, selEnd) || defaultText
  const newText = text.slice(0, selStart) + before + selected + after + text.slice(selEnd)
  const newCursor = selStart + before.length + selected.length + after.length
  return { newText, newCursor }
}

function insertAtLineStart(
  text: string,
  selStart: number,
  prefix: string,
): { newText: string; newCursor: number } {
  const lineStart = text.lastIndexOf('\n', selStart - 1) + 1
  const newText = text.slice(0, lineStart) + prefix + text.slice(lineStart)
  const newCursor = selStart + prefix.length
  return { newText, newCursor }
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  {
    icon: Heading2,
    title: 'Heading (##)',
    action: (text, selStart) =>
      insertAtLineStart(text, selStart, '## '),
  },
  {
    icon: Bold,
    title: 'Bold',
    action: (text, selStart, selEnd) =>
      wrapSelection(text, selStart, selEnd, '**', '**', 'bold text'),
  },
  {
    icon: Italic,
    title: 'Italic',
    action: (text, selStart, selEnd) =>
      wrapSelection(text, selStart, selEnd, '*', '*', 'italic text'),
  },
  {
    icon: List,
    title: 'Bullet List',
    action: (text, selStart) =>
      insertAtLineStart(text, selStart, '- '),
  },
  {
    icon: ListOrdered,
    title: 'Numbered List',
    action: (text, selStart) =>
      insertAtLineStart(text, selStart, '1. '),
  },
  {
    icon: Code2,
    title: 'Code Block',
    action: (text, selStart, selEnd) =>
      wrapSelection(text, selStart, selEnd, '```\n', '\n```', 'code here'),
  },
  {
    icon: Quote,
    title: 'Blockquote',
    action: (text, selStart) =>
      insertAtLineStart(text, selStart, '> '),
  },
  {
    icon: Link2,
    title: 'Link',
    action: (text, selStart, selEnd) =>
      wrapSelection(text, selStart, selEnd, '[', '](url)', 'link text'),
  },
  {
    icon: Minus,
    title: 'Horizontal Rule',
    action: (text, selStart) => {
      const newText = text.slice(0, selStart) + '\n---\n' + text.slice(selStart)
      return { newText, newCursor: selStart + 5 }
    },
  },
]

export function MarkdownEditor({
  value,
  onChange,
  dir = 'ltr',
  placeholder,
  disabled = false,
  label,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const applyAction = useCallback(
    (action: ToolbarAction['action']) => {
      const textarea = textareaRef.current
      if (!textarea) return

      const selStart = textarea.selectionStart
      const selEnd = textarea.selectionEnd

      const { newText, newCursor } = action(value, selStart, selEnd)
      onChange(newText)

      // Restore cursor position after React re-renders
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.setSelectionRange(newCursor, newCursor)
        }
      })
    },
    [value, onChange],
  )

  const handleInsertTemplate = () => {
    if (value.trim()) {
      const confirmed = window.confirm(
        'The editor already has content. Replace it with the standard lesson template?',
      )
      if (!confirmed) return
    }
    onChange(LESSON_TEMPLATE)
  }

  const charCount = value.length
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0

  return (
    <div className="flex flex-col h-full">
      {/* Label */}
      {label && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
          <span className="text-xs text-muted-foreground">
            {wordCount.toLocaleString()} words · {charCount.toLocaleString()} chars
          </span>
        </div>
      )}

      {/* Editor card */}
      <div className="flex flex-col flex-1 rounded-xl border border-border/60 bg-background/60 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border/40 bg-secondary/30 flex-wrap">
          {TOOLBAR_ACTIONS.map((action) => (
            <button
              key={action.title}
              type="button"
              title={action.title}
              onClick={() => applyAction(action.action)}
              disabled={disabled}
              className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-40"
            >
              <action.icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">{action.title}</span>
            </button>
          ))}

          <div className="w-px h-4 bg-border/60 mx-1 hidden sm:block" />

          {/* Template button */}
          <button
            type="button"
            onClick={handleInsertTemplate}
            disabled={disabled}
            className={cn(
              'flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors disabled:opacity-40',
              'text-primary/80 hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/20',
            )}
          >
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Insert Template</span>
            <span className="sm:hidden">Template</span>
          </button>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            placeholder ??
            (dir === 'rtl'
              ? 'اكتب أو الصق محتوى الدرس هنا بصيغة Markdown...'
              : 'Write or paste lesson content here in Markdown...')
          }
          dir={dir}
          disabled={disabled}
          className={cn(
            'flex-1 min-h-[420px] w-full resize-none bg-transparent px-4 py-3',
            'text-sm text-foreground placeholder:text-muted-foreground/50',
            'focus:outline-none font-mono leading-relaxed',
            'disabled:opacity-50',
            dir === 'rtl' && 'text-right',
          )}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />
      </div>
    </div>
  )
}
