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
  // Tunables
  const CHUNK_SIZE = 40
  const TOP_THRESHOLD = 96 // px from top to trigger loading older
  const BOTTOM_THRESHOLD = 24 // px from bottom to keep auto-follow
  const [user, setUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [stats, setStats] = useState({ onlineCount: 0, totalMessages: 0 })
  const [replyTo, setReplyTo] = useState<ReplyInfo | undefined>(undefined)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const [autoScrollLocked, setAutoScrollLocked] = useState(false)
  const [showScrollToLatest, setShowScrollToLatest] = useState(false)
  const didInitialScroll = useRef(false)
  const [countryCode, setCountryCode] = useState<string | null>(null)
  // Pagination state
  const [oldestTs, setOldestTs] = useState<string | null>(null)
  const [latestTs, setLatestTs] = useState<string | null>(null)
  const [isLoadingOlder, setIsLoadingOlder] = useState(false)
  const [hasMoreOlder, setHasMoreOlder] = useState(true)
  // Stable session id for presence tracking
  const [sessionId] = useState<string>(() => (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Helper: merge messages de-duplicated by _id (fallback to composite key)
  const mergeUnique = (
    existing: ChatMessageType[],
    additions: ChatMessageType[],
    direction: 'append' | 'prepend'
  ): ChatMessageType[] => {
    const keyOf = (m: ChatMessageType) => m._id || `${m.username}|${String(m.timestamp)}|${m.message}`
    const seen = new Set(existing.map(keyOf))
    const filtered: ChatMessageType[] = []
    for (const m of additions) {
      const k = keyOf(m)
      if (seen.has(k)) continue
      seen.add(k)
      filtered.push(m)
    }
    return direction === 'append' ? [...existing, ...filtered] : [...filtered, ...existing]
  }

  useEffect(() => {
    // Initial auto-scroll once when messages first load
    if (!didInitialScroll.current && messages.length > 0) {
      didInitialScroll.current = true
      scrollToBottom()
    } else if (isNearBottom && !autoScrollLocked) {
      // Keep following the bottom when near it and not locked
      scrollToBottom()
    }
  }, [messages, isNearBottom, autoScrollLocked])

  // Toggle the visibility of the "Scroll to latest" chip based on position and new messages
  useEffect(() => {
    if (isNearBottom) {
      // If user is at/near bottom, hide the chip
      setShowScrollToLatest(false)
    }
  }, [isNearBottom])

  useEffect(() => {
    // When new messages arrive and the user is NOT near bottom, prompt with the chip
    if (!isNearBottom && messages.length > 0) {
      setShowScrollToLatest(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length])

  // Fetch messages on component mount
  useEffect(() => {
    loadInitial()
    fetchStats()
    // fetch country (privacy-friendly; no IP stored)
    fetch('/api/geo')
      .then((r) => r.json()).then((d) => setCountryCode(d?.countryCode || null)).catch(() => {})
    
    // Poll for new messages every 3 seconds
    const interval = setInterval(() => {
      pollNewer()
      fetchStats()
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  // Load latest chunk initially
  const loadInitial = async () => {
    try {
      const res = await fetch(`/api/messages?limit=${CHUNK_SIZE}`, { cache: 'no-store' })
      if (res.ok) {
        const data: ChatMessageType[] = await res.json()
        // Replace with initial chunk
        setMessages(data)
        setOldestTs(data[0]?.timestamp ? String(data[0].timestamp) : null)
        setLatestTs(data[data.length - 1]?.timestamp ? String(data[data.length - 1].timestamp) : null)
        // If fewer than requested, no more older messages
        setHasMoreOlder(data.length >= CHUNK_SIZE)
      }
    } catch {}
    finally {
      setIsLoading(false)
    }
  }

  // Fetch older messages before current oldestTs and prepend, preserving scroll position
  const loadOlder = async () => {
    if (isLoadingOlder || !hasMoreOlder || !oldestTs) return
    const container = messagesContainerRef.current
    if (!container) return
    setIsLoadingOlder(true)
    const prevScrollHeight = container.scrollHeight
    try {
      const url = `/api/messages?beforeTs=${encodeURIComponent(oldestTs)}&limit=${CHUNK_SIZE}`
      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) {
        const older: ChatMessageType[] = await res.json()
        if (older.length === 0) {
          setHasMoreOlder(false)
        } else {
          setMessages(prev => mergeUnique(prev, older, 'prepend'))
          setOldestTs(older[0]?.timestamp ? String(older[0].timestamp) : oldestTs)
          // Preserve the viewport position after DOM grows
          requestAnimationFrame(() => {
            const newScrollHeight = container.scrollHeight
            container.scrollTop = newScrollHeight - prevScrollHeight + container.scrollTop
          })
        }
      }
    } catch {}
    finally {
      setIsLoadingOlder(false)
    }
  }

  // Poll for new messages newer than latestTs and append
  const pollNewer = async () => {
    if (!latestTs) return
    try {
      const url = `/api/messages?afterTs=${encodeURIComponent(latestTs)}&limit=${CHUNK_SIZE}`
      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) {
        const newer: ChatMessageType[] = await res.json()
        if (newer.length > 0) {
          setMessages(prev => mergeUnique(prev, newer, 'append'))
          setLatestTs(String(newer[newer.length - 1].timestamp))
        }
      }
    } catch {}
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats', { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      // swallow errors in UI
    }
  }

  const handleSendMessage = async (message: string, reply?: ReplyInfo) => {
    if (!user || isSending) return

    setIsSending(true)
    try {
      // Ensure we have a country code; fetch on-demand if missing
      let cc = countryCode
      if (!cc) {
        try {
          const r = await fetch('/api/geo', { cache: 'no-store' })
          if (r.ok) {
            const d = await r.json()
            cc = (d?.countryCode as string | null) || null
          }
        } catch {}
      }
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: user.username,
          message,
          countryCode: cc || undefined,
          replyTo: reply || undefined,
        }),
      })

      if (response.ok) {
        const newMessage = await response.json()
        setMessages(prev => mergeUnique(prev, [newMessage], 'append'))
        // Update latestTs to the newly sent message timestamp
        if (newMessage?.timestamp) {
          setLatestTs(String(newMessage.timestamp))
        }
        setReplyTo(undefined)
        fetchStats() // Update stats after sending
      } else {
        const error = await response.json()
        // swallow errors in UI
        // Could show a toast notification here
      }
    } catch (error) {
      // swallow errors in UI
    } finally {
      setIsSending(false)
    }
  }

  const handleAuth = (authenticatedUser: User) => {
    setUser(authenticatedUser)
    // On login, jump to latest and unlock autoscroll
    requestAnimationFrame(() => {
      didInitialScroll.current = true
      setIsNearBottom(true)
      setAutoScrollLocked(false)
      scrollToBottom()
    })
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
    <div className="h-screen overflow-hidden bg-gradient-to-br from-pastel-ink via-shimmer-white to-pastel-gray flex flex-col">
      <Header onlineCount={stats.onlineCount} totalMessages={stats.totalMessages} username={user?.username} countryCode={countryCode || undefined} />
      
      <main className="flex-1 min-h-0 flex flex-col max-w-4xl mx-auto w-full">
        {/* Messages area */}
        <div
          className="relative flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-1"
          ref={messagesContainerRef}
          onScroll={(e) => {
            const el = e.currentTarget
            const threshold = BOTTOM_THRESHOLD // px from bottom for auto-follow
            const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
            setIsNearBottom(atBottom)
            setAutoScrollLocked(!atBottom)
            // Do not toggle chip visibility here; it should only appear on new messages
            // If near the top, load older messages
            const topThreshold = TOP_THRESHOLD
            if (el.scrollTop <= topThreshold) {
              loadOlder()
            }
          }}
        >
          {/* Top loader for older messages */}
          {isLoadingOlder && (
            <div className="flex items-center justify-center py-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-5 h-5 border-2 border-apple-blue border-t-transparent rounded-full opacity-70"
              />
            </div>
          )}
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
                  currentUserCountry={countryCode || undefined}
                  index={index}
                  onReply={(info) => setReplyTo(info)}
                />
              ))}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
          {/* Scroll to latest chip */}
          {showScrollToLatest && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={() => {
                scrollToBottom()
                setAutoScrollLocked(false)
                setShowScrollToLatest(false)
              }}
              className="absolute left-1/2 -translate-x-1/2 bottom-24 sm:bottom-28 px-3 py-2 rounded-full shadow-lg backdrop-blur-md bg-black/60 dark:bg-white/10 border border-white/20 text-white hover:bg-black/70 transition-colors flex items-center gap-2"
              aria-label="Scroll to latest"
            >
              <span className="text-sm">Scroll to latest</span>
            </motion.button>
          )}

        </div>

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
