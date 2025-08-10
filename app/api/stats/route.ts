import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/mongodb'

// GET - Fetch chat statistics
export async function GET() {
  try {
    const db = await getDatabase()
    
    // Get total message count
    const totalMessages = await db.collection('messages').countDocuments()
    
    // Get unique users count (approximate online users)
    const uniqueUsers = await db.collection('messages').distinct('username')
    const onlineCount = Math.max(uniqueUsers.length, Math.floor(Math.random() * 50) + 10) // Add some randomness for demo
    
    return NextResponse.json({
      totalMessages,
      onlineCount,
      uniqueUsers: uniqueUsers.length
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { 
        totalMessages: 0,
        onlineCount: 1,
        uniqueUsers: 0
      },
      { status: 200 } // Return default stats instead of error
    )
  }
}
