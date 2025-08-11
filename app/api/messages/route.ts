import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getDatabase } from '@/lib/mongodb'
import { ChatMessage } from '@/types/chat'
import { getCurrentTimestamp } from '@/utils/timezone'

// GET - Fetch messages with simple pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limitParam = parseInt(searchParams.get('limit') || '50', 10)
    const limit = Math.min(Math.max(isNaN(limitParam) ? 50 : limitParam, 1), 200)
    const beforeTs = searchParams.get('beforeTs')
    const afterTs = searchParams.get('afterTs')

    const db = await getDatabase()
    const collection = db.collection<ChatMessage>('messages')

    // If afterTs is provided, fetch newer messages (for live updates)
    if (afterTs) {
      const afterDate = new Date(afterTs)
      const newer = await collection
        .find({ timestamp: { $gt: afterDate } })
        .sort({ timestamp: 1 })
        .limit(limit)
        .toArray()
      return NextResponse.json(newer)
    }

    // Else, fetch older chunks before a given timestamp
    if (beforeTs) {
      const beforeDate = new Date(beforeTs)
      const olderDesc = await collection
        .find({ timestamp: { $lt: beforeDate } })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray()
      // Reverse to ascending for UI rendering
      return NextResponse.json(olderDesc.reverse())
    }

    // Default: latest chunk
    const latestDesc = await collection
      .find({})
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray()
    return NextResponse.json(latestDesc.reverse())
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

// POST - Send a new message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, message, replyTo, countryCode } = body

    if (!username || !message) {
      return NextResponse.json(
        { error: 'Username and message are required' },
        { status: 400 }
      )
    }

    if (message.length > 500) {
      return NextResponse.json(
        { error: 'Message too long (max 500 characters)' },
        { status: 400 }
      )
    }

    if (username.length > 20) {
      return NextResponse.json(
        { error: 'Username too long (max 20 characters)' },
        { status: 400 }
      )
    }

    const { timestamp, timezone } = getCurrentTimestamp()
    
    const cc = typeof countryCode === 'string' ? countryCode.trim().toUpperCase() : undefined
    const validCC = cc && /^[A-Z]{2}$/.test(cc) ? cc : undefined
    // Fallback: try to infer from edge/CDN headers if client couldn't send it
    const headerCountryRaw = (
      request.headers.get('x-vercel-ip-country') ||
      request.headers.get('cf-ipcountry') ||
      request.headers.get('x-country') ||
      ''
    ).toUpperCase()
    const headerCC = /^[A-Z]{2}$/.test(headerCountryRaw) ? headerCountryRaw : undefined
    const finalCC = validCC || headerCC

    const newMessage: Omit<ChatMessage, '_id'> = {
      username: username.trim(),
      message: message.trim(),
      timestamp,
      timezone,
      countryCode: finalCC,
      replyTo: replyTo && typeof replyTo === 'object' ? {
        id: String(replyTo.id || ''),
        username: String(replyTo.username || ''),
        preview: String(replyTo.preview || ''),
        imageUrl: replyTo.imageUrl ? String(replyTo.imageUrl) : undefined,
      } : undefined,
    }

    const db = await getDatabase()
    const result = await db.collection('messages').insertOne(newMessage)

    const insertedMessage = {
      _id: result.insertedId.toString(),
      ...newMessage
    }

    return NextResponse.json(insertedMessage, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
