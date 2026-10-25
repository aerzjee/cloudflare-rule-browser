import React, { useState, useRef, useEffect } from 'react'
import { Check, Loader2, Pencil, X } from 'lucide-react'
import type { NormalizedAccessRule } from '../../types/cloudflare'
import { useTranslation } from '../../i18n/useTranslation'
import { useUpdateAccessRule } from '../../hooks/useUpdateAccessRule'
import { cn } from '../../lib/utils'

export interface InlineNoteEditorProps {
  rule: NormalizedAccessRule
  className?: string
  onUpdate?: (rule: NormalizedAccessRule, notes: string) => Promise<unknown>
}

export const InlineNoteEditor: React.FC<InlineNoteEditorProps> = ({
  rule,
  className,
  onUpdate,
}) => {
  const { t } = useTranslation()
  const { mutateRule } = useUpdateAccessRule()
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(rule.notes || '')
  const [prevNotes, setPrevNotes] = useState(rule.notes)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  // Synchronizacja po aktualizacji z zewnątrz bez cascading effect render
  if (rule.notes !== prevNotes) {
    setPrevNotes(rule.notes)
    if (!isEditing) {
      setText(rule.notes || '')
    }
  }

  // Automatyczny fokus po wejściu w tryb edycji
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
    setError(null)
  }

  const handleCancel = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation()
    setText(rule.notes || '')
    setIsEditing(false)
    setError(null)
  }

  const handleSave = async (e?: React.MouseEvent | React.FormEvent) => {
    e?.stopPropagation()
    if (isSaving) return

    const trimmed = text.trim()

    // Walidacja limitu Cloudflare API (max 500 znaków)
    if (trimmed.length > 500) {
      setError(t.noteEditor.maxChars)
      return
    }

    // Jeśli nic się nie zmieniło, po prostu zamknij
    if (trimmed === (rule.notes || '').trim()) {
      setIsEditing(false)
      setError(null)
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      if (onUpdate) {
        await onUpdate(rule, trimmed)
      } else {
        await mutateRule(rule, { notes: trimmed })
      }
      setIsEditing(false)
    } catch (err) {
      console.error('Błąd zapisu notatki:', err)
      setError(err instanceof Error ? err.message : t.noteEditor.saveError)
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  // Widok edycji: szklany input z przyciskami Zapisz i Anuluj
  if (isEditing) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn('flex flex-col gap-1 w-full max-w-sm', className)}
      >
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={text}
              maxLength={500}
              disabled={isSaving}
              onChange={(e) => {
                setText(e.target.value)
                if (error) setError(null)
              }}
              onKeyDown={handleKeyDown}
              placeholder={t.noteEditor.placeholder}
              className={cn(
                'w-full h-8 px-2.5 py-1 text-xs rounded-lg transition-all duration-200',
                'backdrop-blur-md bg-white/90 dark:bg-slate-900/90',
                'border border-slate-300 dark:border-white/20',
                'text-slate-900 dark:text-slate-100 placeholder:text-slate-400',
                'focus:outline-none focus:ring-1.5 focus:ring-[#f6821f] focus:border-[#f6821f]',
                error && 'border-red-500 focus:ring-red-500'
              )}
            />
            {text.length >= 450 && (
              <span className="absolute right-2 top-2 text-[9px] font-mono text-slate-400 pointer-events-none">
                {text.length}/500
              </span>
            )}
          </div>

          {/* Przycisk Zapisz (Check) */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            title={t.noteEditor.saveTooltip}
            aria-label={t.common.save}
            className={cn(
              'p-1.5 rounded-lg transition-all duration-200 cursor-pointer shrink-0',
              'backdrop-blur-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
              'hover:bg-emerald-500/25 active:scale-95 disabled:opacity-50'
            )}
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            )}
          </button>

          {/* Przycisk Anuluj (X) */}
          <button
            type="button"
            onClick={() => handleCancel()}
            disabled={isSaving}
            title={t.noteEditor.cancelTooltip}
            aria-label={t.common.cancel}
            className={cn(
              'p-1.5 rounded-lg transition-all duration-200 cursor-pointer shrink-0',
              'backdrop-blur-md bg-slate-200/60 dark:bg-slate-800/60 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 border border-slate-300/40 dark:border-white/10',
              'hover:bg-slate-300/60 dark:hover:bg-slate-700/60 active:scale-95'
            )}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {error && (
          <span className="text-[10px] text-red-500 font-medium px-1">
            {error}
          </span>
        )}
      </div>
    )
  }

  // Widok spoczynku: tekst notatki lub placeholder z ikoną ołówka przy hoverze
  return (
    <div
      onClick={handleStartEdit}
      className={cn(
        'group/note flex items-center justify-between gap-2 py-1 px-2 -mx-2 rounded-lg cursor-pointer transition-colors max-w-xs',
        'hover:bg-slate-200/50 dark:hover:bg-slate-800/50',
        className
      )}
      title={t.noteEditor.clickToEdit}
    >
      {rule.notes ? (
        <span className="text-xs text-slate-700 dark:text-slate-300 truncate select-text">
          {rule.notes}
        </span>
      ) : (
        <span className="text-xs text-slate-400/80 italic group-hover/note:text-slate-600 dark:group-hover/note:text-slate-300 transition-colors">
          {t.noteEditor.addNote}
        </span>
      )}

      <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover/note:opacity-100 transition-opacity shrink-0" />
    </div>
  )
}

export default InlineNoteEditor
