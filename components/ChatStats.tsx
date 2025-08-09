'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, MessageSquare, TrendingUp, Globe, Clock, Star } from 'lucide-react'

interface ChatStats {
  totalMessages: number
  uniqueUsers: number
  recentMessages: number
  mostActiveUsers: Array<{ _id: string; count: number }>
  hourlyStats: Array<{ _id: number; count: number }>
  lastUpdated: string
}

export default function ChatStats() {
  const [stats, setStats] = useState<ChatStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/chat/stats')
        const data = await response.json()
        setStats(data)
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-effect rounded-3xl p-6 shadow-xl"
      >
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
        </div>
      </motion.div>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-effect rounded-3xl p-6 shadow-xl"
    >
      <div className="text-center mb-6">
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
          className="w-12 h-12 bg-gradient-to-br from-apple-green to-apple-blue rounded-full flex items-center justify-center mx-auto mb-3"
        >
          <TrendingUp className="w-6 h-6 text-white" />
        </motion.div>
        <h3 className="text-xl font-bold text-gradient">Live Chat Statistics 📊</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Real-time stats from around the world
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total Messages */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="bg-gradient-to-br from-apple-blue/10 to-apple-purple/10 border border-apple-blue/20 rounded-2xl p-4 text-center"
        >
          <MessageSquare className="w-8 h-8 text-apple-blue mx-auto mb-2" />
          <div className="text-2xl font-bold text-apple-blue">{stats.totalMessages.toLocaleString()}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Total Messages</div>
        </motion.div>

        {/* Unique Users */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="bg-gradient-to-br from-apple-green/10 to-apple-blue/10 border border-apple-green/20 rounded-2xl p-4 text-center"
        >
          <Users className="w-8 h-8 text-apple-green mx-auto mb-2" />
          <div className="text-2xl font-bold text-apple-green">{stats.uniqueUsers.toLocaleString()}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Unique Users</div>
        </motion.div>

        {/* Recent Messages */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="bg-gradient-to-br from-apple-orange/10 to-apple-red/10 border border-apple-orange/20 rounded-2xl p-4 text-center"
        >
          <Clock className="w-8 h-8 text-apple-orange mx-auto mb-2" />
          <div className="text-2xl font-bold text-apple-orange">{stats.recentMessages.toLocaleString()}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Last 24h</div>
        </motion.div>
      </div>

      {/* Most Active Users */}
      {stats.mostActiveUsers.length > 0 && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
            <Star className="w-5 h-5 text-apple-yellow" />
            Top Chat Champions 🏆
          </h4>
          <div className="space-y-2">
            {stats.mostActiveUsers.slice(0, 5).map((user, index) => (
              <motion.div
                key={user._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between bg-white/50 dark:bg-slate-700/50 rounded-xl p-3"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                    index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                    index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                    index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800' :
                    'bg-gradient-to-br from-apple-blue to-apple-purple'
                  }`}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : (index + 1)}
                  </div>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {user._id}
                  </span>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {user.count} messages
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Fun Facts */}
      <div className="bg-gradient-to-r from-apple-purple/10 to-apple-pink/10 border border-apple-purple/20 rounded-2xl p-4">
        <h4 className="text-lg font-semibold text-apple-purple mb-3 flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Fun Facts About Our Global Chat! 🌍
        </h4>
        <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <p>💬 <strong>Students:</strong> Remember, ChromeBooks are for learning! But hey, we won't tell your teacher! 😄</p>
          <p>🎓 <strong>Teachers:</strong> You're the real MVPs! Keep inspiring the next generation! 💪</p>
          <p>👨‍👩‍👧‍👦 <strong>Parents:</strong> Hope the kids are doing their homework! 📚</p>
          <p>🌍 <strong>Everyone:</strong> You're part of the coolest global community ever! 🚀</p>
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-xs text-slate-500">
          💡 <strong>Pro tip:</strong> Stats update every 30 seconds! ⚡
        </p>
        <p className="text-xs text-slate-500 mt-1">
          💡 <strong>Remember:</strong> Be kind and respectful to everyone! 🌟
        </p>
      </div>
    </motion.div>
  )
}
