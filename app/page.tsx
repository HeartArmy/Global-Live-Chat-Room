'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AuthModal from '@/components/AuthModal'
import ChatMessage from '@/components/ChatMessage'
import ChatInput from '@/components/ChatInput'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { ChatMessage as ChatMessageType, User, ReplyInfo } from '@/types/chat'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [stats, setStats] = useState({ onlineCount: 0, totalMessages: 0 })
  const [replyTo, setReplyTo] = useState<ReplyInfo | undefined>(undefined)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [isNearBottom, setIsNearBottom] = useState(true)
  // Stable session id for presence tracking
  const [sessionId] = useState<string>(() => (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    // Only autoscroll if user is near bottom or if the last message is from current user
    const last = messages[messages.length - 1]
    const authoredBySelf = last && user?.username && last.username === user.username
    if (isNearBottom || authoredBySelf) {
      scrollToBottom()
    }
  }, [messages, isNearBottom, user?.username])

  // Fetch messages on component mount
  useEffect(() => {
    fetchMessages()
    fetchStats()
    
    // Poll for new messages every 3 seconds
    const interval = setInterval(() => {
      fetchMessages()
      fetchStats()
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/messages')
      if (response.ok) {
        const data = await response.json()
        setMessages(data)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleSendMessage = async (message: string, reply?: ReplyInfo) => {
    if (!user || isSending) return

    setIsSending(true)
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: user.username,
          message,
          replyTo: reply || undefined,
        }),
      })

      if (response.ok) {
        const newMessage = await response.json()
        setMessages(prev => [...prev, newMessage])
        setReplyTo(undefined)
        fetchStats() // Update stats after sending
      } else {
        const error = await response.json()
        console.error('Error sending message:', error)
        // Could show a toast notification here
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleAuth = (authenticatedUser: User) => {
    setUser(authenticatedUser)
  }

  // Presence heartbeat: ping server every 15s and on visibility changes
  useEffect(() => {
    let stopped = false

    const postPresence = async () => {
      try {
        await fetch('/api/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, username: user?.username }),
          keepalive: true,
        })
      } catch (e) {
        // swallow errors; heartbeat is best-effort
      }
    }

    // initial ping
    postPresence()

    const interval = setInterval(() => {
      if (!stopped && document.visibilityState === 'visible') {
        postPresence()
      }
    }, 15000)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') postPresence()
    }
    document.addEventListener('visibilitychange', onVisibility)

    const onUnload = () => {
      try {
        const payload = JSON.stringify({ sessionId, username: user?.username })
        if (navigator.sendBeacon) {
          const blob = new Blob([payload], { type: 'application/json' })
          navigator.sendBeacon('/api/presence', blob)
        } else {
          // best-effort
          fetch('/api/presence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true })
        }
      } catch {}
    }
    window.addEventListener('pagehide', onUnload)
    window.addEventListener('beforeunload', onUnload)

    return () => {
      stopped = true
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onUnload)
      window.removeEventListener('beforeunload', onUnload)
    }
  }, [sessionId, user?.username])

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-apple-dark dark:to-gray-800 flex flex-col">
      <Header onlineCount={stats.onlineCount} totalMessages={stats.totalMessages} />
      
      <main className="flex-1 min-h-0 flex flex-col max-w-4xl mx-auto w-full">
        {/* Messages area */}
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-1"
          ref={messagesContainerRef}
          onScroll={(e) => {
            const el = e.currentTarget
            const threshold = 100 // px from bottom
            const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
            setIsNearBottom(atBottom)
          }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 border-2 border-apple-blue border-t-transparent rounded-full"
              />
            </div>
          ) : messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-64 text-center"
            >
              <div className="text-6xl mb-4">🌍</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome to the World!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-md">
                Be the first to start a conversation! Share your thoughts with people from around the globe.
              </p>
            </motion.div>
          ) : (
            <AnimatePresence>
              {messages.map((message, index) => (
                <ChatMessage
                  key={message._id || index}
                  message={message}
                  currentUsername={user?.username}
                  index={index}
                  onReply={(info) => setReplyTo(info)}
                />
              ))}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat input */}
        {user ? (
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={isSending}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(undefined)}
          />
        ) : (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="p-4 text-center"
          >
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Join the conversation! Enter your name to start chatting with the world.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {/* AuthModal will handle this */}}
              className="btn-primary"
            >
              Start Chatting
            </motion.button>
          </motion.div>
        )}
      </main>

      <Footer />

      {/* Auth Modal */}
      <AuthModal isOpen={!user} onAuth={handleAuth} />
    </div>
  )
}
