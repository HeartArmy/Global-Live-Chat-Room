import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/mongodb'

export const dynamic = 'force-dynamic'

// GET /api/emoji-usage?username=<name>&limit=16
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')
    const limitParam = parseInt(searchParams.get('limit') || '16', 10)
    const limit = Math.max(1, Math.min(64, isNaN(limitParam) ? 16 : limitParam))
    if (!username) {
      return NextResponse.json({ error: 'username is required' }, { status: 400 })
    }
    const db = await getDatabase()
    const col = db.collection<{ _id: string; counts?: Record<string, number> }>('emoji_usage')
    const doc = await col.findOne({ _id: username })
    const counts: Record<string, number> = doc?.counts || {}
    const sorted = Object.entries(counts)
      .sort((a, b) => Number(b[1] ?? 0) - Number(a[1] ?? 0))
      .slice(0, limit)
      .map(([emoji]) => emoji)
    return NextResponse.json({ top: sorted })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch emoji usage' }, { status: 500 })
  }
}
