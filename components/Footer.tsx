'use client'

import { motion } from 'framer-motion'
import { Heart, Mail, Github } from 'lucide-react'

export default function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="glass-effect border-t border-gray-200/50 dark:border-gray-700/50 p-4 mt-auto"
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600 dark:text-gray-400">
          {/* Left side */}
          <div className="flex items-center gap-2">
            <span>Made with</span>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
            >
              <Heart size={16} className="text-red-500 fill-current" />
            </motion.div>
            <span>for the world</span>
          </div>

          {/* Center */}
          <div className="text-center">
            <p>
              Got suggestions? Send them to{' '}
              <motion.span
                whileHover={{ scale: 1.05 }}
                className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded cursor-pointer"
                onClick={() => {
                  navigator.clipboard?.writeText('arhampersonal@icloud.com')
                  // Could add a toast notification here
                }}
              >
                arhampersonal at icloud dot com
              </motion.span>
            </p>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <motion.a
              href="mailto:arhampersonal@icloud.com"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Send feedback"
            >
              <Mail size={16} />
            </motion.a>
            
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              title="Open source soon!"
            >
              <Github size={16} />
            </motion.div>
          </div>
        </div>

        {/* Fun facts that rotate */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-3 text-center"
        >
          <FunFacts />
        </motion.div>
      </div>
    </motion.footer>
  )
}

function FunFacts() {
  const facts = [
    "🌍 Messages are stored in UTC for global consistency",
    "🤖 Simple math keeps the bots away",
    "✨ Built with Next.js 15 and React 19",
    "💬 Every message since day one is preserved",
    "🎨 Designed with Apple's aesthetic in mind",
    "🔒 Your privacy matters - no tracking, just chatting",
    "🌟 Join thousands of conversations happening right now"
  ]

  const [currentFact, setCurrentFact] = useState(facts[0])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFact(prev => {
        const currentIndex = facts.indexOf(prev)
        return facts[(currentIndex + 1) % facts.length]
      })
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <motion.p
      key={currentFact}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className="text-xs text-gray-500 dark:text-gray-400"
    >
      {currentFact}
    </motion.p>
  )
}

// Need to import useState and useEffect
import { useState, useEffect } from 'react'
