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
  // Force desktop version for all users (mobile optimization disabled)
  // This ensures consistent experience across all devices
  return <ChatInputDesktop {...props} />
}
