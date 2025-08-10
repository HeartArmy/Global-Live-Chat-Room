'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, Smile, Image as ImageIcon } from 'lucide-react'
import dynamic from 'next/dynamic'
// Optional: load emoji-mart v5 styles
// import 'emoji-mart/css/emoji-mart.css'

// Load emoji-mart Picker only on the client to satisfy TS/SSR, and type as any
const EmojiPicker = dynamic(async () => {
  // Using emoji-mart v5 which exports the React Picker from 'emoji-mart'
  const mod: any = await import('emoji-mart')
  return mod.Picker || mod.default
}, { ssr: false }) as any

interface ChatInputProps {
  onSendMessage: (message: string) => void
  disabled?: boolean
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

export default function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [currentPlaceholder, setCurrentPlaceholder] = useState(funnyPlaceholders[0])
  const [showPicker, setShowPicker] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [pickerReady, setPickerReady] = useState(true)
  const [showPasteHint, setShowPasteHint] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const pickerRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const MAX_SIZE_BYTES = 500 * 1024 // 500 KB
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
      alert('Image is too large. Max size is 500 KB.')
      return false
    }
    return true
  }

  const handleFilesUpload = async (files: File[]) => {
    if (!files.length) return
    const valid = files.filter(validateFile)
    if (!valid.length) return
    try {
      setIsUploading(true)
      const form = new FormData()
      form.append('file', valid[0])
      const res = await fetch('/api/paste-upload', {
        method: 'POST',
        body: form,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || 'Upload failed')
      }
      const data = await res.json()
      if (data?.url) onSendMessage(`![image](${data.url})`)
    } catch (err: any) {
      console.error(err)
      alert(err?.message || 'Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSendMessage(message.trim())
      setMessage('')
      
      // Change placeholder after sending a message
      const randomPlaceholder = funnyPlaceholders[Math.floor(Math.random() * funnyPlaceholders.length)]
      setCurrentPlaceholder(randomPlaceholder)
      setShowPicker(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // Insert text at the current cursor position of the textarea
  const insertAtCursor = (text: string) => {
    const el = textareaRef.current
    if (!el) {
      setMessage(prev => prev + text)
      return
    }
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? el.value.length
    const newValue = el.value.slice(0, start) + text + el.value.slice(end)
    setMessage(newValue)
    // Restore caret after React state update
    requestAnimationFrame(() => {
      el.focus()
      const caret = start + text.length
      el.setSelectionRange(caret, caret)
      // Adjust height after insertion
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 128)}px`
    })
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

  // Paste uploads will be handled by posting to our server route

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="flex items-end gap-3 p-4 bg-white/80 dark:bg-apple-dark/80 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-700/50"
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <div className="flex-1 relative">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onPaste={async (e) => {
            if (disabled) return
            const items = e.clipboardData?.items
            if (!items) return
            const files: File[] = []
            for (let i = 0; i < items.length; i++) {
              const it = items[i]
              if (it.kind === 'file') {
                const blob = it.getAsFile()
                if (blob) files.push(new File([blob], 'pasted-image', { type: blob.type }))
              }
            }
            if (files.length) {
              e.preventDefault()
              await handleFilesUpload(files)
            }
          }}
          onKeyPress={handleKeyPress}
          placeholder={currentPlaceholder}
          disabled={disabled}
          rows={1}
          className="chat-textarea w-full px-4 py-3 pr-16 rounded-2xl border border-gray-200 dark:border-gray-700 
                    bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                    focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent
                    transition-all duration-200 resize-none min-h-[48px] max-h-32
                    disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ 
            height: 'auto',
            minHeight: '48px'
          }}
          ref={textareaRef}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement
            target.style.height = 'auto'
            target.style.height = `${Math.min(target.scrollHeight, 128)}px`
          }}
        />
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

        {/* Action buttons container (stable layout) */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {/* Image upload (paste hint) */}
          <button
            type="button"
            className="h-8 w-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
            aria-label="Upload image"
            onClick={() => {
              if (disabled || isUploading) return
              // Open native file picker for local uploads
              fileInputRef.current?.click()
            }}
            onMouseEnter={() => {
              if (disabled) return
              setShowPasteHint(true)
              // Auto-hide after a short delay to keep UI tidy
              setTimeout(() => setShowPasteHint(false), 2500)
            }}
            onMouseLeave={() => setShowPasteHint(false)}
            disabled={disabled || isUploading}
          >
            <ImageIcon size={18} />
          </button>

          {/* Emoji button */}
          <button
            type="button"
            className="h-8 w-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
            aria-label="Choose emoji"
            onClick={() => setShowPicker(v => !v)}
          >
            <Smile size={18} />
          </button>
        </div>

        {showPasteHint && (
          <div className="absolute right-0 bottom-14 z-40 select-none">
            <div className="px-3 py-2 text-xs rounded-lg bg-gray-900 text-white shadow-lg dark:bg-black/80">
              Paste an image here (Cmd/Ctrl + V). Max 500 KB.
            </div>
          </div>
        )}

        {showPicker && (
          <div
            ref={pickerRef}
            className="absolute right-0 bottom-14 z-50 drop-shadow-xl"
          >
            <EmojiPicker
              onSelect={(emoji: any) => {
                // For older emoji-mart versions that use onSelect
                try {
                  const char = emoji?.native || emoji?.shortcodes || ''
                  if (char) insertAtCursor(char)
                } catch (e) {
                  console.error('Emoji select error', e)
                  setShowPicker(false)
                }
              }}
              theme={typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'}
              previewPosition="none"
              navPosition="top"
              perLine={8}
              searchPosition="sticky"
            />
          </div>
        )}
      </div>
      
      <motion.button
        type="submit"
        disabled={!message.trim() || disabled || isUploading}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="bg-apple-blue hover:bg-blue-600 text-white p-3 rounded-2xl
                 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                 disabled:transform-none flex items-center justify-center min-w-[48px]"
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
