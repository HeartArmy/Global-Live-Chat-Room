'use client'

import { motion } from 'framer-motion'
import { formatTimestamp } from '@/lib/utils'
import { Clock } from 'lucide-react'

interface ChatMessageProps {
  message: {
    _id: string
    name: string
    message: string
    timestamp: string
  }
  isOwn: boolean
  index: number
}

export default function ChatMessage({ message, isOwn, index }: ChatMessageProps) {
  const timestamp = new Date(message.timestamp)
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.3, 
        delay: index * 0.1,
        ease: "easeOut"
      }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4 group`}
    >
      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-xs lg:max-w-md`}>
        {/* User info */}
        <div className={`flex items-center gap-2 mb-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center text-white text-sm font-semibold">
              {message.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {message.name}
            </span>
          </div>
          
          {/* Timestamp */}
          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Clock className="w-3 h-3" />
            <span>{formatTimestamp(timestamp)}</span>
          </div>
        </div>

        {/* Message bubble */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className={`
            chat-bubble relative
            ${isOwn ? 'chat-bubble-own' : 'chat-bubble-other'}
            shadow-sm hover:shadow-md transition-all duration-200
          `}
        >
          <p className="text-sm leading-relaxed break-words">
            {message.message}
          </p>
          
          {/* Decorative elements */}
          {!isOwn && (
            <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white dark:bg-slate-700 border-l border-b border-slate-200 dark:border-slate-600 transform rotate-45"></div>
          )}
          {isOwn && (
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-apple-blue border-l border-b border-blue-600 transform rotate-45"></div>
          )}
        </motion.div>

        {/* Fun indicators for different user types */}
        {message.name.toLowerCase().includes('student') || message.name.toLowerCase().includes('kid') ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-2 text-xs text-apple-orange font-medium flex items-center gap-1"
          >
            📚 Hey there! Shouldn't you be studying instead of chatting? 😄
          </motion.div>
        ) : message.name.toLowerCase().includes('teacher') || message.name.toLowerCase().includes('prof') ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-2 text-xs text-apple-green font-medium flex items-center gap-1"
          >
            🎓 Teacher in the house! Knowledge is power! 💪
          </motion.div>
        ) : message.name.toLowerCase().includes('mom') || message.name.toLowerCase().includes('dad') ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-2 text-xs text-apple-pink font-medium flex items-center gap-1"
          >
            👨‍👩‍👧‍👦 Parent alert! Hope the kids are behaving! 😊
          </motion.div>
        ) : null}
      </div>
    </motion.div>
  )
}
