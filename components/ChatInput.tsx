'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, Smile, Image as ImageIcon, X, Bold, Italic, Underline, Type } from 'lucide-react'

import { ReplyInfo } from '@/types/chat'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import UnderlineExt from '@tiptap/extension-underline'
import Heading from '@tiptap/extension-heading'
import Image from '@tiptap/extension-image'
import type { EditorView } from '@tiptap/pm/view'

interface ChatInputProps {
  onSendMessage: (message: string, reply?: ReplyInfo, html?: string) => void
  disabled?: boolean
  replyTo?: ReplyInfo
  onCancelReply?: () => void
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

export default function ChatInput({ onSendMessage, disabled, replyTo, onCancelReply }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [currentPlaceholder, setCurrentPlaceholder] = useState(funnyPlaceholders[0])
  const [showPicker, setShowPicker] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showPasteHint, setShowPasteHint] = useState(false)
  const editorRef = useRef<ReturnType<typeof useEditor> | null>(null)
  const pickerRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const MAX_SIZE_BYTES = 1 * 1024 * 1024 // 1 MB
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

  // TipTap editor setup
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      UnderlineExt,
      Heading.configure({ levels: [1, 2, 3] }),
      Image.configure({ inline: true, allowBase64: false })
    ],
    editorProps: {
      attributes: {
        class: 'chat-textarea input-field pr-20 rounded-2xl transition-all duration-200 resize-none min-h-12 max-h-32 overflow-y-auto',
      },
      handlePaste: (view: EditorView, event: ClipboardEvent) => {
        if (disabled) return false
        const cb = event.clipboardData
        if (!cb) return false
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
          return true
        }
        return false
      },
      handleKeyDown: (_view: EditorView, event: KeyboardEvent) => {
        // Submit on Enter, newline on Shift+Enter
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault()
          // Programmatically submit
          const form = document.getElementById('chat-input-form') as HTMLFormElement | null
          form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
          return true
        }
        const isMac = navigator.userAgent.includes('Mac')
        const mod = isMac ? event.metaKey : event.ctrlKey
        if (!mod) return false
        const key = event.key.toLowerCase()
        if (key === 'b') { event.preventDefault(); editor?.chain().focus().toggleBold().run(); return true }
        if (key === 'i') { event.preventDefault(); editor?.chain().focus().toggleItalic().run(); return true }
        if (key === 'u') { event.preventDefault(); editor?.chain().focus().toggleUnderline().run(); return true }
        if (key === '1') { event.preventDefault(); editor?.chain().focus().toggleHeading({ level: 1 }).run(); return true }
        if (key === '2') { event.preventDefault(); editor?.chain().focus().toggleHeading({ level: 2 }).run(); return true }
        if (key === '3') { event.preventDefault(); editor?.chain().focus().toggleHeading({ level: 3 }).run(); return true }
        return false
      },
    },
    onUpdate: ({ editor }: { editor: Editor }) => {
      // Keep a plain-text shadow for the optimistic temp message
      setMessage(editor.getText())
    },
  })
  editorRef.current = editor

  const wrapSelection = (token: string) => {
    if (!editor) return
    // Map tokens to TipTap marks
    if (token === '**') editor.chain().focus().toggleBold().run()
    else if (token === '*') editor.chain().focus().toggleItalic().run()
    else if (token === '__') editor.chain().focus().toggleUnderline().run()
  }

  const prefixLine = (level: 1 | 2 | 3) => {
    if (!editor) return
    editor.chain().focus().toggleHeading({ level }).run()
  }

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
          // Insert TipTap image node inline at cursor
          editor?.chain().focus().setImage({ src: data.url, alt: 'image' }).run()
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
    const html = editor?.getHTML() || ''
    const text = editor?.getText().trim() || ''
    const hasContent = !!editor && !editor.isEmpty
    if (!disabled && (text.length > 0 || hasContent)) {
      onSendMessage(text || ' ', replyTo, html)
      setMessage('')
      editor?.commands.clearContent(true)
      if (onCancelReply) onCancelReply()
      
      // Change placeholder after sending a message
      const randomPlaceholder = funnyPlaceholders[Math.floor(Math.random() * funnyPlaceholders.length)]
      setCurrentPlaceholder(randomPlaceholder)
      setShowPicker(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
      return
    }
    const isMac = navigator.platform.toUpperCase().includes('MAC')
    const mod = isMac ? (e as React.KeyboardEvent).metaKey : (e as React.KeyboardEvent).ctrlKey
    if (mod) {
      if (e.key.toLowerCase() === 'b') { e.preventDefault(); wrapSelection('**') }
      else if (e.key.toLowerCase() === 'i') { e.preventDefault(); wrapSelection('*') }
      else if (e.key.toLowerCase() === 'u') { e.preventDefault(); wrapSelection('__') }
      else if (e.key === '1') { e.preventDefault(); prefixLine(1) }
      else if (e.key === '2') { e.preventDefault(); prefixLine(2) }
      else if (e.key === '3') { e.preventDefault(); prefixLine(3) }
    }
  }

  const insertAtCursor = (text: string) => {
    editor?.chain().focus().insertContent(text).run()
  }

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
      className="flex items-center gap-3 p-4 glass-effect border-t border-pastel-gray/50"
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <div className="flex-1 relative">
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
        {/* Compact formatting toolbar above the input */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {editor && (
              <button
                type="button"
                className="h-8 px-2 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10"
                onClick={() => editor?.chain().focus().toggleBold().run()}
                title="Bold (⌘B / Ctrl+B)"
                aria-label="Bold"
              >
                <Bold size={16} />
              </button>
            )}
            {editor && (
              <button
                type="button"
                className="h-8 px-2 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10"
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                title="Italic (⌘I / Ctrl+I)"
                aria-label="Italic"
              >
                <Italic size={16} />
              </button>
            )}
            {editor && (
              <button
                type="button"
                className="h-8 px-2 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10"
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
                title="Underline (⌘U / Ctrl+U)"
                aria-label="Underline"
              >
                <Underline size={16} />
              </button>
            )}
            <div className="h-5 w-px bg-white/10 mx-1" />
            {editor && (
              <button
                type="button"
                className="h-8 px-2 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10"
                onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                title="Heading 1 (⌘1 / Ctrl+1)"
                aria-label="H1"
              >
                <Type size={16} />
                <span className="ml-1 text-xs">H1</span>
              </button>
            )}
            {editor && (
              <button
                type="button"
                className="h-8 px-2 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10"
                onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                title="Heading 2 (⌘2 / Ctrl+2)"
                aria-label="H2"
              >
                <Type size={16} />
                <span className="ml-1 text-xs">H2</span>
              </button>
            )}
            {editor && (
              <button
                type="button"
                className="h-8 px-2 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10"
                onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                title="Heading 3 (⌘3 / Ctrl+3)"
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
        </div>

        <div onKeyDown={handleKeyDown}>
          <EditorContent editor={editor!} />
        </div>
        {/* Locked placeholder overlay */}
        {((!message || message.length === 0) && editor?.isEmpty) && (
          <div
            className="pointer-events-none select-none absolute left-4 right-20 inset-y-0 flex items-center text-gray-400 dark:text-gray-400/80 truncate"
            aria-hidden
          >
            {currentPlaceholder}
          </div>
        )}
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
            className="absolute right-0 bottom-14 z-50 drop-shadow-xl"
          >
            <div className="p-2 w-64 bg-pastel-ink rounded-xl border border-pastel-gray">
            <div className="grid grid-cols-8 gap-1">
              {commonEmojis.map((em) => (
                <button
                  key={em}
                  type="button"
                  className="h-8 w-8 flex items-center justify-center rounded hover:bg-pastel-gray/60 text-lg"
                  onClick={() => {
                    insertAtCursor(em)
                    setShowPicker(false)
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
        disabled={(editor?.isEmpty ?? true) || disabled || isUploading}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="bg-pastel-blue hover:bg-blue-500 text-gray-100 h-12 w-12 rounded-2xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-pastel-blue/60 focus:ring-offset-2 focus:ring-offset-pastel-ink"
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
