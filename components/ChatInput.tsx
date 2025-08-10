'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Send, Smile } from 'lucide-react'

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSendMessage(message.trim())
      setMessage('')
      
      // Change placeholder after sending a message
      const randomPlaceholder = funnyPlaceholders[Math.floor(Math.random() * funnyPlaceholders.length)]
      setCurrentPlaceholder(randomPlaceholder)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

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
          onKeyPress={handleKeyPress}
          placeholder={currentPlaceholder}
          disabled={disabled}
          rows={1}
          className="w-full px-4 py-3 pr-12 rounded-2xl border border-gray-200 dark:border-gray-700 
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                   focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent
                   transition-all duration-200 resize-none min-h-[48px] max-h-32
                   disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ 
            height: 'auto',
            minHeight: '48px'
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement
            target.style.height = 'auto'
            target.style.height = `${Math.min(target.scrollHeight, 128)}px`
          }}
        />
        
        {/* Fun emoji button */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          onClick={() => {
            const emojis = ['😊', '🎉', '❤️', '👍', '😂', '🔥', '✨', '🌟']
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)]
            setMessage(prev => prev + randomEmoji)
          }}
        >
          <Smile size={20} />
        </motion.button>
      </div>
      
      <motion.button
        type="submit"
        disabled={!message.trim() || disabled}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="bg-apple-blue hover:bg-blue-600 text-white p-3 rounded-2xl
                 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                 disabled:transform-none flex items-center justify-center min-w-[48px]"
      >
        <Send size={20} />
      </motion.button>
    </motion.form>
  )
}
