'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useDeviceDetection, DeviceInfo } from '@/hooks/useDeviceDetection'

export interface DeviceContextValue {
  isMobile: boolean
  isIOS: boolean
  isAndroid: boolean
  screenWidth: number
}

const DeviceContext = createContext<DeviceContextValue | undefined>(undefined)

export interface DeviceProviderProps {
  children: ReactNode
}

export function DeviceProvider({ children }: DeviceProviderProps) {
  const deviceInfo = useDeviceDetection()

  return (
    <DeviceContext.Provider value={deviceInfo}>
      {children}
    </DeviceContext.Provider>
  )
}

export function useDevice(): DeviceContextValue {
  const context = useContext(DeviceContext)
  
  if (context === undefined) {
    // Return default values for SSR instead of throwing
    // This allows the hook to work during server-side rendering
    return {
      isMobile: false,
      isIOS: false,
      isAndroid: false,
      screenWidth: 1024,
    }
  }
  
  return context
}
