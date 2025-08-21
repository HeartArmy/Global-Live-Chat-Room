'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import type ReactQuillType from 'react-quill'
import type { ReactQuillProps, UnprivilegedEditor } from 'react-quill'
import type Quill from 'quill'
import type React from 'react'
import { motion } from 'framer-motion'
import { Send, Smile, Image as ImageIcon, X, Bold, Italic, Underline, Type, Link2 } from 'lucide-react'

import { ReplyInfo } from '@/types/chat'

// Quill bubble theme styles are imported globally in app/globals.css
const ReactQuill = dynamic(
  () => import('react-quill-new'),
  { ssr: false }
) as unknown as React.ForwardRefExoticComponent<ReactQuillProps & React.RefAttributes<ReactQuillType>>

interface ChatInputProps {
  onSendMessage: (message: string, reply?: ReplyInfo, html?: string) => void
  disabled?: boolean
  replyTo?: ReplyInfo
  onCancelReply?: () => void
  onTyping?: (isTyping: boolean) => void
}

const funnyPlaceholders = [
  "Say hello to the world! 🌍",
  "Share something interesting...",
  "What's on your mind?",
  "Tell us about your day!",
  "Drop some wisdom here...",
  "You kids should be studying instead of chatting on your Chromebooks 📚",
  "Type something awesome!",
  "Connect with humans worldwide...",
  "Share a thought, make a friend!",
  "What's happening in your corner of the world?"
]

