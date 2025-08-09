'use client'

import { motion } from 'framer-motion'
import { Globe, Users, MessageSquare, Sparkles, Star, Heart } from 'lucide-react'

export default function ChatHeader() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center mb-8"
    >
      {/* Main Title */}
      <motion.div
        animate={{ 
          scale: [1, 1.05, 1],
          rotate: [0, 1, -1, 0]
        }}
        transition={{ 
          duration: 4, 
          repeat: Infinity, 
          repeatDelay: 10 
        }}
        className="mb-4"
      >
        <h1 className="text-4xl md:text-6xl font-bold text-gradient mb-2">
          Global Live Chat 🌍
        </h1>
        <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 font-medium">
          Chat Room for the World
        </p>
      </motion.div>

      {/* Animated Icons */}
      <motion.div className="flex justify-center items-center gap-6 mb-6">
        <motion.div
          animate={{ 
            y: [0, -10, 0],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 3, 
            repeat: Infinity, 
            repeatDelay: 2 
          }}
          className="flex items-center gap-2 text-apple-blue"
        >
          <Globe className="w-6 h-6" />
          <span className="text-sm font-medium">Global</span>
        </motion.div>

        <motion.div
          animate={{ 
            y: [0, -10, 0],
            rotate: [0, -5, 5, 0]
          }}
          transition={{ 
            duration: 3, 
            repeat: Infinity, 
            repeatDelay: 2,
            delay: 0.5
          }}
          className="flex items-center gap-2 text-apple-green"
        >
          <Users className="w-6 h-6" />
          <span className="text-sm font-medium">Community</span>
        </motion.div>

        <motion.div
          animate={{ 
            y: [0, -10, 0],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 3, 
            repeat: Infinity, 
            repeatDelay: 2,
            delay: 1
          }}
          className="flex items-center gap-2 text-apple-purple"
        >
          <MessageSquare className="w-6 h-6" />
          <span className="text-sm font-medium">Real-time</span>
        </motion.div>
      </motion.div>

      {/* Fun Description */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        className="max-w-4xl mx-auto mb-6"
      >
        <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed">
          Welcome to the <span className="font-semibold text-apple-blue">ultimate global chat experience</span>! 
          Connect with people from around the world in real-time. 
          Whether you're a student, teacher, parent, or just someone looking to chat, 
          you're welcome here! 🌟
        </p>
      </motion.div>

      {/* Special Messages */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-6"
      >
        <div className="bg-gradient-to-r from-apple-orange/10 to-apple-red/10 border border-apple-orange/20 rounded-2xl p-4 text-center">
          <div className="text-2xl mb-2">📚</div>
          <h3 className="font-semibold text-apple-orange mb-2">Students</h3>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Hey there! Maybe finish your homework first? 😄 
            But we're glad you're here!
          </p>
        </div>

        <div className="bg-gradient-to-r from-apple-green/10 to-apple-blue/10 border border-apple-green/20 rounded-2xl p-4 text-center">
          <div className="text-2xl mb-2">🎓</div>
          <h3 className="font-semibold text-apple-green mb-2">Teachers</h3>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            The real MVPs! Keep inspiring the next generation! 💪
          </p>
        </div>

        <div className="bg-gradient-to-r from-apple-purple/10 to-apple-pink/10 border border-apple-purple/20 rounded-2xl p-4 text-center">
          <div className="text-2xl mb-2">👨‍👩‍👧‍👦</div>
          <h3 className="font-semibold text-apple-purple mb-2">Parents</h3>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Hope the kids are doing their homework! 📚
          </p>
        </div>
      </motion.div>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
        className="flex flex-wrap justify-center gap-4 text-sm text-slate-600 dark:text-slate-400"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-apple-yellow" />
          <span>Beautiful Apple-style Design</span>
        </div>
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-apple-blue" />
          <span>Anti-Bot Protection</span>
        </div>
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-apple-pink" />
          <span>Global Community</span>
        </div>
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-apple-green" />
          <span>Real-time Chat</span>
        </div>
      </motion.div>

      {/* Contact Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="mt-6 p-4 bg-gradient-to-r from-slate-100/50 to-blue-100/50 dark:from-slate-800/50 dark:to-blue-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50"
      >
        <p className="text-sm text-slate-600 dark:text-slate-400">
          💡 <strong>Have suggestions?</strong> Send them to{' '}
          <span className="font-mono text-apple-blue">arhampersonal at icloud dot com</span>
        </p>
        <p className="text-xs text-slate-500 mt-2">
          🌍 <strong>Remember:</strong> This is a global community - be kind, respectful, and have fun! 
          Students, maybe finish your homework first! 😄
        </p>
      </motion.div>
    </motion.header>
  )
}
