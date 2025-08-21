import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/mongodb'
import { getPusher, PUSHER_CHANNEL, EVENT_TYPING_UPDATE } from '@/lib/pusher'

const WINDOW_MS = 60 * 1000 // consider user active if seen in last 60s

// In-memory typing tracker (per server instance)
// Keyed by sessionId to avoid duplicate entries per user if they reconnect
const typingBySession = new Map<string, { username: string; last: number }>()
// Throttle/dedupe state for broadcasts
let lastBroadcastAt = 0
let lastUsersJSON = '[]'

function pruneTyping(staleMs = 4000) {
  const now = Date.now()
  typingBySession.forEach((info, sid) => {
    if (now - info.last > staleMs) typingBySession.delete(sid)
  })
}

function broadcastTyping() {
  const users = Array.from(new Set(Array.from(typingBySession.values()).map(v => v.username).filter(Boolean)))
  const usersJSON = JSON.stringify(users)
  const now = Date.now()
  const THROTTLE_MS = 300
  // Dedupe: only send if user set changed; Throttle: and no more often than THROTTLE_MS
  if (usersJSON === lastUsersJSON && now - lastBroadcastAt < THROTTLE_MS) return
  lastUsersJSON = usersJSON
  lastBroadcastAt = now
  const payload = { users, count: users.length }
  try {
    const p = getPusher()
    if (p) void p.trigger(PUSHER_CHANNEL, EVENT_TYPING_UPDATE, payload)
  } catch {}
}

export async function GET() {
  try {
    const db = await getDatabase()
    const since = new Date(Date.now() - WINDOW_MS)
    const activeCount = await db
      .collection('presence')
      .countDocuments({ lastSeen: { $gte: since } })

    return NextResponse.json({ activeCount })
  } catch {
    return NextResponse.json({ activeCount: 0 }, { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sessionId, username, isTyping } = body as { sessionId?: string; username?: string | null; isTyping?: boolean }
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
    }

    // Always process typing first (does not depend on DB)
    if (typeof isTyping === 'boolean' && username) {
      if (isTyping) {
        typingBySession.set(sessionId, { username, last: Date.now() })
      } else {
        typingBySession.delete(sessionId)
      }
    }
    // Prune and broadcast regardless
    pruneTyping()
    broadcastTyping()

    // Best-effort DB updates; failures should not block typing indicator
    let activeCount: number | undefined = undefined
    try {
      const db = await getDatabase()
      await db.collection('presence').updateOne(
        { sessionId },
        {
          $set: {
            sessionId,
            username: username || null,
            lastSeen: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true }
      )
      const since = new Date(Date.now() - WINDOW_MS)
      activeCount = await db
        .collection('presence')
        .countDocuments({ lastSeen: { $gte: since } })
    } catch {
      // ignore DB errors for typing endpoint
    }

    return NextResponse.json({ ok: true, activeCount })
  } catch {
    // Malformed request JSON
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
