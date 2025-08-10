import { ArithmeticChallenge } from '@/types/chat'

const funnyQuestions = [
  "What's 7 + 3? (Even robots should know this one!)",
  "Quick math: 15 - 8 = ?",
  "Easy peasy: 4 × 3 = ?",
  "Brain teaser: 20 ÷ 4 = ?",
  "Simple one: 9 + 6 = ?",
  "Math time: 18 - 5 = ?",
  "Quick: 2 × 8 = ?",
  "Easy: 24 ÷ 3 = ?",
  "What's 11 + 4?",
  "Calculate: 17 - 9 = ?",
]

const operations = [
  { op: '+', min: 1, max: 20 },
  { op: '-', min: 10, max: 25 },
  { op: '×', min: 2, max: 9 },
  { op: '÷', min: 2, max: 8 },
]

export function generateArithmeticChallenge(): ArithmeticChallenge {
  // 70% chance of using a predefined funny question
  if (Math.random() < 0.7) {
    const randomQuestion = funnyQuestions[Math.floor(Math.random() * funnyQuestions.length)]
    
    // Extract the math from the question
    const mathMatch = randomQuestion.match(/(\d+)\s*([+\-×÷])\s*(\d+)/)
    if (mathMatch) {
      const [, num1Str, operator, num2Str] = mathMatch
      const num1 = parseInt(num1Str)
      const num2 = parseInt(num2Str)
      
      let answer: number
      switch (operator) {
        case '+': answer = num1 + num2; break
        case '-': answer = num1 - num2; break
        case '×': answer = num1 * num2; break
        case '÷': answer = num1 / num2; break
        default: answer = 0
      }
      
      return { question: randomQuestion, answer }
    }
  }
  
  // Fallback to generated question
  const operation = operations[Math.floor(Math.random() * operations.length)]
  let num1: number, num2: number, answer: number
  
  switch (operation.op) {
    case '+':
      num1 = Math.floor(Math.random() * operation.max) + operation.min
      num2 = Math.floor(Math.random() * operation.max) + operation.min
      answer = num1 + num2
      break
    case '-':
      num1 = Math.floor(Math.random() * (operation.max - operation.min)) + operation.min
      num2 = Math.floor(Math.random() * num1) + 1
      answer = num1 - num2
      break
    case '×':
      num1 = Math.floor(Math.random() * operation.max) + operation.min
      num2 = Math.floor(Math.random() * operation.max) + operation.min
      answer = num1 * num2
      break
    case '÷':
      answer = Math.floor(Math.random() * operation.max) + operation.min
      num2 = Math.floor(Math.random() * operation.max) + operation.min
      num1 = answer * num2
      break
    default:
      num1 = 5
      num2 = 3
      answer = 8
  }
  
  return {
    question: `What's ${num1} ${operation.op} ${num2}?`,
    answer
  }
}
