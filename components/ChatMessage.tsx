'use client'

import { motion } from 'framer-motion'
import { ChatMessage as ChatMessageType } from '@/types/chat'
import { formatTimestamp } from '@/utils/timezone'

interface ChatMessageProps {
  message: ChatMessageType
  currentUsername?: string
  index: number
}

export default function ChatMessage({ message, currentUsername, index }: ChatMessageProps) {
  const isCurrentUser = message.username === currentUsername
  const text = message.message

  const imageMarkdownMatch = text.match(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/)
  const directImageUrlMatch = text.match(/^(https?:\/\/[^\s]+\.(?:png|jpe?g|webp|gif))$/i)
  const imageUrl = imageMarkdownMatch?.[1] || directImageUrlMatch?.[1]
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`flex mb-4 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`flex max-w-[80%] ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <motion.div
          whileHover={{ scale: 1.1 }}
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            isCurrentUser 
              ? 'bg-apple-blue text-white ml-2' 
              : 'bg-gradient-to-br from-purple-400 to-pink-400 text-white mr-2'
          }`}
        >
          {message.username.charAt(0).toUpperCase()}
        </motion.div>
        
        {/* Message bubble */}
        <div className="flex flex-col">
          <div className={`chat-bubble ${isCurrentUser ? 'chat-bubble-user' : 'chat-bubble-other'}`}>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="uploaded image"
                className="rounded-xl max-w-[280px] h-auto"
                loading="lazy"
              />
            ) : (
              <p className="text-sm leading-relaxed">{text}</p>
            )}
          </div>
          
          {/* Metadata */}
          <div className={`flex items-center gap-2 mt-1 text-xs text-gray-500 ${
            isCurrentUser ? 'flex-row-reverse' : 'flex-row'
          }`}>
            <span className="font-medium">{message.username}</span>
            <span>•</span>
            <span>{formatTimestamp(new Date(message.timestamp))}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
