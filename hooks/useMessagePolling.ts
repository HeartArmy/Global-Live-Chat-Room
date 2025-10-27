import { useEffect, useRef, useState } from 'react'
import { ChatMessage } from '@/types/chat'

export interface PollingOptions {
  enabled: boolean
  interval: number
  lastTimestamp: string | null
  onNewMessages: (messages: ChatMessage[]) => void
}

export function useMessagePolling(options: PollingOptions) {
  const { enabled, interval, lastTimestamp, onNewMessages } = options
  const [isPolling, setIsPolling] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastFetchRef = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      // Clear polling if disabled
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setIsPolling(false)
      return
    }

    setIsPolling(true)

    const pollMessages = async () => {
      try {
        const timestamp = lastTimestamp || lastFetchRef.current
        if (!timestamp) return

        const url = `/api/messages?afterTs=${encodeURIComponent(timestamp)}&limit=50`
        const response = await fetch(url, { cache: 'no-store' })

        if (response.ok) {
          const messages: ChatMessage[] = await response.json()
          
          if (messages.length > 0) {
            if (process.env.NODE_ENV === 'development') {
              console.log('[Polling] Fetched', messages.length, 'new messages')
            }
            
            onNewMessages(messages)
            
            // Update last fetch timestamp
            const latestMessage = messages[messages.length - 1]
            if (latestMessage?.timestamp) {
              lastFetchRef.current = String(latestMessage.timestamp)
            }
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[Polling] Error fetching messages:', error)
        }
      }
    }

    // Initial poll
    pollMessages()

    // Set up interval
    intervalRef.current = setInterval(pollMessages, interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setIsPolling(false)
    }
  }, [enabled, interval, lastTimestamp, onNewMessages])

  return { isPolling }
}