export default function ChatInput({ onSendMessage, disabled, replyTo, onCancelReply, onTyping }: ChatInputProps) {
  const [plainText, setPlainText] = useState('')
  const [html, setHtml] = useState('')
  const [currentPlaceholder, setCurrentPlaceholder] = useState(funnyPlaceholders[0])
  const [showPicker, setShowPicker] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showPasteHint, setShowPasteHint] = useState(false)
  const [showLinkPopover, setShowLinkPopover] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')
  const [linkError, setLinkError] = useState<string | null>(null)
  const quillRef = useRef<ReactQuillType | null>(null)
  const pickerRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  // Remember cursor when opening link popover so we can insert at the right spot
  const lastSelectionRef = useRef<{ index: number; length: number } | null>(null)
  // Typing timers
  const typingIdleTimerRef = useRef<number | null>(null)
  const [isIOSMobile, setIsIOSMobile] = useState(false)

  // Detect iOS mobile once on mount
  useEffect(() => {
    try {
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : ''
      const isIOS = /iPhone|iPad|iPod/.test(ua)
      const isMobile = /Mobile|iPhone|iPod|Android|BlackBerry|IEMobile|Silk/.test(ua)
      setIsIOSMobile(isIOS && isMobile)
    } catch {
      setIsIOSMobile(false)
    }
  }, [])

  const MAX_SIZE_BYTES = 1 * 1024 * 1024 // 1 MB
  const MAX_CHARS = 2000
  const ACCEPT_TYPES = [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
  ]

  const validateFile = (file: File) => {
    if (!ACCEPT_TYPES.includes(file.type)) {
      alert('Only PNG, JPEG, WEBP, or GIF images are allowed.')
      return false
    }
    if (file.size > MAX_SIZE_BYTES) {
      alert('Image is too large. Max size is 1 MB.')
      return false
    }
    return true
  }

  // Helpers for link popover
  const sanitizeAndValidateUrl = (raw: string): { ok: boolean; href?: string; error?: string } => {
    const trimmed = raw.trim()
    if (!trimmed) return { ok: false, error: 'Enter a URL' }
    // Disallow dangerous schemes
    if (/^\s*(javascript:|data:)/i.test(trimmed)) return { ok: false, error: 'Unsupported URL scheme' }
    // Require a dot in the hostname (simple TLD check)
    const withProto = /^(https?:)?\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    try {
      const u = new URL(withProto)
      if (!/\./.test(u.hostname)) return { ok: false, error: 'URL must include a domain (e.g., example.com)' }
      return { ok: true, href: u.toString() }
    } catch {
      return { ok: false, error: 'Invalid URL' }
    }
  }

  const insertLinkIntoEditor = (href: string, display: string) => {
    const q: Quill | null = quillRef.current && (quillRef.current as unknown as ReactQuillType).getEditor ? (quillRef.current as unknown as ReactQuillType).getEditor() as Quill : null
    if (!q) return
    // Restore last known selection if available (opening the popover blurs the editor)
    const remembered = lastSelectionRef.current
    if (remembered) {
      q.focus()
      q.setSelection(remembered.index, remembered.length, 'user')
    }
    const sel = remembered || q.getSelection(true)
    const text = display && display.trim().length ? display : href
    if (sel && sel.length > 0) {
      // Format existing selection as link
      q.format('link', href)
    } else {
      const index = sel ? sel.index : q.getLength()
      q.insertText(index, text, 'user')
      q.formatText(index, text.length, 'link', href, 'user')
      q.setSelection(index + text.length, 0, 'user')
    }
    q.focus()
    // Clear remembered selection
    lastSelectionRef.current = null
  }

  // Quill modules and formats (conditional Enter behavior)
  const modules: ReactQuillProps['modules'] = useMemo(() => {
    type KeyboardHandler = {
      key: string | number
      shortKey?: boolean
      shiftKey?: boolean
      handler: () => boolean
    }
    type KeyboardBindings = Record<string, KeyboardHandler>
    const bindings: KeyboardBindings = {
      // Sending via Ctrl/Cmd+Enter is always available
      sendWithCmdOrCtrlEnter: {
        key: 'Enter',
        shortKey: true,
        handler: () => {
          const form = document.getElementById('chat-input-form') as HTMLFormElement | null
          form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
          return false
        }
      },
      // Undo Cmd/Ctrl+Z
      undo: {
        key: 'Z', shortKey: true, shiftKey: false,
        handler: () => {
          const q: Quill | null = quillRef.current && (quillRef.current as unknown as ReactQuillType).getEditor ? (quillRef.current as unknown as ReactQuillType).getEditor() as Quill : null
          // @ts-expect-error history module
          q?.history?.undo?.(); return false
        }
      },
      // Redo Cmd/Ctrl+Shift+Z
      redo: {
        key: 'Z', shortKey: true, shiftKey: true,
        handler: () => {
          const q: Quill | null = quillRef.current && (quillRef.current as unknown as ReactQuillType).getEditor ? (quillRef.current as unknown as ReactQuillType).getEditor() as Quill : null
          // @ts-expect-error history module
          q?.history?.redo?.(); return false
        }
      },
      // Redo Ctrl+Y (Windows/Linux)
      redoCtrlY: {
        key: 'Y', shortKey: true, shiftKey: false,
        handler: () => {
          const q: Quill | null = quillRef.current && (quillRef.current as unknown as ReactQuillType).getEditor ? (quillRef.current as unknown as ReactQuillType).getEditor() as Quill : null
          // @ts-expect-error history module
          q?.history?.redo?.(); return false
        }
      },
      // Insert Link: Cmd/Ctrl+K
      insertLink: {
        key: 'K', shortKey: true, shiftKey: false,
        handler: () => {
          if (disabled) return false
          const q: Quill | null = quillRef.current && (quillRef.current as unknown as ReactQuillType).getEditor ? (quillRef.current as unknown as ReactQuillType).getEditor() as Quill : null
          const sel = q?.getSelection()
          if (q) {
            lastSelectionRef.current = sel ? { index: sel.index, length: sel.length } : { index: q.getLength(), length: 0 }
          }
          const selectedText = sel && sel.length ? q?.getText(sel.index, sel.length) || '' : ''
          setLinkText((selectedText || '').trim())
          setLinkUrl('')
          setLinkError(null)
          setShowLinkPopover(true)
          return false
        }
      }
    }

    // On desktop (non-iOS mobile), Enter submits like before
    if (!isIOSMobile) {
      bindings.handleEnter = {
        key: 'Enter', shiftKey: false,
        handler: () => {
          const form = document.getElementById('chat-input-form') as HTMLFormElement | null
          form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
          return false
        }
      }
    }

    return {
      toolbar: false,
      history: { delay: 500, maxStack: 200, userOnly: true },
      keyboard: { bindings }
    }
  }, [disabled, isIOSMobile])

  // Editor change handler
  const handleQuillChange = (value: string, _delta: unknown, _source: unknown, editor: UnprivilegedEditor) => {
    setHtml(value)
    setPlainText(editor.getText())
    // Emit typing start and reset idle timer
    if (onTyping && !disabled) {
      onTyping(true)
      if (typingIdleTimerRef.current) {
        window.clearTimeout(typingIdleTimerRef.current)
      }
      // Slightly longer idle so indicator doesn't flicker on brief pauses (~1500ms)
      typingIdleTimerRef.current = window.setTimeout(() => {
        onTyping(false)
      }, 1500)
    }
    // No automatic hyperlinking; links are inserted only via the Insert Link dialog (⌘K / Ctrl+K)
  }

  // Remove native tooltips from links inside the editor (strip title attributes)
  useEffect(() => {
    const q: Quill | null = quillRef.current && (quillRef.current as unknown as ReactQuillType).getEditor ? (quillRef.current as unknown as ReactQuillType).getEditor() as Quill : null
    if (!q) return
    const root = q.root as HTMLElement

    const stripTitles = () => {
      const anchors = root.querySelectorAll('a[title]')
      anchors.forEach(a => a.removeAttribute('title'))
    }

    // Initial pass
    stripTitles()

    // Observe future changes
    const mo = new MutationObserver(() => stripTitles())
    mo.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['title'] })
    return () => mo.disconnect()
  }, [quillRef])

  // Improve mobile typing experience (especially iPhone):
  // - Disable autocorrect/autocapitalize/spellcheck to avoid jumpy input
  // - Prefer a newline enter key hint since Return inserts a newline on mobile
  useEffect(() => {
    const q: Quill | null = quillRef.current && (quillRef.current as unknown as ReactQuillType).getEditor ? (quillRef.current as unknown as ReactQuillType).getEditor() as Quill : null
    if (!q) return
    const root = q.root as HTMLElement
    try {
      root.setAttribute('autocapitalize', 'off')
      root.setAttribute('autocorrect', 'off')
      root.setAttribute('spellcheck', 'false')
      root.setAttribute('enterkeyhint', 'newline')
      // Keep text input mode, not numeric/email, to stabilize iOS keyboard
      root.setAttribute('inputmode', 'text')
    } catch {}
  }, [quillRef])

  const handleFilesUpload = async (files: File[]) => {
    if (!files.length) return
    const valid = files.filter(validateFile)
    if (!valid.length) return
    try {
      setIsUploading(true)
      for (const f of valid) {
        const form = new FormData()
        form.append('file', f)
        const res = await fetch('/api/paste-upload', {
          method: 'POST',
          body: form,
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err?.error || 'Upload failed')
        }
        const data = await res.json()
        if (data?.url) {
          // Insert image embed at current cursor
          const q: Quill | null = quillRef.current && (quillRef.current as unknown as ReactQuillType).getEditor ? (quillRef.current as unknown as ReactQuillType).getEditor() as Quill : null
          if (q) {
            const range = q.getSelection(true)
            const index = range ? range.index : q.getLength()
            q.insertEmbed(index, 'image', data.url, 'user')
            q.setSelection(index + 1, 0, 'user')
          }
        } else {
          alert('Upload succeeded but no URL was returned. Please try again.')
        }
      }
    } catch (err: unknown) {
      const msg = typeof err === 'object' && err && 'message' in err ? String((err as { message?: unknown }).message) : undefined
      alert(msg || 'Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const raw = (plainText || '')
    const text = raw.trim()
    const contentHtml = html || ''
    const hasContent = text.length > 0 || /<img\b/i.test(contentHtml)
    if (!disabled && hasContent) {
      if (raw.length > MAX_CHARS) {
        alert(`Message too long. Max ${MAX_CHARS} characters.`)
        return
      }
      onSendMessage(text || ' ', replyTo, contentHtml)
      setPlainText('')
      setHtml('')
      // Clear editor
      const q: Quill | null = quillRef.current && (quillRef.current as unknown as ReactQuillType).getEditor ? (quillRef.current as unknown as ReactQuillType).getEditor() as Quill : null
      q?.setText('')
      // Refocus editor after send for rapid consecutive messages
      q?.focus()
      if (onCancelReply) onCancelReply()
      
      // Stop typing when sending
      if (onTyping) onTyping(false)
      if (typingIdleTimerRef.current) {
        window.clearTimeout(typingIdleTimerRef.current)
        typingIdleTimerRef.current = null
      }
      
      // Change placeholder after sending a message
      const randomPlaceholder = funnyPlaceholders[Math.floor(Math.random() * funnyPlaceholders.length)]
      setCurrentPlaceholder(randomPlaceholder)
      setShowPicker(false)
    }
  }

  // Stop typing on unmount
  useEffect(() => {
    return () => {
      if (typingIdleTimerRef.current) window.clearTimeout(typingIdleTimerRef.current)
      if (onTyping) onTyping(false)
    }
  }, [onTyping])

  // Keyboard shortcuts for formatting
  const applyFormat = (fmt: 'bold' | 'italic' | 'underline' | 'header0' | 'header1' | 'header2' | 'header3') => {
    const q: Quill | null = quillRef.current && (quillRef.current as unknown as ReactQuillType).getEditor ? (quillRef.current as unknown as ReactQuillType).getEditor() as Quill : null
    if (!q) return
    if (fmt === 'bold' || fmt === 'italic' || fmt === 'underline') {
      q.format(fmt, !q.getFormat()[fmt])
    } else {
      if (fmt === 'header0') {
        q.format('header', false)
        q.focus()
        return
      }
      const level = fmt === 'header1' ? 1 : fmt === 'header2' ? 2 : 3
      const current = q.getFormat().header
      q.format('header', current === level ? false : level)
    }
    q.focus()
  }

  // removed TipTap helper

  // Close picker on outside click or Escape
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!showPicker) return
      const target = e.target as Node
      if (pickerRef.current && !pickerRef.current.contains(target)) {
        setShowPicker(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowPicker(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [showPicker])

  // Built-in emoji grid (64 to fill 8x8)
  const commonEmojis = [
    '😀','😁','😂','🤣','😊','😉','😍','🥰',
    '😘','😎','🤔','😅','😭','😴','🥳','🤯',
    '😤','😇','🙃','😐','🥲','😮','😬','🤗',
    '❤️','🧡','💛','💚','💙','💜','🖤','🤍',
    '💯','✨','⭐','🌈','⚡','🔥','🎉','🎈',
    '👍','👎','👏','🙌','🙏','💪','🤝','👋',
    '🍀','🌸','🌞','🌙','🌟','☁️','☕','🍰',
    '🍕','🍔','🍟','🍣','🏆','🎵','📸','🧠'
  ]

  // Paste uploads will be handled by posting to our server route

  return (
    <motion.form
      id="chat-input-form"
      onSubmit={handleSubmit}
      className="flex items-center gap-2 p-4 glass-effect border-t border-pastel-gray/50"
      initial={isIOSMobile ? { y: 0, opacity: 1 } : { y: 50, opacity: 0 }}
      animate={isIOSMobile ? { y: 0, opacity: 1 } : { y: 0, opacity: 1 }}
      transition={isIOSMobile ? { duration: 0 } : { delay: 0.3 }}
    >
      <div className="flex-1 relative min-w-0">
        {replyTo && (
          <div className="mb-2 -mt-1 flex items-start gap-2 p-2 rounded-xl bg-pastel-ink/60 border border-pastel-gray pl-3 border-l-4 border-l-pastel-lilac dark:bg-pastel-ink dark:border-pastel-gray/50 dark:text-gray-300">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-pastel-lilac">Replying to {replyTo.username}</div>
              <div className="text-xs text-gray-300 truncate flex items-center gap-2">
                {replyTo.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={replyTo.imageUrl} alt="reply" className="w-6 h-6 rounded object-cover" />
                )}
                <span className="truncate">{replyTo.preview}</span>
              </div>
            </div>
            {onCancelReply && (
              <button
                type="button"
                onClick={onCancelReply}
                className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-blue-700 hover:text-blue-900 dark:text-blue-200 dark:hover:text-white hover:bg-blue-100 dark:hover:bg-blue-800/50"
                aria-label="Cancel reply"
                title="Cancel reply"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}
        <div className="relative">
        {/* Insert Link Popover (positioned relative to this container) */}
        {showLinkPopover && (
          <div className="absolute z-50 left-0 right-0 -top-2 translate-y-[-100%] flex justify-start">
            <div className="w-full max-w-sm rounded-xl border border-pastel-gray bg-pastel-ink shadow-xl p-3">
              <div className="mb-2 text-xs font-medium text-gray-200">Insert link</div>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => { setLinkUrl(e.target.value); setLinkError(null) }}
                  placeholder="URL (e.g., https://example.com)"
                  className="w-full rounded-md bg-black/20 border border-white/10 px-2 py-1 text-xs text-gray-100 placeholder:text-gray-400"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      e.stopPropagation()
                      const res = sanitizeAndValidateUrl(linkUrl)
                      if (!res.ok || !res.href) { setLinkError(res.error || 'Invalid URL'); return }
                      insertLinkIntoEditor(res.href, linkText)
                      setShowLinkPopover(false)
                    } else if (e.key === 'Escape') {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowLinkPopover(false)
                    }
                  }}
                />
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Text to display (optional)"
                  className="w-full rounded-md bg-black/20 border border-white/10 px-2 py-1 text-xs text-gray-100 placeholder:text-gray-400"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      e.stopPropagation()
                      const res = sanitizeAndValidateUrl(linkUrl)
                      if (!res.ok || !res.href) { setLinkError(res.error || 'Invalid URL'); return }
                      insertLinkIntoEditor(res.href, linkText)
                      setShowLinkPopover(false)
                    } else if (e.key === 'Escape') {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowLinkPopover(false)
                    }
                  }}
                />
                {linkError && <div className="text-[10px] text-red-300">{linkError}</div>}
                <div className="flex items-center justify-end gap-2 mt-1">
                  <button
                    type="button"
                    className="px-2 py-1 rounded-md text-xs bg-gray-600 hover:bg-gray-500 text-white"
                    onClick={() => setShowLinkPopover(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-2 py-1 rounded-md text-xs bg-pastel-blue hover:bg-blue-500 text-white"
                    onClick={() => {
                      const res = sanitizeAndValidateUrl(linkUrl)
                      if (!res.ok || !res.href) { setLinkError(res.error || 'Invalid URL'); return }
                      insertLinkIntoEditor(res.href, linkText)
                      setShowLinkPopover(false)
                    }}
                  >
                    Insert
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Compact formatting toolbar above the input */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {(
              <button
                type="button"
                className="h-8 px-2 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10"
                onClick={() => applyFormat('bold')}
                title="Bold"
                aria-label="Bold"
              >
                <Bold size={16} />
              </button>
            )}
            {(
              <button
                type="button"
                className="h-8 px-2 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10"
                onClick={() => applyFormat('italic')}
                title="Italic"
                aria-label="Italic"
              >
                <Italic size={16} />
              </button>
            )}
            {(
              <button
                type="button"
                className="h-8 px-2 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10"
                onClick={() => applyFormat('underline')}
                title="Underline"
                aria-label="Underline"
              >
                <Underline size={16} />
              </button>
            )}
            {(
              <button
                type="button"
                className="h-8 px-2 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10"
                onClick={() => {
                  if (disabled) return
                  const q: Quill | null = quillRef.current && (quillRef.current as unknown as ReactQuillType).getEditor ? (quillRef.current as unknown as ReactQuillType).getEditor() as Quill : null
                  const sel = q?.getSelection()
                  const selectedText = sel && sel.length ? q?.getText(sel.index, sel.length) || '' : ''
                  if (q) {
                    lastSelectionRef.current = sel ? { index: sel.index, length: sel.length } : { index: q.getLength(), length: 0 }
                  }
                  setLinkText((selectedText || '').trim())
                  setLinkUrl('')
                  setLinkError(null)
                  setShowLinkPopover(true)
                }}
                title="Insert link"
                aria-label="Insert link"
              >
                <Link2 size={16} />
                <span className="ml-1 text-xs hidden sm:inline">Link</span>
              </button>
            )}
            <div className="h-5 w-px bg-white/10 mx-1" />
            {(
              <button
                type="button"
                className="h-8 px-2 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10"
                onClick={() => applyFormat('header0')}
                title="Normal size"
                aria-label="Normal"
              >
                <Type size={16} />
                <span className="ml-1 text-xs">Normal</span>
              </button>
            )}
            {(
              <button
                type="button"
                className="h-8 px-2 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10"
                onClick={() => applyFormat('header1')}
                title="Heading 1"
                aria-label="H1"
              >
                <Type size={16} />
                <span className="ml-1 text-xs">H1</span>
              </button>
            )}
            {(
              <button
                type="button"
                className="h-8 px-2 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10"
                onClick={() => applyFormat('header2')}
                title="Heading 2"
                aria-label="H2"
              >
                <Type size={16} />
                <span className="ml-1 text-xs">H2</span>
              </button>
            )}
            {(
              <button
                type="button"
                className="h-8 px-2 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10"
                onClick={() => applyFormat('header3')}
                title="Heading 3"
                aria-label="H3"
              >
                <Type size={16} />
                <span className="ml-1 text-xs">H3</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="h-8 w-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-200 hover:bg-pastel-gray/60 transition-colors"
              aria-label="Upload image"
              onClick={() => {
                if (disabled || isUploading) return
                fileInputRef.current?.click()
              }}
              onMouseEnter={() => {
                if (disabled) return
                setShowPasteHint(true)
                setTimeout(() => setShowPasteHint(false), 2500)
              }}
              onMouseLeave={() => setShowPasteHint(false)}
              disabled={disabled || isUploading}
            >
              <ImageIcon size={18} />
            </button>
            <button
              type="button"
              className="h-8 w-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
              aria-label="Choose emoji"
              onClick={() => setShowPicker(v => !v)}
            >
              <Smile size={18} />
            </button>
          </div>
          {/* Character counter */}
          <div className={`text-[10px] ${plainText.length > MAX_CHARS ? 'text-red-300' : 'text-gray-400'}`}>
            {plainText.length}/{MAX_CHARS}
          </div>
        </div>
        <div className="mb-1 text-[10px] text-gray-400 select-none">
          Tip: To add a hyperlink, use the Link icon
        </div>
        {/* Quill editor */}
        <div
          onPaste={(event) => {
            if (disabled) return
            const cb = event.clipboardData
            if (!cb) return
            const files: File[] = []
            for (let i = 0; i < cb.items.length; i++) {
              const it = cb.items[i]
              if (it.kind === 'file') {
                const blob = it.getAsFile()
                if (blob) files.push(new File([blob], 'pasted-image', { type: blob.type }))
              }
            }
            if (files.length) {
              event.preventDefault()
              void handleFilesUpload(files)
            }
          }}
          className="quill-wrapper relative"
        >
          <ReactQuill
            ref={quillRef}
            theme="bubble"
            placeholder={currentPlaceholder}
            value={html}
            onChange={handleQuillChange}
            modules={modules}
            className="rounded-2xl min-h-12 max-h-32 overflow-y-auto px-4 py-3 text-xs bg-transparent w-full"
            onBlur={() => { if (onTyping) onTyping(false) }}
            onFocus={() => { if (onTyping) onTyping(true) }}
          />
        </div>
        {/* Removed file chooser: paste-only flow */}
        {/* Hidden file input for manual uploads */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_TYPES.join(',')}
          className="hidden"
          onChange={async (e) => {
            if (disabled) return
            const list = e.target.files
            if (!list || !list.length) return
            const files = Array.from(list)
            try {
              await handleFilesUpload(files)
            } finally {
              // Allow selecting the same file again in future
              if (fileInputRef.current) {
                fileInputRef.current.value = ''
              }
            }
          }}
        />

        {/* Old absolute overlay removed; toolbar is above now */}

        {showPasteHint && (
          <div className="absolute right-0 bottom-14 z-40 select-none">
            <div className="px-3 py-2 text-xs rounded-lg bg-pastel-ink text-gray-100 shadow-lg">
              Paste an image here (Cmd/Ctrl + V). Max 1 MB.
            </div>
          </div>
        )}

        {showPicker && (
          <div
            ref={pickerRef}
            className="absolute right-0 bottom-14 z-50 drop-shadow-xl max-w-[90vw]"
          >
            <div className="p-2 w-64 max-w-full bg-pastel-ink rounded-xl border border-pastel-gray">
            <div className="grid grid-cols-8 gap-1">
              {commonEmojis.map((em) => (
                <button
                  key={em}
                  type="button"
                  className="h-8 w-8 flex items-center justify-center rounded hover:bg-pastel-gray/60 text-lg"
                  onClick={() => {
                    const q: Quill | null = quillRef.current && (quillRef.current as unknown as ReactQuillType).getEditor ? (quillRef.current as unknown as ReactQuillType).getEditor() as Quill : null
                    if (q) {
                      const range = q.getSelection(true)
                      const index = range ? range.index : q.getLength()
                      q.insertText(index, em, 'user')
                      q.setSelection(index + em.length, 0, 'user')
                      q.focus()
                    }
                    // keep picker open; do not move
                  }}
                  aria-label={`Insert ${em}`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
        </div>
        )}
        </div>
      </div>
      
      <motion.button
        type="submit"
        disabled={(plainText.trim().length === 0 && !(/<img\b/i.test(html))) || disabled || isUploading || plainText.length > MAX_CHARS}
        whileHover={isIOSMobile ? undefined : { scale: 1.05 }}
        whileTap={isIOSMobile ? undefined : { scale: 0.95 }}
        className="bg-pastel-blue hover:bg-blue-500 text-gray-100 h-12 w-12 rounded-2xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-pastel-blue/60 focus:ring-offset-2 focus:ring-offset-pastel-ink"
        onClick={(e) => {
          // Ensure submit fires on iOS tap
          const form = (e.currentTarget.closest('form') as HTMLFormElement | null) || document.getElementById('chat-input-form') as HTMLFormElement | null
          if (form) {
            form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
          }
        }}
      >
        {isUploading ? (
          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
        ) : (
          <Send size={20} />
        )}
      </motion.button>
    </motion.form>
  )
}
