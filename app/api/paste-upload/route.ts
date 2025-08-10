import { NextResponse } from 'next/server'
import { UTApi } from 'uploadthing/server'

// Ensure this route runs on the Node.js runtime (needed for UploadThing server SDK)
export const runtime = 'nodejs'
// Avoid caching so new envs take effect immediately after redeploy
export const dynamic = 'force-dynamic'

// Strict server-side validation
const MAX_SIZE_BYTES = 1 * 1024 * 1024 // 1 MB server-side
const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
])

export async function POST(req: Request) {
  try {
    // Ensure UploadThing secret is configured
    const hasSecret = Boolean(process.env.UPLOADTHING_SECRET)
    const hasAppId = Boolean(process.env.UPLOADTHING_APP_ID)
    if (!hasSecret) {
      // Diagnostics removed from console to avoid noisy logs
      return NextResponse.json(
        { error: 'Upload server not configured: missing UPLOADTHING_SECRET (set in Vercel env and redeploy)' },
        { status: 500 }
      )
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
      return NextResponse.json({ error: 'Image too large. Max 1MB on server' }, { status: 413 })
    }

    const utapi = new UTApi()

    // Upload using UploadThing server API
    let uploaded: any
    try {
      uploaded = await utapi.uploadFiles(file)
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Upload failed' }, { status: 500 })
    }

    // Handle UploadThing response
    // uploaded can be { data, error } or array depending on version
    // Normalize to a single item with a url
    const dataItem = uploaded?.data ?? (Array.isArray(uploaded?.data) ? uploaded.data[0] : undefined)
    const urlFromApi = dataItem?.url as string | undefined
    const key = dataItem?.key as string | undefined
    const url = urlFromApi || (key ? `https://utfs.io/f/${key}` : undefined)

    if (!url) {
      const rawError = uploaded?.error
      const errMsg = typeof rawError === 'string' ? rawError : (rawError?.message || 'Upload failed')
      return NextResponse.json({ error: errMsg }, { status: 500 })
    }

    return NextResponse.json({ url })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 })
  }
}

// Diagnostics: visit /api/paste-upload to confirm env presence in prod
export async function GET() {
  const hasSecret = Boolean(process.env.UPLOADTHING_SECRET)
  const hasAppId = Boolean(process.env.UPLOADTHING_APP_ID)
  return NextResponse.json({ ok: true, hasSecret, hasAppId, runtime })
}
