import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export const dynamic = 'force-dynamic'

// POST - toggle reaction for a message
// body: { id: string, username: string, emoji: string }
export async function POST(request: NextRequest) {
  try {
    const { id, username, emoji } = await request.json()
    if (!id || !username || !emoji) {
      return NextResponse.json({ error: 'id, username, and emoji are required' }, { status: 400 })
    }
    const db = await getDatabase()
    const col = db.collection('messages')

    const _id = new ObjectId(id)
    const doc = await col.findOne({ _id })
    if (!doc) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

    const reactions = (doc.reactions || {}) as Record<string, string[]>
    const users = new Set(reactions[emoji] || [])
    const adding = !users.has(username)
    if (adding) users.add(username)
    else users.delete(username)
    reactions[emoji] = Array.from(users)

    await col.updateOne({ _id }, { $set: { reactions } })
    // If this was an add, increment usage counter for this user
    if (adding) {
      const usage = db.collection('emoji_usage')
      await usage.updateOne(
        { _id: username },
        { $inc: { ["counts." + emoji]: 1 } },
        { upsert: true }
      )
    }
    const updated = await col.findOne({ _id })
    return NextResponse.json({ reactions: updated?.reactions || {} })
  } catch {
    return NextResponse.json({ error: 'Failed to toggle reaction' }, { status: 500 })
  }
}
