'use client'

import { motion } from 'framer-motion'
import { ChatMessage as ChatMessageType, ReplyInfo } from '@/types/chat'
import { CornerUpRight } from 'lucide-react'
import { formatTimestamp, formatAbsolute } from '@/utils/timezone'
import { countryCodeToFlag } from '@/utils/geo'

interface ChatMessageProps {
  message: ChatMessageType
  currentUsername?: string
  currentUserCountry?: string
  index: number
  onReply?: (reply: ReplyInfo) => void
}

export default function ChatMessage({ message, currentUsername, currentUserCountry, index, onReply }: ChatMessageProps) {
  const isCurrentUser = message.username === currentUsername
  const text = message.message

  const imageMarkdownMatch = text.match(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/)
  const directImageUrlMatch = text.match(/^(https?:\/\/[^\s]+\.(?:png|jpe?g|webp|gif))$/i)
  const imageUrl = imageMarkdownMatch?.[1] || directImageUrlMatch?.[1]
  const previewText = imageUrl ? 'Image' : (text.length > 120 ? text.slice(0, 120) + '…' : text)
  const makeReplyInfo = (): ReplyInfo => ({
    id: message._id || `${message.username}-${message.timestamp}`,
    username: message.username,
    preview: previewText,
    imageUrl: imageUrl || undefined,
  })
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`flex mb-4 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`group flex max-w-[80%] ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <motion.div
          whileHover={{ scale: 1.1 }}
          className={`relative flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            isCurrentUser 
              ? 'bg-apple-blue text-white ml-2' 
              : 'bg-gradient-to-br from-purple-400 to-pink-400 text-white mr-2'
          }`}
        >
          {message.username.charAt(0).toUpperCase()}
        </motion.div>
        
        {/* Message bubble */}
        <div className="flex flex-col">
          {/* Username + Country flag */}
          <div
            className={`flex items-center ${isCurrentUser ? 'justify-end' : 'justify-start'} gap-1 mb-1 text-xs text-gray-500`}
          >
            <span className="inline-flex items-center gap-1">
              <span className="font-medium text-gray-700 dark:text-gray-300">{message.username}</span>
              <span
                aria-hidden
                title={message.countryCode || undefined}
                className="leading-none"
              >
                {countryCodeToFlag(message.countryCode || (isCurrentUser ? currentUserCountry : undefined))}
              </span>
            </span>
          </div>
          <div className={`relative chat-bubble ${isCurrentUser ? 'chat-bubble-user' : 'chat-bubble-other'}`}>
            {message.replyTo && (
              <div className={`mb-2 text-xs rounded-lg p-2 ${isCurrentUser ? 'bg-white/20' : 'bg-black/5 dark:bg-white/10'} border border-black/5 dark:border-white/10`}>
                <div className="font-medium opacity-80">{message.replyTo.username}</div>
                <div className="flex items-center gap-2 opacity-70 truncate">
                  {message.replyTo.imageUrl && (
                    <img src={message.replyTo.imageUrl} alt="reply" className="w-8 h-8 rounded object-cover" />
                  )}
                  <span className="truncate">{message.replyTo.preview}</span>
                </div>
              </div>
            )}
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
            {/* Removed floating corner reply button to make inline action clearer */}
          </div>
          
          {/* Metadata */}
          <div className={`flex items-center gap-2 mt-1 text-xs text-gray-500 ${
            isCurrentUser ? 'flex-row-reverse' : 'flex-row'
          }`}>
            <span title={formatAbsolute(new Date(message.timestamp))}>
              {formatTimestamp(new Date(message.timestamp))}
            </span>
            {onReply && (
              <>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => onReply(makeReplyInfo())}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60 opacity-80 group-hover:opacity-100 transition"
                >
                  <CornerUpRight size={12} />
                  <span>Reply</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
