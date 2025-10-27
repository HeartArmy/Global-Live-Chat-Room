'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'

interface ConnectionStatusProps {
  connectionState: string
  isOnline: boolean
  isPolling?: boolean
  onReconnect?: () => void
}

export default function ConnectionStatus({ 
  connectionState, 
  isOnline,
  isPolling = false,
  onReconnect 
}: ConnectionStatusProps) {
  // Don't show anything if connected and online (unless polling)
  if (connectionState === 'connected' && isOnline && !isPolling) {
    return null
  }

  // Determine status
  let status: 'offline' | 'disconnected' | 'connecting' | 'failed' | 'polling' = 'connecting'
  let message = 'Connecting...'
  let color = 'bg-yellow-500'
  let icon = <RefreshCw size={12} className="animate-spin" />

  if (isPolling) {
    status = 'polling'
    message = 'Using fallback mode'
    color = 'bg-orange-500'
    icon = <RefreshCw size={12} className="animate-spin" />
  } else if (!isOnline) {
    status = 'offline'
    message = 'Offline'
    color = 'bg-gray-500'
    icon = <WifiOff size={12} />
  } else if (connectionState === 'failed' || connectionState === 'unavailable') {
    status = 'failed'
    message = 'Connection issues'
    color = 'bg-red-500'
    icon = <WifiOff size={12} />
  } else if (connectionState === 'disconnected') {
    status = 'disconnected'
    message = 'Reconnecting...'
    color = 'bg-yellow-500'
    icon = <RefreshCw size={12} className="animate-spin" />
  } else if (connectionState === 'connecting') {
    status = 'connecting'
    message = 'Connecting...'
    color = 'bg-yellow-500'
    icon = <RefreshCw size={12} className="animate-spin" />
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/10"
      >
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-xs text-gray-200">{message}</span>
        {icon}
        
        {/* Manual reconnect button for failed state */}
        {status === 'failed' && onReconnect && (
          <button
            onClick={onReconnect}
            className="ml-1 px-2 py-0.5 text-xs rounded bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors"
            aria-label="Retry connection"
          >
            Retry
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
