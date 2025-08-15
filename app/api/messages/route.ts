import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getDatabase } from '@/lib/mongodb'
import { ChatMessage } from '@/types/chat'
import { ObjectId } from 'mongodb'
import { getCurrentTimestamp } from '@/utils/timezone'
import nodemailer from 'nodemailer'

// GET - Fetch messages with simple pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limitParam = parseInt(searchParams.get('limit') || '50', 10)
    const limit = Math.min(Math.max(isNaN(limitParam) ? 50 : limitParam, 1), 200)
    const beforeTs = searchParams.get('beforeTs')
    const afterTs = searchParams.get('afterTs')

    const db = await getDatabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const collection = db.collection('messages') as any

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
  } catch {
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

    // Fire-and-throttle admin email notifications (non-blocking) when sender is not 'arham'
    ;(async () => {
      try {
        const sender = (newMessage.username || '').toLowerCase()
        if (sender && sender !== 'arham') {
          const throttleCol = db.collection<{ _id: string; lastSentAt?: Date }>('notifications')
          const key = 'admin-email-throttle'
          const doc = await throttleCol.findOne({ _id: key })
          const now = new Date()
          const last = doc?.lastSentAt ? new Date(doc.lastSentAt) : undefined
          const elapsed = last ? now.getTime() - last.getTime() : Number.POSITIVE_INFINITY
          const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000
          if (elapsed >= TWENTY_FOUR_HOURS) {
            const host = process.env.SMTP_HOST
            const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587
            const user = process.env.SMTP_USER
            const pass = process.env.SMTP_PASS
            const to = process.env.NOTIFY_EMAIL_TO || 'arhampersonal@icloud.com'
            if (host && user && pass) {
              const transporter = nodemailer.createTransport({
                host,
                port,
                secure: port === 465,
                auth: { user, pass },
              })
              const site = request.headers.get('host') || 'live-chat'
              const subject = `New message on ${site} from ${newMessage.username}`
              const text = `User: ${newMessage.username}\nTime: ${newMessage.timestamp.toISOString?.() || String(newMessage.timestamp)}\nMessage: ${newMessage.message}\n`
              await transporter.sendMail({ from: user, to, subject, text })
              await throttleCol.updateOne(
                { _id: key },
                { $set: { lastSentAt: now } },
                { upsert: true }
              )
            }
          }
        }
      } catch {}
    })()

    return NextResponse.json(insertedMessage, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}

// PATCH - Edit an existing message (only by original author)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, username, message } = body as { id?: string; username?: string; message?: string }
    if (!id || !username || !message) {
      return NextResponse.json({ error: 'id, username, and message are required' }, { status: 400 })
    }
    if (message.length > 500) {
      return NextResponse.json({ error: 'Message too long (max 500 characters)' }, { status: 400 })
    }
    const db = await getDatabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const collection = db.collection('messages') as any
    // Fetch to validate ownership and age window (<= 1 hour)
    const existing = await collection.findOne({ _id: new ObjectId(id), username })
    if (!existing) {
      return NextResponse.json({ error: 'Message not found or not owned by user' }, { status: 404 })
    }
    const rawTs = (existing as { timestamp?: unknown })?.timestamp
    const createdAt = rawTs instanceof Date ? rawTs : new Date(String(rawTs))
    const now = new Date()
    const ONE_HOUR = 60 * 60 * 1000
    if (now.getTime() - createdAt.getTime() > ONE_HOUR) {
      return NextResponse.json({ error: 'Editing window expired (1 hour limit)' }, { status: 403 })
    }
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { message: message.trim(), editedAt: new Date() } }
    )
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Failed to update message' }, { status: 500 })
    }
    const updated = await collection.findOne({ _id: new ObjectId(id) })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Failed to edit message' }, { status: 500 })
  }
}
