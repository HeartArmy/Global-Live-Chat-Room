import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getDatabase } from '@/lib/mongodb'
import { ChatMessage } from '@/types/chat'
import { getCurrentTimestamp } from '@/utils/timezone'

// GET - Fetch all messages
export async function GET() {
  try {
    const db = await getDatabase()
    const messages = await db
      .collection('messages')
      .find({})
      .sort({ timestamp: 1 })
      .toArray()

    return NextResponse.json(messages)
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
