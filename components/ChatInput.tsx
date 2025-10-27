'use client'

import { useDevice } from '@/contexts/DeviceContext'
import ChatInputMobile from './ChatInputMobile'
import ChatInputDesktop from './ChatInputDesktop'
import { ReplyInfo } from '@/types/chat'

interface ChatInputProps {
  onSendMessage: (message: string, reply?: ReplyInfo, html?: string) => void
  disabled?: boolean
  replyTo?: ReplyInfo
  onCancelReply?: () => void
  onTyping?: (isTyping: boolean) => void
}

export default function ChatInput(props: ChatInputProps) {
  const { isMobile } = useDevice()
  
  // Feature flag for mobile optimization
  const mobileOptEnabled = process.env.NEXT_PUBLIC_MOBILE_OPT !== 'false'
  
  // Conditionally render mobile or desktop input based on device type and feature flag
  if (isMobile && mobileOptEnabled) {
    return <ChatInputMobile {...props} />
  }
  
  return <ChatInputDesktop {...props} />
}
