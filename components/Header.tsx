'use client'

import { motion } from 'framer-motion'
import { countryCodeToFlag } from '@/utils/geo'
import { Globe, Users, Clock } from 'lucide-react'
import { getCurrentTimestamp } from '@/utils/timezone'
import { useEffect, useState, useMemo } from 'react'

interface HeaderProps {
  onlineCount?: number
  totalMessages?: number
  username?: string
  countryCode?: string
}

export default function Header({ onlineCount = 0, totalMessages = 0, username, countryCode }: HeaderProps) {
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    const updateTime = () => {
      const { formatted } = getCurrentTimestamp()
      setCurrentTime(formatted)
    }
    
    updateTime()
    const interval = setInterval(updateTime, 1000)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="glass-effect border-b border-pastel-gray/50 p-4"
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          {/* Logo and title */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-3"
          >
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
              className="w-10 h-10 bg-gradient-to-br from-apple-blue to-blue-600 rounded-full flex items-center justify-center"
            >
              <Globe size={20} className="text-white" />
            </motion.div>
            
            <div>
              <h1 className="text-xl font-bold text-gray-100">
                Chat Room for the World
              </h1>
              <p className="text-sm text-gray-400">
                Connect with people from around the globe
              </p>
              {username && (
                <div className="mt-1">
                  <span className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-full bg-pastel-ink text-gray-200 border border-pastel-gray">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-pastel-teal" />
                    {countryCode && <span aria-hidden>{countryCodeToFlag(countryCode)}</span>}
                    Using name: <strong className="font-medium">{username}</strong>
                  </span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="hidden md:flex items-center gap-6 text-sm text-gray-400"
          >
            <div className="flex items-center gap-2">
              <Users size={16} />
              <span>{onlineCount.toLocaleString()} online</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock size={16} />
              <span>{currentTime}</span>
            </div>
          </motion.div>
        </div>

        {/* Mobile stats */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="md:hidden mt-3 flex items-center justify-between text-xs text-gray-400"
        >
          <span>{onlineCount.toLocaleString()} people online</span>
          <span className="truncate flex items-center gap-2">
            {totalMessages.toLocaleString()} messages
          </span>
        </motion.div>

        {/* Fun subtitle that rotates */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-2 text-center"
        >
          <FunSubtitle />
        </motion.div>
      </div>
    </motion.header>
  )
}

function FunSubtitle() {
  const subtitles = useMemo(() => [
    "Where strangers become friends 🌟",
    "Breaking barriers, one message at a time",
    "Your thoughts, amplified globally 📢",
    "The internet's living room",
    "Conversations that span continents 🌍",
    "Where every voice matters",
    "Building bridges with words",
    "The world is listening... 👂"
  ], [])

  const [currentSubtitle, setCurrentSubtitle] = useState(subtitles[0])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSubtitle(prev => {
        const currentIndex = subtitles.indexOf(prev)
        return subtitles[(currentIndex + 1) % subtitles.length]
      })
    }, 4000)

    return () => clearInterval(interval)
  }, [subtitles])

  return (
    <motion.p
      key={currentSubtitle}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className="text-sm text-gray-400 italic"
    >
      {currentSubtitle}
    </motion.p>
  )
}
