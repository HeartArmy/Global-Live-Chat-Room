import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/mongodb'

const WINDOW_MS = 60 * 1000 // consider user active if seen in last 60s

export async function GET() {
  try {
    const db = await getDatabase()
    const since = new Date(Date.now() - WINDOW_MS)
    const activeCount = await db
      .collection('presence')
      .countDocuments({ lastSeen: { $gte: since } })

    return NextResponse.json({ activeCount })
  } catch (e) {
    return NextResponse.json({ activeCount: 0 }, { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId, username } = await req.json()
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
    }

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

    // Optionally return current active count
    const since = new Date(Date.now() - WINDOW_MS)
    const activeCount = await db
      .collection('presence')
      .countDocuments({ lastSeen: { $gte: since } })

    return NextResponse.json({ ok: true, activeCount })
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
