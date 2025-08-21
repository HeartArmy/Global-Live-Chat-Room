'use client'

import { useState, useEffect, useMemo } from 'react'
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
  const [step, setStep] = useState<'username' | 'arhamKey' | 'challenge'>('username')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingKeywords, setIsFetchingKeywords] = useState(false)
  const [arhamKeyInput, setArhamKeyInput] = useState('')
  const [arhamKeywords, setArhamKeywords] = useState<string[] | null>(null)

  useEffect(() => {
    if (isOpen) {
      setUsername('')
      setUserAnswer('')
      setStep('username')
      setError('')
      setChallenge(null)
      // Prefill from localStorage to avoid retyping
      try {
        if (typeof window !== 'undefined') {
          const stored = window.localStorage.getItem('glcr_username_v1')
          if (stored && typeof stored === 'string') {
            setUsername(stored)
          }
        }
      } catch {}
    }
  }, [isOpen])

  const handleUsernameSubmit = async () => {
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
    const name = username.trim()
    if (name.toLowerCase() === 'arham') {
      // If already verified via cookie, skip keyword prompt
      try {
        if (typeof document !== 'undefined') {
          const cookieStr = document.cookie || ''
          const hasOk = cookieStr.split(';').some(c => c.trim().startsWith('glcr_arham_ok=1'))
          const lsOk = (typeof window !== 'undefined') ? window.localStorage.getItem('glcr_arham_ok') === '1' : false
          if (hasOk || lsOk) {
            setChallenge(generateArithmeticChallenge())
            setStep('challenge')
            return
          }
        }
      } catch {}
      // Load keywords list (from URL or env) and go to arham key step
      setIsFetchingKeywords(true)
      try {
        let keywords: string[] | null = null
        const url = process.env.NEXT_PUBLIC_ARHAM_KEYWORDS_URL
        if (url) {
          try {
            const res = await fetch(url, { cache: 'no-store' })
            if (res.ok) {
              const data = await res.json()
              if (Array.isArray(data)) {
                keywords = data.filter(v => typeof v === 'string') as string[]
              } else if (Array.isArray((data || {}).keywords)) {
                keywords = (data.keywords as unknown[]).filter(v => typeof v === 'string') as string[]
              }
            }
          } catch {}
        }
        if (!keywords || keywords.length === 0) {
          const single = process.env.NEXT_PUBLIC_ARHAM_KEYWORD
          if (single && typeof single === 'string') {
            keywords = [single]
          }
        }
        setArhamKeywords(keywords || [])
        setStep('arhamKey')
        setError('')
      } finally {
        setIsFetchingKeywords(false)
      }
      return
    }

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
      // Persist last used username for convenience
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('glcr_username_v1', username.trim())
          // Also cache in a cookie for server access (14 days)
          try {
            const days = 14
            const expiresUsername = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString()
            document.cookie = `glcr_username=${encodeURIComponent(username.trim())}; Expires=${expiresUsername}; Path=/; SameSite=Lax`
            // If using the reserved name, mark verification cookie as well (9 months)
            if (username.trim().toLowerCase() === 'arham') {
              const months9 = 270 // ~9 months
              const expiresArham = new Date(Date.now() + months9 * 24 * 60 * 60 * 1000).toUTCString()
              document.cookie = `glcr_arham_ok=1; Expires=${expiresArham}; Path=/; SameSite=Lax`
              try { if (typeof window !== 'undefined') window.localStorage.setItem('glcr_arham_ok', '1') } catch {}
            }
          } catch {}
        }
      } catch {}
      setIsLoading(false)
    }, 500) // Small delay for better UX
  }

  const handleArhamKeySubmit = async () => {
    const key = arhamKeyInput.trim()
    if (!key) {
      setError('Please enter the keyword')
      return
    }
    const list = Array.isArray(arhamKeywords) ? arhamKeywords : []
    if (list.length === 0) {
      setError('Keyword list not configured. Please try again later.')
      return
    }
    const ok = await normalizeAndCheck(key, list)
    if (!ok) {
      setError('Incorrect keyword')
      return
    }
    // Set cookie so server can validate reserved name usage
    try {
      const months9 = 270 // ~9 months
      const expiresArham = new Date(Date.now() + months9 * 24 * 60 * 60 * 1000).toUTCString()
      document.cookie = `glcr_arham_ok=1; Expires=${expiresArham}; Path=/; SameSite=Lax`
      try { if (typeof window !== 'undefined') window.localStorage.setItem('glcr_arham_ok', '1') } catch {}
    } catch {}
    setError('')
    setArhamKeyInput('')
    setChallenge(generateArithmeticChallenge())
    setStep('challenge')
  }

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      action()
    }
  }

  const funnyPlaceholders = useMemo(() => [
    "Your awesome name",
    "What should we call you?",
    "Pick a cool name",
    "Your chat identity",
    "Name for the world to see"
  ], [])

  const [placeholder, setPlaceholder] = useState(funnyPlaceholders[0])

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholder(prev => {
        const currentIndex = funnyPlaceholders.indexOf(prev)
        return funnyPlaceholders[(currentIndex + 1) % funnyPlaceholders.length]
      })
    }, 2000)
    
    return () => clearInterval(interval)
  }, [funnyPlaceholders])

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
            className="glass-effect bg-pastel-ink/90 border border-pastel-gray/50 rounded-3xl p-8 max-w-md w-full shadow-2xl"
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
              
              <h2 className="text-2xl font-bold text-gray-100 mb-2">
                Welcome to the World!
              </h2>
              
              <p className="text-gray-300 text-sm">
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

            {step === 'arhamKey' && (
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="space-y-4"
              >
                <div className="text-center">
                  <p className="text-lg font-medium text-gray-100 mb-4">
                    Reserved name verification
                  </p>
                  <p className="text-sm text-gray-300 mb-3">
                    Please enter the private keyword to use this name.
                  </p>
                  <input
                    type="password"
                    value={arhamKeyInput}
                    onChange={(e) => setArhamKeyInput(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, async () => {
                      await handleArhamKeySubmit()
                    })}
                    placeholder={isFetchingKeywords ? 'Loading...' : 'Keyword'}
                    className="input-field text-center"
                    autoFocus
                    disabled={isFetchingKeywords}
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
                      setArhamKeyInput('')
                      setError('')
                    }}
                    className="btn-secondary flex-1"
                  >
                    Back
                  </button>
                  <button
                    onClick={async () => await handleArhamKeySubmit()}
                    disabled={!arhamKeyInput.trim() || isFetchingKeywords}
                    className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'challenge' && challenge && (
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="space-y-4"
              >
                <div className="text-center">
                  <p className="text-lg font-medium text-gray-100 mb-4">
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

                <p className="text-xs text-gray-400 text-center">
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

// Helper below component to keep top clean
async function normalizeAndCheck(input: string, list: string[]): Promise<boolean> {
  const cand = input.trim().toLowerCase()
  return list.some(k => (k || '').toString().trim().toLowerCase() === cand)
}

