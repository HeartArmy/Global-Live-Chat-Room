import { useEffect, useRef, useState, useCallback } from 'react'
import Pusher from 'pusher-js'
import type { Channel } from 'pusher-js'
import { ChatMessage } from '@/types/chat'
import { useDevice } from '@/contexts/DeviceContext'

export interface PusherConnectionOptions {
  enabled: boolean
  onMessage: (message: ChatMessage) => void
  onMessageEdited: (message: ChatMessage) => void
  onMessageUpdated: (message: ChatMessage) => void
  onTyping: (data: { users: string[]; count: number }) => void
  username?: string
}

export interface PusherConnectionState {
  isConnected: boolean
  connectionState: string
  error?: Error
}

export function usePusherConnection(
  options: PusherConnectionOptions
): PusherConnectionState {
  const { enabled, onMessage, onMessageEdited, onMessageUpdated, onTyping, username } = options
  const { isMobile, isIOS } = useDevice()
  
  const [connectionState, setConnectionState] = useState<string>('initialized')
  const [error, setError] = useState<Error | undefined>(undefined)
  const pusherRef = useRef<Pusher | null>(null)
  const channelRef = useRef<Channel | null>(null)
  const reconnectAttemptRef = useRef<number>(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const isConnected = connectionState === 'connected'

  // Exponential backoff reconnection
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    const attempt = reconnectAttemptRef.current
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000) // Max 30 seconds
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Pusher] Scheduling reconnect attempt ${attempt + 1} in ${delay}ms`)
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      if (pusherRef.current) {
        pusherRef.current.connect()
        reconnectAttemptRef.current++
      }
    }, delay)
  }, [])

  // Initialize Pusher connection
  useEffect(() => {
    if (!enabled) return

    const key = process.env.NEXT_PUBLIC_PUSHER_KEY
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER
    
    if (!key || !cluster) {
      console.error('[Pusher] Missing configuration')
      return
    }

    let pusher: Pusher | null = null
    let channel: Channel | null = null

    try {
      // Mobile-specific configuration
      const baseConfig = {
        cluster,
        forceTLS: true,
        disableStats: true,
      }

      // Force WebSocket-only on iOS mobile for better reliability
      if (isMobile && isIOS) {
        pusher = new Pusher(key, {
          ...baseConfig,
          enabledTransports: ['ws', 'wss'],
        } as any)
        if (process.env.NODE_ENV === 'development') {
          console.log('[Pusher] Using WebSocket-only transport for iOS')
        }
      } else {
        pusher = new Pusher(key, baseConfig)
      }
      pusherRef.current = pusher

      // Connection state monitoring
      pusher.connection.bind('state_change', (states: { previous?: string; current?: string }) => {
        const current = states?.current || 'unknown'
        setConnectionState(current)
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[Pusher] State change:', states?.previous, '->', current)
        }

        // Reset reconnect attempts on successful connection
        if (current === 'connected') {
          reconnectAttemptRef.current = 0
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
            reconnectTimeoutRef.current = null
          }
          setError(undefined)
        }

        // Schedule reconnect on failed/disconnected states
        if (current === 'failed' || current === 'unavailable') {
          scheduleReconnect()
        }
      })

      // Error handling
      pusher.connection.bind('error', (err: unknown) => {
        const errorObj = err instanceof Error ? err : new Error(String(err))
        setError(errorObj)
        
        if (process.env.NODE_ENV === 'development') {
          console.error('[Pusher] Connection error:', err)
        }
      })

      // Subscribe to channel
      channel = pusher.subscribe('chat-global')
      channelRef.current = channel

      // Bind event handlers
      channel.bind('message_created', onMessage)
      channel.bind('message_edited', onMessageEdited)
      channel.bind('message_updated', onMessageUpdated)
      channel.bind('typing_update', onTyping)

      if (process.env.NODE_ENV === 'development') {
        console.log('[Pusher] Initialized and subscribed to chat-global')
      }

    } catch (err) {
      console.error('[Pusher] Initialization error:', err)
      setError(err instanceof Error ? err : new Error(String(err)))
    }

    // Cleanup
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }

      try {
        if (channel) {
          channel.unbind('message_created', onMessage)
          channel.unbind('message_edited', onMessageEdited)
          channel.unbind('message_updated', onMessageUpdated)
          channel.unbind('typing_update', onTyping)
        }
        if (pusher) {
          pusher.disconnect()
        }
      } catch (err) {
        console.error('[Pusher] Cleanup error:', err)
      }

      pusherRef.current = null
      channelRef.current = null
    }
  }, [enabled, onMessage, onMessageEdited, onMessageUpdated, onTyping, isMobile, isIOS, scheduleReconnect])

  // Reconnect on visibility change (mobile optimization)
  useEffect(() => {
    if (!enabled || !isMobile) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (process.env.NODE_ENV === 'development') {
          console.log('[Pusher] Tab visible, refreshing connection')
        }

        const pusher = pusherRef.current
        if (pusher) {
          // Disconnect and reconnect to ensure fresh connection
          pusher.disconnect()
          setTimeout(() => {
            pusher.connect()
          }, 100)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [enabled, isMobile])

  // Reconnect on network online event (mobile optimization)
  useEffect(() => {
    if (!enabled || !isMobile) return

    const handleOnline = () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Pusher] Network online, reconnecting')
      }

      const pusher = pusherRef.current
      if (pusher) {
        pusher.connect()
      }
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [enabled, isMobile])

  return {
    isConnected,
    connectionState,
    error,
  }
}
