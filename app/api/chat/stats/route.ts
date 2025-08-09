import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db('globalchat')
    const collection = db.collection('messages')

    // Get total message count
    const totalMessages = await collection.countDocuments()

    // Get unique users count
    const uniqueUsers = await collection.distinct('name')

    // Get messages from last 24 hours
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentMessages = await collection.countDocuments({
      timestamp: { $gte: last24Hours }
    })

    // Get most active users (top 10)
    const mostActiveUsers = await collection.aggregate([
      { $group: { _id: '$name', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray()

    // Get messages per hour for the last 24 hours
    const hourlyStats = await collection.aggregate([
      { $match: { timestamp: { $gte: last24Hours } } },
      {
        $group: {
          _id: { $hour: '$timestamp' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray()

    return NextResponse.json({
      totalMessages,
      uniqueUsers: uniqueUsers.length,
      recentMessages,
      mostActiveUsers,
      hourlyStats,
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
