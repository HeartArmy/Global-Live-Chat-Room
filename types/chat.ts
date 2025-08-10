export interface ChatMessage {
  _id?: string
  username: string
  message: string
  timestamp: Date
  timezone: string
}

export interface User {
  username: string
  isVerified: boolean
}

export interface ArithmeticChallenge {
  question: string
  answer: number
}
