export interface ReplyInfo {
  id: string
  username: string
  preview: string
  imageUrl?: string
}

export interface ChatMessage {
  _id?: string
  username: string
  message: string
  timestamp: Date
  timezone: string
  replyTo?: ReplyInfo
}

export interface User {
  username: string
  isVerified: boolean
}

export interface ArithmeticChallenge {
  question: string
  answer: number
}
