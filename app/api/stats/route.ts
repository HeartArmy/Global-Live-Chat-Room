import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/mongodb'

// GET - Fetch chat statistics
export async function GET() {
  try {
    const db = await getDatabase()
    
    // Get total message count
    const totalMessages = await db.collection('messages').countDocuments()
    
    // Presence-based online users: seen within last 60s
    const since = new Date(Date.now() - 60 * 1000)
    const onlineCount = await db
      .collection('presence')
      .countDocuments({ lastSeen: { $gte: since } })
    
    // Unique users historically (optional informational metric)
    const uniqueUsers = await db.collection('messages').distinct('username')
    
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
