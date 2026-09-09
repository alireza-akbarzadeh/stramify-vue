import Redis from 'ioredis'
import { logger } from './logger'
import type { ChatMessage } from '#shared/types/watch'

/**
 * Fan-out for live chat (Phase 8 — ADR-006, ADR-015).
 *
 * Two hops, and it matters which does what:
 *
 *   1. **A local peer registry** delivers a message to every socket held by
 *      *this* Node process. That is the whole job in dev, where there is one.
 *   2. **Redis pub/sub** carries it between processes. Without it, two viewers
 *      balanced onto different instances sit in the same chat and never see
 *      each other — a failure that only appears once you scale past one box,
 *      which is exactly when it is expensive to discover.
 *
 * Redis is therefore optional, not required. `REDIS_URL` absent means hop 2 is
 * skipped and chat still works correctly on a single instance. That keeps
 * `pnpm dev` free of an infra prerequisite while production gets real fan-out
 * from one environment variable.
 *
 * Exactly one of the two paths runs per message, so a viewer never receives a
 * duplicate: with Redis configured the publish goes out and comes back through
 * the subscriber, which is what reaches local peers; without it, the broadcast
 * is direct. (The client dedupes by id anyway — `mergeChatMessages` — but
 * relying on that to paper over double delivery would be sloppy.)
 *
 * The `ChatMessage` shape carried here is the one `chat.post.ts` returns over
 * REST, so a socket subscriber and a poller see identical data.
 */

/** Anything that can receive a frame. Structural, to avoid depending on crossws' Peer type. */
type Sendable = { send: (data: string) => unknown }

/** One channel per stream. Keyed by stream id, never by slug — see the ws handler. */
export function chatTopic(streamId: string) {
  return `chat:${streamId}`
}

const url = process.env.REDIS_URL

const peers = new Map<string, Set<Sendable>>()

let publisher: Redis | null = null
let subscriber: Redis | null = null
let warned = false

export function realtimeEnabled(): boolean {
  return !!url
}

/*
 * Separate connections on purpose: a client in subscriber mode may not issue
 * ordinary commands, so publishing down the socket you subscribed on fails at
 * runtime. `lazyConnect` keeps a boot with an unreachable Redis from throwing
 * before the app has served anything.
 */
function createClient(role: 'publisher' | 'subscriber'): Redis | null {
  if (!url) {
    if (!warned) {
      warned = true
      logger.warn('realtime: REDIS_URL unset — chat fans out within this process only')
    }
    return null
  }

  const client = new Redis(url, {
    lazyConnect: true,
    // Chat is best-effort. A message that cannot be fanned out is not worth
    // stalling the request that produced it: it is already committed to
    // Postgres, and a reconnecting or polling client will still pick it up.
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false
  })

  client.on('error', (error) => logger.error({ err: error, role }, 'realtime: redis error'))
  client.connect().catch((error) => logger.error({ err: error, role }, 'realtime: connect failed'))

  return client
}

/**
 * The process-wide subscriber, created on first use.
 *
 * Shared rather than per-socket because Redis delivers once per *connection*:
 * one connection per viewer would multiply both the connection count and the
 * number of times each message is handled by the size of the audience.
 */
function ensureSubscriber(): Redis | null {
  if (!url || subscriber) return subscriber
  subscriber = createClient('subscriber')
  subscriber?.on('message', (channel: string, payload: string) => deliverLocal(channel, payload))
  return subscriber
}

/** Send a raw frame to every socket on this process subscribed to `topic`. */
function deliverLocal(topic: string, payload: string) {
  const room = peers.get(topic)
  if (!room?.size) return
  for (const peer of room) {
    try {
      peer.send(payload)
    } catch (error) {
      logger.error({ err: error, topic }, 'realtime: failed to send to peer')
    }
  }
}

/** Attach a socket to a stream's chat. Returns the matching detach. */
export function joinChat(topic: string, peer: Sendable): () => void {
  let room = peers.get(topic)
  if (!room) {
    room = new Set()
    peers.set(topic, room)
    ensureSubscriber()?.subscribe(topic).catch((error) => {
      logger.error({ err: error, topic }, 'realtime: subscribe failed')
    })
  }
  room.add(peer)

  return () => {
    room.delete(peer)
    // Last viewer out closes the room, so an idle process is not holding a
    // Redis subscription per stream anyone has ever watched.
    if (!room.size) {
      peers.delete(topic)
      subscriber?.unsubscribe(topic).catch(() => {})
    }
  }
}

/**
 * Broadcast a posted message. Called from the REST handler after the insert
 * commits — never from the socket, which is read-only.
 */
export function publishChatMessage(streamId: string, message: ChatMessage) {
  const topic = chatTopic(streamId)
  const payload = JSON.stringify(message)

  if (!url) {
    deliverLocal(topic, payload)
    return
  }

  if (!publisher) publisher = createClient('publisher')
  publisher?.publish(topic, payload).catch((error) => {
    // Fall back to this process's own viewers rather than dropping the message
    // entirely — degraded fan-out beats none while Redis is down.
    logger.error({ err: error, topic }, 'realtime: publish failed, delivering locally')
    deliverLocal(topic, payload)
  })
}
