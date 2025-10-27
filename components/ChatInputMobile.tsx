'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Send, X } from 'lucide-react'
import { ReplyInfo } from '@/types/chat'

interface ChatInputMobileProps {
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
  "Type something awesome!",
  "Connect with humans worldwide...",
  "Share a thought, make a friend!",
  "What's happening in your corner of the world?"
]

export default function ChatInputMobile({
  onSendMessage,
  disabled,
  replyTo,
  onCancelReply,
  onTyping
}: ChatInputMobileProps) {
  const [message, setMessage] = useState('')
  const [currentPlaceholder] = useState(funnyPlaceholders[Math.floor(Math.random() * funnyPlaceholders.length)])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const MAX_CHARS = 2000
  const MAX_LINES = 6

  // Auto-resize textarea based on content
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto'
    
    // Calculate new height based on content
    const lineHeight = 24 // approximate line height in pixels
    const maxHeight = lineHeight * MAX_LINES
    const newHeight = Math.min(textarea.scrollHeight, maxHeight)
    
    textarea.style.height = `${newHeight}px`
  }, [])

  // Handle input change with debounced typing indicator
  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setMessage(newValue)
    adjustTextareaHeight()

    // Typing indicator with debouncing
    if (onTyping && !disabled) {
      onTyping(true)
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false)
      }, 400)
    }
  }, [adjustTextareaHeight, onTyping, disabled])

  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    
    const trimmed = message.trim()
    if (!disabled && trimmed.length > 0 && trimmed.length <= MAX_CHARS) {
      onSendMessage(trimmed, replyTo)
      setMessage('')
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
      
      // Stop typing indicator
      if (onTyping) {
        onTyping(false)
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      
      // Focus back on textarea
      textareaRef.current?.focus()
    }
  }, [message, disabled, onSendMessage, replyTo, onTyping])



  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (onTyping) {
        onTyping(false)
      }
    }
  }, [onTyping])

  // Adjust height on mount and when message changes externally
  useEffect(() => {
    adjustTextareaHeight()
  }, [adjustTextareaHeight])

  const isOverLimit = message.length > MAX_CHARS
  const canSend = message.trim().length > 0 && !isOverLimit && !disabled

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 p-4 glass-effect border-t border-pastel-gray/50"
      initial={{ y: 0, opacity: 1 }}
      animate={{ y: 0, opacity: 1 }}
    >
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-start gap-2 p-2 rounded-xl bg-pastel-ink/60 border border-pastel-gray pl-3 border-l-4 border-l-pastel-lilac">
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
              className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-blue-200 hover:text-white hover:bg-blue-800/50"
              aria-label="Cancel reply"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Minimal toolbar - removed emoji picker, phone keyboard has emojis */}
      <div className="flex items-center justify-end">
        {/* Character counter */}
        <div className={`text-[10px] ${isOverLimit ? 'text-red-300' : 'text-gray-400'}`}>
          {message.length}/{MAX_CHARS}
        </div>
      </div>

      {/* Input area */}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInput}
          placeholder={currentPlaceholder}
          disabled={disabled}
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          enterKeyHint="send"
          rows={1}
          className="flex-1 rounded-2xl px-4 py-3 text-sm bg-black/20 border border-white/10 text-gray-100 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-pastel-blue/60 focus:border-transparent disabled:opacity-50 overflow-y-auto"
          style={{ minHeight: '48px', maxHeight: `${24 * MAX_LINES}px` }}
          onKeyDown={(e) => {
            // Submit on Enter (without Shift)
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e as unknown as React.FormEvent)
            }
          }}
        />
        
        <button
          type="submit"
          disabled={!canSend}
          onClick={(e) => {
            // Ensure submit fires on mobile tap
            if (!canSend) {
              e.preventDefault()
              return
            }
            // Let the form submit naturally, but ensure it happens
            handleSubmit(e as unknown as React.FormEvent)
          }}
          className="bg-pastel-blue hover:bg-blue-500 active:bg-blue-600 text-gray-100 h-12 w-12 rounded-2xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-pastel-blue/60 focus:ring-offset-2 focus:ring-offset-pastel-ink shrink-0"
          aria-label="Send message"
        >
          <Send size={20} />
        </button>
      </div>
    </motion.form>
  )
}
