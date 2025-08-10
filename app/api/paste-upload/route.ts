import { NextRequest, NextResponse } from 'next/server'
import { UTApi } from 'uploadthing/server'

const utapi = new UTApi()

const MAX_SIZE_BYTES = 512 * 1024 // 512 KB (closest to 500KB)
const ACCEPT_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
])

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!ACCEPT_TYPES.has((file as any).type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }
    if ((file as any).size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'File too large (max 512 KB)' }, { status: 400 })
    }

    const result = await utapi.uploadFiles(file)
    if (!result || !('data' in result) || !result.data?.url) {
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    return NextResponse.json({ url: result.data.url })
  } catch (err: any) {
    console.error('Paste upload error:', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
