'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Users, Globe, MessageSquare, Wifi, WifiOff } from 'lucide-react'
import ChatHeader from '@/components/ChatHeader'
import ChatMessage from '@/components/ChatMessage'
import ChatInput from '@/components/ChatInput'
import ChatStats from '@/components/ChatStats'
import { getRandomWelcomeMessage, getRandomFunFact } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Message {
  _id: string
  name: string
  message: string
  timestamp: string
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [currentUser, setCurrentUser] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [showStats, setShowStats] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [funFact, setFunFact] = useState('')

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch('/api/chat')
        const data = await response.json()
        setMessages(data.messages || [])
        setIsLoading(false)
      } catch (error) {
        console.error('Error fetching messages:', error)
        setIsLoading(false)
      }
    }

    fetchMessages()
    setWelcomeMessage(getRandomWelcomeMessage())
    setFunFact(getRandomFunFact())
  }, [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Simulate real-time connection
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsConnected(true)
      toast.success('Connected to Global Chat! 🌍')
    }, 1500)

    return () => clearTimeout(timer)
  }, [])



  const handleSendMessage = async (name: string, message: string) => {
    if (!message.trim()) return

    const newMessage: Message = {
      _id: Date.now().toString(),
      name,
      message,
      timestamp: new Date().toISOString()
    }

    // Add message locally first for immediate feedback
    setMessages(prev => [...prev, newMessage])
    setCurrentUser(name)

    try {
      // Send to API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          message,
          mathAnswer: 0, // This will be validated on the server
          timestamp: newMessage.timestamp
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message. Please try again.')
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <ChatHeader />

        {/* Connection Status */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-6"
        >
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
            isConnected 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
          }`}>
            {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {isConnected ? 'Connected to Global Chat' : 'Connecting...'}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Chat Messages - Takes 3 columns on large screens */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="glass-effect rounded-3xl p-6 shadow-xl h-[600px] flex flex-col"
            >
              {/* Messages Header */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-apple-blue to-apple-purple rounded-full flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      Global Chat Room
                    </h3>
                    <p className="text-sm text-slate-500">
                      {messages.length} messages • {new Set(messages.map(m => m.name)).size} users
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={scrollToBottom}
                  className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>

              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto scrollbar-hide mb-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-apple-blue mx-auto mb-4"></div>
                      <p className="text-slate-500">Loading global messages...</p>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12">
                    <Globe className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-500 mb-2">No messages yet</h3>
                    <p className="text-slate-400">Be the first to start the global conversation! 🌍</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <ChatMessage
                        key={message._id}
                        message={message}
                        isOwn={message.name === currentUser}
                        index={index}
                      />
                    ))}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Welcome Message */}
              {welcomeMessage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1 }}
                  className="text-center py-3 bg-gradient-to-r from-apple-blue/10 to-apple-purple/10 rounded-2xl border border-apple-blue/20"
                >
                  <p className="text-sm text-apple-blue font-medium">{welcomeMessage}</p>
                </motion.div>
              )}

              {/* Fun Fact */}
              {funFact && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.5 }}
                  className="text-center py-2 bg-gradient-to-r from-apple-yellow/10 to-apple-orange/10 rounded-2xl border border-apple-yellow/20 mt-2"
                >
                  <p className="text-xs text-apple-orange">{funFact}</p>
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Right Sidebar - Takes 1 column on large screens */}
          <div className="lg:col-span-1 space-y-6">
            {/* Chat Input */}
            <ChatInput onSendMessage={handleSendMessage} isConnected={isConnected} />

            {/* Stats Toggle */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="text-center"
            >
              <button
                onClick={() => setShowStats(!showStats)}
                className="btn-secondary w-full"
              >
                {showStats ? 'Hide' : 'Show'} Chat Statistics 📊
              </button>
            </motion.div>

            {/* Chat Stats */}
            <AnimatePresence mode="wait">
              {showStats && <ChatStats />}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="text-center mt-12 pt-8 border-t border-slate-200 dark:border-slate-700"
        >
          <p className="text-slate-500 text-sm">
            🌍 <strong>Global Live Chat</strong> - Connecting the world, one message at a time
          </p>
          <p className="text-slate-400 text-xs mt-2">
            💡 Students: Finish your homework! 📚 | 💡 Teachers: You're awesome! 🎓 | 💡 Parents: Keep the kids in line! 👨‍👩‍👧‍👦
          </p>
          <p className="text-slate-400 text-xs mt-1">
            💬 Suggestions? Contact: arhampersonal at icloud dot com
          </p>
        </motion.footer>
      </div>
    </div>
  )
}
