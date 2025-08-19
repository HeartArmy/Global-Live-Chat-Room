import PusherServer from 'pusher'

const appId = process.env.PUSHER_APP_ID
const key = process.env.PUSHER_KEY
const secret = process.env.PUSHER_SECRET
const cluster = process.env.PUSHER_CLUSTER

let pusher: PusherServer | null = null

export function getPusher() {
  if (!pusher) {
    if (!appId || !key || !secret || !cluster) return null
    pusher = new PusherServer({ appId, key, secret, cluster, useTLS: true })
  }
  return pusher
}

export const PUSHER_CHANNEL = 'chat-global'
export const EVENT_MESSAGE_CREATED = 'message_created'
export const EVENT_MESSAGE_UPDATED = 'message_updated'
export const EVENT_MESSAGE_EDITED = 'message_edited'
export const EVENT_TYPING_UPDATE = 'typing_update'
