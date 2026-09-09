import { resolveLiveStream } from '../../../utils/watch'
import { chatTopic, joinChat } from '../../../utils/realtime'

/**
 * Live-chat socket (Phase 8 — ADR-006, ADR-015).
 *
 * **Read-only by design.** Inbound frames are ignored: posting still goes
 * through `POST /api/watch/[slug]/chat`, which is where `requireUser` and the
 * 1–200 character Zod check live. Accepting writes here would mean a second
 * path into the same table carrying its own copy of those rules, and the copy
 * is the one that rots. A socket that can only broadcast cannot be used to
 * write anything, which is a far shorter property to keep true.
 *
 * The slug is resolved to a stream id before subscribing, so the room is keyed
 * by identity rather than by whatever string the client sent: `resolveLiveStream`
 * matches `streamer_name` case-insensitively, so two spellings of one channel
 * must land in the same room, and an unknown slug must not open a room at all.
 */

/** Peers are keyed by their crossws id — `peer` itself is not stable across events. */
const leavers = new Map<string, () => void>()

export default defineWebSocketHandler({
  async open(peer) {
    const raw = peer.request?.url?.split('/').pop()
    if (!raw) {
      peer.close(1008, 'Missing channel')
      return
    }

    const stream = await resolveLiveStream(decodeURIComponent(raw))
    if (!stream) {
      // 1008 (policy violation) rather than a silent drop: the client
      // distinguishes "this channel has no chat" from "the socket died", and
      // only retries the second.
      peer.close(1008, 'Unknown channel')
      return
    }

    leavers.set(peer.id, joinChat(chatTopic(stream.id), peer))
  },

  message() {
    // Deliberately empty — see the note above. Clients post over REST.
  },

  close(peer) {
    leavers.get(peer.id)?.()
    leavers.delete(peer.id)
  },

  error(peer) {
    leavers.get(peer.id)?.()
    leavers.delete(peer.id)
  }
})
