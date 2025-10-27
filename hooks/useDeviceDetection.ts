import { useState, useEffect, useMemo } from 'react'

export interface DeviceInfo {
  isMobile: boolean
  isIOS: boolean
  isAndroid: boolean
  screenWidth: number
}

export function useDeviceDetection(): DeviceInfo {
  const [screenWidth, setScreenWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth
    }
    return 1024 // Default to desktop width on server
  })

  // Detect user agent once on mount
  const userAgent = useMemo(() => {
    if (typeof navigator === 'undefined') return ''
    return navigator.userAgent || ''
  }, [])

  // Parse user agent for OS detection
  const { isIOS, isAndroid } = useMemo(() => {
    const ua = userAgent.toLowerCase()
    return {
      isIOS: /iphone|ipad|ipod/.test(ua),
      isAndroid: /android/.test(ua),
    }
  }, [userAgent])

  // Determine if mobile based on screen width (768px breakpoint)
  const isMobile = screenWidth < 768

  useEffect(() => {
    if (typeof window === 'undefined') return

    let timeoutId: NodeJS.Timeout | null = null

    // Debounced resize handler (250ms)
    const handleResize = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      
      timeoutId = setTimeout(() => {
        setScreenWidth(window.innerWidth)
      }, 250)
    }

    // Set initial width
    setScreenWidth(window.innerWidth)

    // Listen for resize events
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Log device info in development mode
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Device Detection]', {
        isMobile,
        isIOS,
        isAndroid,
        screenWidth,
        userAgent: userAgent.substring(0, 50) + '...',
      })
    }
  }, [isMobile, isIOS, isAndroid, screenWidth, userAgent])

  return {
    isMobile,
    isIOS,
    isAndroid,
    screenWidth,
  }
}
