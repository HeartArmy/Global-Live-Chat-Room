'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, Shield, Sparkles, Globe } from 'lucide-react'
import { generateRandomMathProblem } from '@/lib/utils'
import toast from 'react-hot-toast'

interface ChatInputProps {
  onSendMessage: (name: string, message: string) => void
  isConnected: boolean
}

export default function ChatInput({ onSendMessage, isConnected }: ChatInputProps) {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [mathProblem, setMathProblem] = useState<{ question: string; answer: number } | null>(null)
  const [mathAnswer, setMathAnswer] = useState('')
  const [isNameSet, setIsNameSet] = useState(false)
  const [showMath, setShowMath] = useState(false)

  useEffect(() => {
    if (isNameSet && !mathProblem) {
      setMathProblem(generateRandomMathProblem())
      setShowMath(true)
    }
  }, [isNameSet, mathProblem])

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2) {
      toast.error('Name must be at least 2 characters long!')
      return
    }
    if (name.trim().length > 30) {
      toast.error('Name must be less than 30 characters!')
      return
    }
    setIsNameSet(true)
    toast.success(`Welcome, ${name.trim()}! 🌟`)
  }

  const handleMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!message.trim()) {
      toast.error('Please enter a message!')
      return
    }

    if (!mathProblem || parseInt(mathAnswer) !== mathProblem.answer) {
      toast.error('Wrong answer! Try again! 🤖')
      setMathAnswer('')
      return
    }

    // Send message
    onSendMessage(name.trim(), message.trim())
    
    // Reset form
    setMessage('')
    setMathAnswer('')
    setMathProblem(generateRandomMathProblem())
    
    toast.success('Message sent! ✨')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (isNameSet) {
        handleMessageSubmit(e as any)
      } else {
        handleNameSubmit(e as any)
      }
    }
  }

  if (!isNameSet) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-effect rounded-3xl p-6 shadow-xl"
      >
        <div className="text-center mb-6">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="w-16 h-16 bg-gradient-to-br from-apple-blue to-apple-purple rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <Globe className="w-8 h-8 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold text-gradient mb-2">
            Welcome to Global Live Chat! 🌍
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Join the ultimate chat room for the world! Enter your name to get started.
          </p>
        </div>

        <form onSubmit={handleNameSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              What should we call you? ✨
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter your name..."
              className="input-field text-center text-lg"
              maxLength={30}
              autoFocus
            />
            <p className="text-xs text-slate-500 mt-1">
              {name.length}/30 characters
            </p>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="btn-primary w-full text-lg py-4"
          >
            <Sparkles className="w-5 h-5 inline mr-2" />
            Join the Global Chat!
          </motion.button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            💡 <strong>Pro tip:</strong> Students, maybe finish your homework first? 😄
          </p>
          <p className="text-xs text-slate-500 mt-1">
            💡 <strong>Fun fact:</strong> Teachers, you're welcome here too! 🎓
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-effect rounded-3xl p-6 shadow-xl"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-apple-blue to-apple-purple rounded-full flex items-center justify-center">
          <span className="text-white font-semibold text-sm">
            {name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">
            Chatting as <span className="text-apple-blue">{name}</span>
          </p>
          <p className="text-xs text-slate-500">
            {isConnected ? '🟢 Connected' : '🔴 Connecting...'}
          </p>
        </div>
      </div>

      <form onSubmit={handleMessageSubmit} className="space-y-4">
        {/* Math verification */}
        <AnimatePresence mode="wait">
          {showMath && mathProblem && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-gradient-to-r from-apple-orange/10 to-apple-red/10 border border-apple-orange/20 rounded-2xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-apple-orange" />
                <span className="text-sm font-medium text-apple-orange">
                  Anti-Bot Verification 🤖
                </span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                {mathProblem.question}
              </p>
              <input
                type="number"
                value={mathAnswer}
                onChange={(e) => setMathAnswer(e.target.value)}
                placeholder="Your answer..."
                className="input-field text-center"
                autoFocus
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message input */}
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Your message to the world 🌍
          </label>
          <div className="relative">
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message here... (Press Enter to send, Shift+Enter for new line)"
              className="input-field resize-none pr-12"
              rows={3}
              maxLength={1000}
            />
            <div className="absolute bottom-3 right-3 text-xs text-slate-400">
              {message.length}/1000
            </div>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={!message.trim() || !mathAnswer}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5 inline mr-2" />
          Send to the World! ✨
        </motion.button>
      </form>

      <div className="mt-4 text-center">
        <p className="text-xs text-slate-500">
          💡 <strong>Remember:</strong> Be kind, be respectful, and have fun! 🌟
        </p>
        <p className="text-xs text-slate-500 mt-1">
          💡 <strong>Students:</strong> ChromeBooks are for learning, not just chatting! 📚
        </p>
      </div>
    </motion.div>
  )
}
