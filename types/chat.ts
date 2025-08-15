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
  countryCode?: string
  replyTo?: ReplyInfo
  editedAt?: Date
  reactions?: ReactionMap
}

export type ReactionMap = {
  // key is emoji, value is list of usernames who reacted with that emoji
  [emoji: string]: string[]
}

export interface User {
  username: string
  isVerified: boolean
}

export interface ArithmeticChallenge {
  question: string
  answer: number
}
