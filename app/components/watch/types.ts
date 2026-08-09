import type {
  ChannelSummary,
  ChatMessage,
  ReactionSummary,
  RelatedItem,
  WatchComment
} from '#shared/types/watch'

/**
 * View-model props for `WatchLayout.vue`. UI-only shapes, deliberately not in
 * `#shared` — nothing crosses the wire in this form. Each panel gets its data
 * bundled with its own pending/errored flags so the layout stays presentational
 * and every section can render its own loading/empty/error state independently
 * (one slow query never blanks the whole page).
 *
 * These carry *server* state only (TanStack Query results). Viewer identity —
 * who is signed in, whose avatar the composer shows, whether posting is allowed
 * — is client state and comes from `stores/auth`, read by the leaf that needs
 * it rather than threaded through the layout.
 */
export interface AsyncPanel<T> {
  items: T[]
  pending: boolean
  errored: boolean
}

export interface WatchEngagement {
  channel: ChannelSummary | null
  reactions: ReactionSummary
  saved: boolean
  reactPending: boolean
  followPending: boolean
  notifyPending: boolean
}

export type RelatedPanel = AsyncPanel<RelatedItem>

export interface CommentsPanel extends AsyncPanel<WatchComment> {
  posting: boolean
}

export interface ChatPanel extends AsyncPanel<ChatMessage> {
  sending: boolean
}
