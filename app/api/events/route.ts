import { NextResponse } from 'next/server'
import { addSubscriber, heartbeat } from '@/lib/events'

export const runtime = 'nodejs'

export async function GET() {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder()
      const write = (chunk: string) => controller.enqueue(encoder.encode(chunk))
      const unsubscribe = addSubscriber(write)
      // Initial comment to open stream
      write(': connected\n\n')
      // Heartbeat to keep connections alive
      const iv = setInterval(() => heartbeat(), 25000)
      // Cleanup when stream is canceled
      // @ts-expect-error next types
      controller.signal?.addEventListener?.('abort', () => {
        clearInterval(iv)
        unsubscribe()
      })
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
