// Simple in-memory SSE event bus (per server instance)
// Not suitable for multi-region without an external pub/sub.

export type ChatServerEvent =
  | { type: 'message_created'; payload: unknown }
  | { type: 'message_edited'; payload: unknown }
  | { type: 'message_updated'; payload: unknown } // reactions or other fields
  | { type: 'ping' }

type Subscriber = (chunk: string) => void
const subscribers = new Set<Subscriber>()

function toSSE(event: ChatServerEvent): string {
  const { type, payload } = event as { type: string; payload?: unknown }
  const lines = [
    `event: ${type}`,
    `data: ${JSON.stringify(payload ?? {})}`,
    '',
  ]
  return lines.join('\n')
}

export function publish(event: ChatServerEvent) {
  const chunk = toSSE(event) + '\n'
  for (const sub of Array.from(subscribers)) {
    try {
      sub(chunk)
    } catch {
      subscribers.delete(sub)
    }
  }
}

export function heartbeat() {
  publish({ type: 'ping' })
}

export function addSubscriber(cb: Subscriber) {
  subscribers.add(cb)
  return () => subscribers.delete(cb)
}
