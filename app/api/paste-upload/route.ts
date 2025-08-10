import { NextResponse } from 'next/server'
import { UTApi } from 'uploadthing/server'

// Strict server-side validation
const MAX_SIZE_BYTES = 512 * 1024 // 512 KB hard cap server-side
const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
])

export async function POST(req: Request) {
  try {
    // Ensure UploadThing secret is configured
    if (!process.env.UPLOADTHING_SECRET) {
      return NextResponse.json({ error: 'Server not configured for uploads' }, { status: 500 })
    }

    const form = await req.formData()
    const file = form.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Only PNG, JPEG, WEBP, or GIF images are allowed' }, { status: 400 })
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'Image too large. Max 512KB on server' }, { status: 413 })
    }

    const utapi = new UTApi()

    // Upload using UploadThing server API
    const uploaded = await utapi.uploadFiles(file)

    // Handle UploadThing response
    // uploaded can be { data, error } or array depending on version
    // Normalize to a single item with a url
    const url = (uploaded as any)?.data?.url ?? (Array.isArray((uploaded as any)?.data) ? (uploaded as any).data[0]?.url : undefined)

    if (!url) {
      const errMsg = (uploaded as any)?.error ?? 'Upload failed'
      return NextResponse.json({ error: typeof errMsg === 'string' ? errMsg : 'Upload failed' }, { status: 500 })
    }

    return NextResponse.json({ url })
  } catch (e: any) {
    console.error('paste-upload error', e)
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 })
  }
}
