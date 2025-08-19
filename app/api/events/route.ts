import { NextResponse } from 'next/server'
import { addSubscriber } from '@/lib/events'

export const runtime = 'nodejs'

export async function GET() {
  // Wrap to capture and cleanup per-connection resources
  // We re-create the stream so we can cleanup on cancel properly
  let ivRef: ReturnType<typeof setInterval> | null = null
  let unsubscribeRef: (() => void) | null = null
  const encoder = new TextEncoder()
  const streamWithCleanup = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (chunk: string) => controller.enqueue(encoder.encode(chunk))
      unsubscribeRef = addSubscriber(write)
      write('retry: 2000\n')
      write(': connected\n\n')
      write('event: ping\n')
      write('data: {}\n\n')
      ivRef = setInterval(() => {
        try { write(': keepalive\n\n') } catch {}
      }, 25000)
    },
    cancel() {
      if (ivRef) clearInterval(ivRef as unknown as number)
      ivRef = null
      if (unsubscribeRef) unsubscribeRef()
      unsubscribeRef = null
    },
  })

  return new NextResponse(streamWithCleanup, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
