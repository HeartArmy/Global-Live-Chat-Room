import { NextRequest, NextResponse } from 'next/server'
import { getPusher, PUSHER_CHANNEL, EVENT_MESSAGE_CREATED } from '@/lib/pusher'
export const dynamic = 'force-dynamic'
import { getDatabase } from '@/lib/mongodb'
import { ChatMessage } from '@/types/chat'
import { ObjectId, type WithId, type Filter } from 'mongodb'
import { getCurrentTimestamp } from '@/utils/timezone'
import nodemailer from 'nodemailer'

// GET - Fetch messages with simple pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limitParam = parseInt(searchParams.get('limit') || '50', 10)
    const limit = Math.min(Math.max(isNaN(limitParam) ? 50 : limitParam, 1), 500)
    const beforeTs = searchParams.get('beforeTs')
    const afterTs = searchParams.get('afterTs')

    const db = await getDatabase()
    type DbMessage = Omit<ChatMessage, '_id'> & { _id: ObjectId }
    const collection = db.collection<DbMessage>('messages')

    // Helper to serialize Mongo docs -> plain JSON
    const serialize = (docs: WithId<DbMessage>[]) =>
      docs.map((d) => ({
        ...d,
        _id: d._id.toString(),
      }))

    // If afterTs is provided, fetch newer/updated messages (for live updates)
    if (afterTs) {
      const afterDate = new Date(afterTs)
      const newer = await collection
        .find({ $or: [ { timestamp: { $gt: afterDate } }, { updatedAt: { $gt: afterDate } } ] })
        .sort({ timestamp: 1, _id: 1 })
        .limit(limit)
        .toArray()
      return NextResponse.json(serialize(newer))
    }

    // Else, fetch older chunks before a given timestamp
    if (beforeTs) {
      const beforeDate = new Date(beforeTs)
      const beforeIdRaw = searchParams.get('beforeId')
      const beforeId = beforeIdRaw && ObjectId.isValid(beforeIdRaw) ? new ObjectId(beforeIdRaw) : null
      const query: Filter<DbMessage> = beforeId
        ? { $or: [ { timestamp: { $lt: beforeDate } }, { timestamp: beforeDate, _id: { $lt: beforeId } } ] }
        : { timestamp: { $lt: beforeDate } }
      const olderDesc = await collection
        .find(query)
        .sort({ timestamp: -1, _id: -1 })
        .limit(limit)
        .toArray()
      // Reverse to ascending for UI rendering
      return NextResponse.json(serialize(olderDesc.reverse()))
    }

    // Default: latest chunk
    const latestDesc = await collection
      .find({})
      .sort({ timestamp: -1, _id: -1 })
      .limit(limit)
      .toArray()
    return NextResponse.json(serialize(latestDesc.reverse()))
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
    const { username, message, html, replyTo, countryCode, clientTempId } = body as {
      username?: string
      message?: string
      html?: string
      replyTo?: unknown
      countryCode?: string
      clientTempId?: string
    }

    // Fallback to cookies for username/cc if not present in body (mobile phones send fewer fields)
    const cookieUsername = request.cookies.get('glcr_username')?.value
    const cookieCC = request.cookies.get('glcr_cc')?.value

    const finalUsername = (username || cookieUsername || '').trim()

    if (!finalUsername || !message) {
      return NextResponse.json(
        { error: 'Username and message are required' },
        { status: 400 }
      )
    }

    // Reserved name protection: require verification cookie for 'arham'
    if (finalUsername.toLowerCase() === 'arham') {
      const arhamOk = request.cookies.get('glcr_arham_ok')?.value
      if (arhamOk !== '1') {
        return NextResponse.json(
          { error: 'Reserved name requires verification. Please enter the private keyword.' },
          { status: 403 }
        )
      }
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: 'Message too long (max 2000 characters)' },
        { status: 400 }
      )
    }

    if (finalUsername.length > 20) {
      return NextResponse.json(
        { error: 'Username too long (max 20 characters)' },
        { status: 400 }
      )
    }

    const { timestamp, timezone } = getCurrentTimestamp()

    const ccSource = typeof countryCode === 'string' && countryCode ? countryCode : (cookieCC || undefined)
    const cc = typeof ccSource === 'string' ? ccSource.trim().toUpperCase() : undefined
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

    // Safely normalize reply info from untyped JSON
    let safeReply: ChatMessage['replyTo'] = undefined
    if (replyTo && typeof replyTo === 'object') {
      const r = replyTo as Record<string, unknown>
      safeReply = {
        id: String(r.id ?? ''),
        username: String(r.username ?? ''),
        preview: String(r.preview ?? ''),
        imageUrl: typeof r.imageUrl === 'string' ? r.imageUrl : undefined,
      }
    }

    const newMessage: Omit<ChatMessage, '_id'> = {
      username: finalUsername,
      message: message.trim(),
      html: typeof html === 'string' && html.trim().length ? html.trim() : undefined,
      timestamp,
      timezone,
      countryCode: finalCC,
      updatedAt: timestamp,
      replyTo: safeReply,
    }

    const db = await getDatabase()
    // Pre-generate id so we can broadcast immediately with the final id
    const newId = new ObjectId()
    const created = { _id: newId.toString(), ...newMessage, clientTempId }
    try {
      const p = getPusher()
      if (p) void p.trigger(PUSHER_CHANNEL, EVENT_MESSAGE_CREATED, created)
    } catch {}
    // Insert with the same id; we don't block the broadcast on DB latency
    await db.collection('messages').insertOne({ _id: newId, ...newMessage })
    // Broadcast canonical creation (will reconcile by clientTempId on clients)
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
          const TWO_HOURS = 2 * 60 * 60 * 1000
          if (elapsed >= TWO_HOURS) {
            const host = process.env.SMTP_HOST
            const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587
            const user = process.env.SMTP_USER
            const pass = process.env.SMTP_PASS
            const to = process.env.NOTIFY_EMAIL_TO
            if (host && user && pass && to) {
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

    return NextResponse.json(created, { status: 201 })
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
    const { id, username, message, html } = body

    if (!id || !username || !message) {
      return NextResponse.json({ error: 'id, username, and message are required' }, { status: 400 })
    }
    if (message.length > 2000) {
      return NextResponse.json({ error: 'Message too long (max 2000 characters)' }, { status: 400 })
    }
    const db = await getDatabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const collection = db.collection('messages') as any
    // Fetch to validate ownership and age window (<= 10 minutes)
    const existing = await collection.findOne({ _id: new ObjectId(id), username })
    if (!existing) {
      return NextResponse.json({ error: 'Message not found or not owned by user' }, { status: 404 })
    }
    const rawTs = (existing as { timestamp?: unknown })?.timestamp
    const createdAt = rawTs instanceof Date ? rawTs : new Date(String(rawTs))
    const now = new Date()
    const TEN_MINUTES = 10 * 60 * 1000
    if (now.getTime() - createdAt.getTime() > TEN_MINUTES) {
      return NextResponse.json({ error: 'Editing window expired (10 minute limit)' }, { status: 403 })
    }
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { message: message.trim(), html: typeof html === 'string' && html.trim().length ? html : undefined, editedAt: new Date(), updatedAt: new Date() } }
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
