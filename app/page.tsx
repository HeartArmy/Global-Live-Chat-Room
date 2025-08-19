'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Pusher from 'pusher-js'
import type { Channel } from 'pusher-js'
import { motion, AnimatePresence } from 'framer-motion'
import AuthModal from '@/components/AuthModal'
import ChatMessage from '@/components/ChatMessage'
import ChatInput from '@/components/ChatInput'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { ChatMessage as ChatMessageType, User, ReplyInfo } from '@/types/chat'

export default function Home() {
  // Tunables
  const CHUNK_SIZE = 500
  const BOTTOM_THRESHOLD = 24 // px from bottom to keep auto-follow
  const [user, setUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [stats, setStats] = useState({ onlineCount: 0, totalMessages: 0 })
  const [replyTo, setReplyTo] = useState<ReplyInfo | undefined>(undefined)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const [autoScrollLocked, setAutoScrollLocked] = useState(false)
  const [showScrollToLatest, setShowScrollToLatest] = useState(false)
  const didInitialScroll = useRef(false)
  const [countryCode, setCountryCode] = useState<string | null>(null)
  // Removed time rate-limit; rely on isLoadingOlder guard
  // Pagination state
  const [oldestTs, setOldestTs] = useState<string | null>(null)
  const [oldestId, setOldestId] = useState<string | null>(null)
  const [latestTs, setLatestTs] = useState<string | null>(null)
  const [isLoadingOlder, setIsLoadingOlder] = useState(false)
  const [hasMoreOlder, setHasMoreOlder] = useState(true)
  // Stable session id for presence tracking
  const [sessionId] = useState<string>(() => (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)
  // Typing indicator state
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const lastTypingPostRef = useRef(0)
  const lastTypingStateRef = useRef<boolean>(false)
  // Realtime handled solely by Pusher (no SSE/polling)

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  const scrollToBottomInstant = () => {
    const container = messagesContainerRef.current
    if (!container) return
    // Jump instantly to bottom without animation
    container.scrollTop = container.scrollHeight
  }

  // Helper: merge messages de-duplicated by _id (fallback to composite key)
  const mergeUnique = (
    existing: ChatMessageType[],
    additions: ChatMessageType[],
    direction: 'append' | 'prepend'
  ): ChatMessageType[] => {
    const keyOf = (m: ChatMessageType) => m._id || `${m.username}|${String(m.timestamp)}|${m.message}`
    const indexByKey = new Map(existing.map((m, i) => [keyOf(m), i]))
    const result = [...existing]
    const toAdd: ChatMessageType[] = []
    for (const m of additions) {
      const k = keyOf(m)
      const idx = indexByKey.get(k)
      if (idx !== undefined) {
        // Replace existing with updated version (e.g., edited or reactions changed)
        result[idx] = { ...result[idx], ...m }
      } else {
        toAdd.push(m)
      }
    }
    return direction === 'append' ? [...result, ...toAdd] : [...toAdd, ...result]
  }

  useEffect(() => {
    // Initial jump to latest once when messages first load (no visible scroll animation)
    if (!didInitialScroll.current && messages.length > 0) {
      didInitialScroll.current = true
      scrollToBottomInstant()
    } else if (isNearBottom && !autoScrollLocked) {
      // Keep following the bottom when near it and not locked (smooth)
      scrollToBottom()
    }
  }, [messages, isNearBottom, autoScrollLocked])

  // Toggle the visibility of the "Scroll to latest" chip based on position and new messages
  useEffect(() => {
    setShowScrollToLatest(!isNearBottom)
  }, [isNearBottom])

  // (mount effect moved below, after fetchStats declaration)

  // Load latest chunk initially
  const loadInitial = async () => {
    try {
      const res = await fetch(`/api/messages?limit=${CHUNK_SIZE}`, { cache: 'no-store' })
      if (res.ok) {
        const data: ChatMessageType[] = await res.json()
        // Replace with initial chunk
        setMessages(data)
        setOldestTs(data[0]?.timestamp ? String(data[0].timestamp) : null)
        setOldestId(data[0]?._id ? String(data[0]._id) : null)
        setLatestTs(data[data.length - 1]?.timestamp ? String(data[data.length - 1].timestamp) : null)
        // If fewer than requested, no more older messages
        setHasMoreOlder(data.length >= CHUNK_SIZE)
      }
    } catch {}
    finally {
      setIsLoading(false)
    }
  }


  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/stats', { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch {
      // swallow errors in UI
    }
  }, [])

  // Fetch messages on component mount
  useEffect(() => {
    loadInitial()
    fetchStats()
    // fetch country (privacy-friendly; no IP stored)
    fetch('/api/geo')
      .then((r) => r.json()).then((d) => setCountryCode(d?.countryCode || null)).catch(() => {})
  }, [fetchStats])

  // (moved below loadOlder)

  // SSE removed: Pusher-only realtime

  // Pusher Channels subscription for cross-instance realtime
  useEffect(() => {
    // Configure from env via NEXT_PUBLIC_*
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER
    if (!key || !cluster) return

    // Avoid duplicate connections
    let pusher: Pusher | null = null
    let channel: Channel | null = null

    try {
      pusher = new Pusher(key, {
        cluster,
        forceTLS: true,
        enabledTransports: ['ws', 'wss'],
      })

      // Optional: silence logs in production
      // Pusher.logToConsole = false

      channel = pusher.subscribe('chat-global')

      const handleMerge = (incoming: ChatMessageType) => {
        try {
          const msg = incoming
          setMessages(prev => {
            const filtered = prev.filter(m => {
              if (msg.clientTempId && m.clientTempId === msg.clientTempId) return false
              if (msg._id && m._id === msg._id) return false
              return true
            })
            return mergeUnique(filtered, [msg], 'append')
          })
          setLatestTs(prevTs => {
            const prevTime = prevTs ? new Date(prevTs).getTime() : 0
            const t1 = new Date(String(msg.timestamp)).getTime()
            const t2 = msg.updatedAt ? new Date(String(msg.updatedAt)).getTime() : t1
            const maxTs = Math.max(prevTime, t1, t2)
            return maxTs > prevTime ? new Date(maxTs).toISOString() : (prevTs || null)
          })
        } catch {}
      }

      const onCreated = (data: ChatMessageType) => handleMerge(data)
      const onEdited = (data: ChatMessageType) => handleMerge(data)
      const onUpdated = (data: ChatMessageType) => handleMerge(data)
      const onTyping = (data: { users: string[]; count: number }) => {
        try {
          setTypingUsers((data.users || []).filter(u => u && u !== (user?.username || '')))
        } catch {}
      }

      channel.bind('message_created', onCreated)
      channel.bind('message_edited', onEdited)
      channel.bind('message_updated', onUpdated)
      channel.bind('typing_update', onTyping)

      return () => {
        try {
          channel?.unbind('message_created', onCreated)
          channel?.unbind('message_edited', onEdited)
          channel?.unbind('message_updated', onUpdated)
          channel?.unbind('typing_update', onTyping)
          // Avoid unsubscribe() on closing/closed sockets; disconnect handles teardown safely
          if (pusher) pusher.disconnect()
        } catch {}
      }
    } catch {
      return
    }
  }, [user?.username])

  // Fetch older messages before current oldestTs and prepend, preserving scroll position
  const loadOlder = useCallback(async () => {
    if (isLoadingOlder || !hasMoreOlder || !oldestTs) return
    const container = messagesContainerRef.current
    if (!container) return
    setIsLoadingOlder(true)
    const prevScrollHeight = container.scrollHeight
    const prevScrollTop = container.scrollTop
    try {
      const url = `/api/messages?beforeTs=${encodeURIComponent(oldestTs)}${oldestId ? `&beforeId=${encodeURIComponent(oldestId)}` : ''}&limit=${CHUNK_SIZE}`
      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) {
        let older: ChatMessageType[] = await res.json()
        // Ensure stable chronological order before prepending
        older = older.sort((a, b) => new Date(String(a.timestamp)).getTime() - new Date(String(b.timestamp)).getTime())
        if (older.length === 0) {
          setHasMoreOlder(false)
        } else {
          setMessages(prev => mergeUnique(prev, older, 'prepend'))
          setOldestTs(older[0]?.timestamp ? String(older[0].timestamp) : oldestTs)
          setOldestId(older[0]?._id ? String(older[0]._id) : oldestId)
          // Preserve the viewport position after DOM grows (ensure after React commit)
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              const newScrollHeight = container.scrollHeight
              const delta = newScrollHeight - prevScrollHeight
              container.scrollTop = prevScrollTop + delta
            })
          })
          // If the server returned fewer than a full page, we've reached the beginning
          if (older.length < CHUNK_SIZE) {
            setHasMoreOlder(false)
          }
        }
      }
    } catch {}
    finally {
      setIsLoadingOlder(false)
    }
  }, [CHUNK_SIZE, hasMoreOlder, isLoadingOlder, oldestId, oldestTs])

  // (moved pollNewer and fetchStats above)

  // Observe top sentinel to auto-load older consistently (placed after loadOlder)
  useEffect(() => {
    const root = messagesContainerRef.current
    const target = topSentinelRef.current
    if (!root || !target) return
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (!isLoadingOlder && hasMoreOlder && oldestTs) {
              loadOlder()
            }
          }
        }
      },
      { root, threshold: 0.1 }
    )
    obs.observe(target)
    return () => obs.disconnect()
  }, [loadOlder, isLoadingOlder, hasMoreOlder, oldestTs])

  const handleSendMessage = async (message: string, reply?: ReplyInfo, html?: string) => {
    if (!user || isSending) return

    setIsSending(true)
    try {
      // Optimistic UI FIRST: add a temporary message immediately (no blocking geo fetch)
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const tz = (Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone) || 'UTC'
      const tempMessage: ChatMessageType = {
        _id: tempId,
        clientTempId: tempId,
        username: user.username,
        message,
        html: html && html.trim().length ? html : undefined,
        timestamp: new Date(),
        timezone: tz,
        countryCode: countryCode || undefined,
        replyTo: reply || undefined,
      }
      setMessages(prev => mergeUnique(prev, [tempMessage], 'append'))
      setLatestTs(String(tempMessage.timestamp))
      // Ensure the new message is visible immediately (no smooth animation)
      scrollToBottomInstant()

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: user.username,
          message,
          html: html && html.trim().length ? html : undefined,
          countryCode: countryCode || undefined,
          replyTo: reply || undefined,
          clientTempId: tempId,
        }),
      })

      if (response.ok) {
        const newMessage = await response.json()
        // Reconcile: remove any duplicate with same _id (from SSE/poll), drop temp, then add one canonical
        setMessages(prev => {
          const filtered = prev.filter(m => m._id !== tempId && m._id !== newMessage._id && m.clientTempId !== newMessage.clientTempId)
          return mergeUnique(filtered, [newMessage], 'append')
        })
        if (newMessage?.timestamp) setLatestTs(String(newMessage.timestamp))
        setReplyTo(undefined)
      } else {
        await response.json().catch(() => ({}))
        // Remove optimistic message on failure
        setMessages(prev => prev.filter(m => m._id !== tempId))
        // swallow errors in UI
        // Could show a toast notification here
      }
    } catch {
      // Rollback optimistic message on error
      setMessages(prev => prev.filter(m => (m._id || '').startsWith('temp-') === false))
      // swallow errors in UI
    } finally {
      setIsSending(false)
    }
  }

  const handleAuth = (authenticatedUser: User) => {
    setUser(authenticatedUser)
    // Do not force a scroll on login; initial render already positioned at latest
    requestAnimationFrame(() => {
      setIsNearBottom(true)
      setAutoScrollLocked(false)
      // Ensure latest is visible after closing auth/math modal
      scrollToBottomInstant()
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
      } catch {
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

  // Post typing indicator (debounced and state-deduped)
  const postTyping = useCallback(async (isTyping: boolean) => {
    if (!user) return
    const now = Date.now()
    // Debounce to ~400ms; also refresh a 'true' ping every 2s even if state unchanged
    if (lastTypingStateRef.current === isTyping) {
      const minGap = 400
      const refreshGap = isTyping ? 2000 : minGap
      if (now - lastTypingPostRef.current < refreshGap) return
    }
    lastTypingStateRef.current = isTyping
    lastTypingPostRef.current = now
    try {
      await fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, username: user.username, isTyping }),
        keepalive: true,
      })
    } catch {}
  }, [sessionId, user])

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-pastel-ink via-shimmer-white to-pastel-gray flex flex-col">
      <Header onlineCount={stats.onlineCount} totalMessages={stats.totalMessages} username={user?.username} countryCode={countryCode || undefined} />
      
      <main className="flex-1 min-h-0 flex flex-col max-w-4xl mx-auto w-full overflow-x-hidden">
        {/* Messages area */}
        <div
          className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-4 space-y-1"
          ref={messagesContainerRef}
          onScroll={(e) => {
            const el = e.currentTarget
            const threshold = BOTTOM_THRESHOLD // px from bottom for auto-follow
            const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
            setIsNearBottom(atBottom)
            setAutoScrollLocked(!atBottom)
            // Chip visibility is handled by isNearBottom effect
          }}
        >
          {/* Top sentinel for consistent older-loading */}
          <div ref={topSentinelRef} className="h-px" />
          {/* Beginning marker as inline banner (non-sticky) */}
          {!hasMoreOlder && (
            <div className="py-2 flex justify-center">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/20 dark:bg-white/10 backdrop-blur border border-white/10 text-gray-300">You’ve reached the beginning</span>
            </div>
          )}
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
                  key={message._id || `${message.username}-${String(message.timestamp)}`}
                  message={message}
                  currentUsername={user?.username}
                  currentUserCountry={countryCode || undefined}
                  index={index}
                  onReply={(info) => setReplyTo(info)}
                  onEdited={(updated) => {
                    setMessages(prev => prev.map(m => (m._id === updated._id ? { ...m, ...updated } : m)))
                  }}
                  onToggleReaction={async (id, emoji) => {
                    try {
                      const res = await fetch('/api/messages/reactions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id, username: user?.username, emoji }),
                      })
                      if (res.ok) {
                        const data = await res.json()
                        return data.reactions
                      }
                    } catch {}
                    return undefined
                  }}
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

        {/* Typing indicator (more noticeable without crowding) */}
        {typingUsers.length > 0 && (
          <div className="px-4 pb-2 -mt-1">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/10 dark:bg-white/10 border border-white/10 text-[12px] sm:text-[11px] text-gray-800 dark:text-gray-200">
              <span className="relative inline-flex items-center">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                <span className="flex gap-1 ml-1">
                  <span className="h-1 w-1 rounded-full bg-gray-500/80 animate-bounce [animation-delay:0ms]" />
                  <span className="h-1 w-1 rounded-full bg-gray-500/80 animate-bounce [animation-delay:120ms]" />
                  <span className="h-1 w-1 rounded-full bg-gray-500/80 animate-bounce [animation-delay:240ms]" />
                </span>
              </span>
              <span>
                {(() => {
                  const names = typingUsers.slice(0, 3)
                  const remaining = typingUsers.length - names.length
                  const nameList = names.join(', ')
                  if (remaining > 0) return `${nameList} and ${remaining} other${remaining > 1 ? 's' : ''} are typing…`
                  if (names.length === 1) return `${names[0]} is typing…`
                  if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`
                  return `${nameList} are typing…`
                })()}
              </span>
            </div>
          </div>
        )}

        {/* Realtime status indicator removed per request */}

          {user ? (
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={false}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(undefined)}
            onTyping={(isTyping) => postTyping(isTyping)}
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
