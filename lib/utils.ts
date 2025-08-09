import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateRandomMathProblem(): { question: string; answer: number } {
  const operations = ['+', '-', '*']
  const operation = operations[Math.floor(Math.random() * operations.length)]
  
  let num1: number
  let num2: number
  let answer: number
  
  switch (operation) {
    case '+':
      num1 = Math.floor(Math.random() * 50) + 1
      num2 = Math.floor(Math.random() * 50) + 1
      answer = num1 + num2
      break
    case '-':
      num1 = Math.floor(Math.random() * 50) + 25
      num2 = Math.floor(Math.random() * 25) + 1
      answer = num1 - num2
      break
    case '*':
      num1 = Math.floor(Math.random() * 12) + 1
      num2 = Math.floor(Math.random() * 12) + 1
      answer = num1 * num2
      break
    default:
      num1 = 1
      num2 = 1
      answer = 2
  }
  
  return {
    question: `${num1} ${operation} ${num2} = ?`,
    answer
  }
}

export function formatTimestamp(timestamp: Date): string {
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60))
  
  if (diffInMinutes < 1) return 'Just now'
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
  
  return timestamp.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC'
  }) + ' UTC'
}

export function getRandomWelcomeMessage(): string {
  const messages = [
    "Welcome to the global chat! 🌍",
    "Hey there, world traveler! ✈️",
    "Welcome to the ultimate chat room! 🚀",
    "Glad you could join us! 🎉",
    "Welcome to the party! 🎊",
    "Hey, new friend! 👋",
    "Welcome to the coolest chat ever! 😎",
    "Glad you're here! 🌟",
    "Welcome aboard! 🚢",
    "Hey, welcome to the fam! 👨‍👩‍👧‍👦"
  ]
  return messages[Math.floor(Math.random() * messages.length)]
}

export function getRandomFunFact(): string {
  const facts = [
    "Did you know? The first email was sent in 1971! 📧",
    "Fun fact: There are over 7.8 billion people on Earth! 🌍",
    "Cool fact: The internet is about 40 years old! 🕸️",
    "Did you know? Emojis were created in 1999! 😊",
    "Fun fact: The first text message was sent in 1992! 📱",
    "Cool fact: There are over 1.5 billion websites! 🌐",
    "Did you know? The first iPhone was released in 2007! 📱",
    "Fun fact: The average person spends 6+ hours online daily! ⏰",
    "Cool fact: There are over 5 billion active internet users! 👥",
    "Did you know? The first computer was built in 1946! 💻"
  ]
  return facts[Math.floor(Math.random() * facts.length)]
}
