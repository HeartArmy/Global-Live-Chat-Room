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
    let uploaded: unknown
    try {
      uploaded = await utapi.uploadFiles(file)
    } catch (err: unknown) {
      const message =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message?: unknown }).message || 'Upload failed')
          : 'Upload failed'
      return NextResponse.json({ error: message }, { status: 500 })
    }

    // Handle UploadThing response
    // uploaded can be { data, error } or array depending on version
    // Normalize to a single item with a url
    const u = uploaded as { data?: unknown; error?: unknown }
    const d = u?.data
    const dataItem: unknown = Array.isArray(d) ? d[0] : d
    const rec = (dataItem && typeof dataItem === 'object') ? (dataItem as Record<string, unknown>) : undefined
    const urlFromApi = rec && typeof rec.url === 'string' ? rec.url : undefined
    const key = rec && typeof rec.key === 'string' ? rec.key : undefined
    const url = urlFromApi || (key ? `https://utfs.io/f/${key}` : undefined)

    if (!url) {
      const rawError = u?.error
      const errMsg = typeof rawError === 'string'
        ? rawError
        : (rawError && typeof rawError === 'object' && 'message' in rawError && typeof (rawError as { message?: unknown }).message === 'string'
          ? String((rawError as { message?: unknown }).message)
          : 'Upload failed')
      return NextResponse.json({ error: errMsg }, { status: 500 })
    }

    return NextResponse.json({ url })
  } catch (e: unknown) {
    const message =
      typeof e === 'object' && e && 'message' in e
        ? String((e as { message?: unknown }).message || 'Upload failed')
        : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Diagnostics: visit /api/paste-upload to confirm env presence in prod
export async function GET() {
  const hasSecret = Boolean(process.env.UPLOADTHING_SECRET)
  const hasAppId = Boolean(process.env.UPLOADTHING_APP_ID)
  return NextResponse.json({ ok: true, hasSecret, hasAppId, runtime })
}
