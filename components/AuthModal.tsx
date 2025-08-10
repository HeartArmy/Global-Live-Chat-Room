'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, ArithmeticChallenge } from '@/types/chat'
import { generateArithmeticChallenge } from '@/utils/arithmetic'

interface AuthModalProps {
  isOpen: boolean
  onAuth: (user: User) => void
}

export default function AuthModal({ isOpen, onAuth }: AuthModalProps) {
  const [username, setUsername] = useState('')
  const [challenge, setChallenge] = useState<ArithmeticChallenge | null>(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [step, setStep] = useState<'username' | 'challenge'>('username')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setUsername('')
      setUserAnswer('')
      setStep('username')
      setError('')
      setChallenge(null)
    }
  }, [isOpen])

  const handleUsernameSubmit = () => {
    if (!username.trim()) {
      setError('Please enter a name to continue')
      return
    }
    
    if (username.trim().length < 2) {
      setError('Name must be at least 2 characters')
      return
    }
    
    if (username.trim().length > 20) {
      setError('Name must be 20 characters or less')
      return
    }

    setError('')
    setChallenge(generateArithmeticChallenge())
    setStep('challenge')
  }

  const handleChallengeSubmit = () => {
    if (!challenge) return
    
    setIsLoading(true)
    
    setTimeout(() => {
      const answer = parseInt(userAnswer)
      
      if (isNaN(answer) || answer !== challenge.answer) {
        setError('Oops! Try again. Bots usually get this wrong 🤖')
        setUserAnswer('')
        setIsLoading(false)
        return
      }

      // Success!
      onAuth({
        username: username.trim(),
        isVerified: true
      })
      setIsLoading(false)
    }, 500) // Small delay for better UX
  }

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      action()
    }
  }

  const funnyPlaceholders = [
    "Your awesome name",
    "What should we call you?",
    "Pick a cool name",
    "Your chat identity",
    "Name for the world to see"
  ]

  const [placeholder, setPlaceholder] = useState(funnyPlaceholders[0])

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholder(prev => {
        const currentIndex = funnyPlaceholders.indexOf(prev)
        return funnyPlaceholders[(currentIndex + 1) % funnyPlaceholders.length]
      })
    }, 2000)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white dark:bg-apple-dark rounded-3xl p-8 max-w-md w-full shadow-2xl"
          >
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-16 h-16 bg-gradient-to-br from-apple-blue to-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center"
              >
                <span className="text-2xl">🌍</span>
              </motion.div>
              
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome to the World!
              </h2>
              
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                {step === 'username' 
                  ? "Join millions of people chatting from around the globe"
                  : "Quick verification to keep the bots away"
                }
              </p>
            </div>

            {step === 'username' && (
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="space-y-4"
              >
                <div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, handleUsernameSubmit)}
                    placeholder={placeholder}
                    className="input-field text-center"
                    maxLength={20}
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    This is how others will see you in the chat
                  </p>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-sm text-center"
                  >
                    {error}
                  </motion.p>
                )}

                <button
                  onClick={handleUsernameSubmit}
                  disabled={!username.trim()}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  Continue
                </button>
              </motion.div>
            )}

            {step === 'challenge' && challenge && (
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="space-y-4"
              >
                <div className="text-center">
                  <p className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    {challenge.question}
                  </p>
                  
                  <input
                    type="number"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, handleChallengeSubmit)}
                    placeholder="Your answer"
                    className="input-field text-center text-2xl font-bold"
                    autoFocus
                  />
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-sm text-center"
                  >
                    {error}
                  </motion.p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setStep('username')
                      setChallenge(null)
                      setUserAnswer('')
                      setError('')
                    }}
                    className="btn-secondary flex-1"
                  >
                    Back
                  </button>
                  
                  <button
                    onClick={handleChallengeSubmit}
                    disabled={!userAnswer.trim() || isLoading}
                    className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mx-auto"
                      />
                    ) : (
                      'Join Chat'
                    )}
                  </button>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  Don't worry, it's just to keep the spam bots out! 🤖
                </p>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
