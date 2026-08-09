/**
 * DEV FIXTURES — not a production code path.
 *
 * Imported only by `app/pages/zz-watch-preview.vue` and unit specs, so the
 * watch components can be built and reviewed before the endpoints in
 * `server/api/watch/` exist. `WatchView.vue` never imports this file; it
 * reads the real API through the `useWatch*` composables.
 *
 * Video/thumbnail URLs match the ones `scripts/seed-clips.mjs` and
 * `scripts/seed-live-streams.mjs` seed, so the preview page plays real media.
 */
import type {
  ChannelSummary,
  ChatMessage,
  ReactionSummary,
  RelatedItem,
  WatchComment,
  WatchTarget
} from '#shared/types/watch'

export const clipTarget: WatchTarget = {
  kind: 'clip',
  id: 'clip-midnight-echo',
  slug: 'clip-midnight-echo',
  title: 'The Midnight Echo: Unrehearsed Encore at Tokyo Dome',
  channel: 'EchoCollective',
  category: 'Music',
  description:
    'The encore nobody expected. Three songs, no setlist, one take — recorded on the final night of the Tokyo Dome run.\n\nShot on four handhelds and mixed from the desk feed. Full set drops next week.',
  image: 'https://picsum.photos/seed/midnight-echo/960/540',
  videoUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  views: '12.4k views',
  publishedAt: '3h ago',
  duration: '02:45'
}

export const liveTarget: WatchTarget = {
  kind: 'live',
  id: 'live-viper-squadron',
  slug: 'Viper_Squadron',
  title: 'Ranked ladder push — road to top 100',
  channel: 'Viper_Squadron',
  category: 'Gaming',
  description: 'Grinding ranked until the promo hits. Drops enabled, no backseating.',
  image: 'https://picsum.photos/seed/viper-squadron/960/540',
  videoUrl: 'https://media.w3.org/2010/05/bunny/trailer.mp4',
  viewers: '8.4k watching',
  uptime: '3h 17m'
}

export const relatedItems: RelatedItem[] = [
  {
    id: 'live-neon-drift',
    slug: 'Neon_Drift',
    kind: 'live',
    title: 'Late-night synth drive, requests open',
    channel: 'Neon_Drift',
    image: 'https://picsum.photos/seed/neon-drift/960/540',
    videoUrl: 'https://media.w3.org/2010/05/bunny/trailer.mp4',
    meta: '4.1k watching'
  },
  {
    id: 'clip-triple-kill',
    slug: 'clip-triple-kill',
    kind: 'clip',
    title: 'The Perfect Triple-Kill Flank',
    channel: 'GhostOperator',
    image: 'https://picsum.photos/seed/triple-kill/960/540',
    videoUrl: 'https://media.w3.org/2010/05/bunny/trailer.mp4',
    meta: '14.2k views · 2h ago',
    duration: '00:33'
  },
  {
    id: 'clip-modular-synthesis',
    slug: 'clip-modular-synthesis',
    kind: 'clip',
    title: 'Modular Synthesis Peak Moment',
    channel: 'Patch_Bay',
    image: 'https://picsum.photos/seed/modular-synthesis/960/540',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    meta: '8.9k views · 6h ago',
    duration: '01:00'
  },
  {
    id: 'live-canvas-queen',
    slug: 'Canvas_Queen',
    kind: 'live',
    title: 'Inking a full cover, start to finish',
    channel: 'Canvas_Queen',
    image: 'https://picsum.photos/seed/canvas-queen/960/540',
    videoUrl: 'https://media.w3.org/2010/05/bunny/trailer.mp4',
    meta: '2.3k watching'
  }
]

export const comments: WatchComment[] = [
  {
    id: 'comment-1',
    authorName: 'sable_reverb',
    authorImage: null,
    body: 'The transition at 1:12 is the best thing I have heard all year. Whoever ran the desk feed deserves a raise.',
    likes: 412,
    likedByMe: false,
    isMine: false,
    age: '1h ago',
    replies: [
      {
        id: 'comment-1-reply-1',
        authorName: 'EchoCollective',
        authorImage: null,
        body: 'That was completely unplanned — the desk engineer caught it on instinct.',
        likes: 96,
        likedByMe: true,
        isMine: false,
        age: '48m ago',
        replies: []
      }
    ]
  },
  {
    id: 'comment-2',
    authorName: 'hollow_frequency',
    authorImage: null,
    body: 'Been waiting three years for a proper recording of this encore. Worth every minute.',
    likes: 188,
    likedByMe: false,
    isMine: false,
    age: '2h ago',
    replies: []
  },
  // Owned by the previewing user, so the preview exercises the delete affordance.
  {
    id: 'comment-3',
    authorName: 'tape_hiss',
    authorImage: null,
    body: 'Four handhelds and it still cuts cleaner than most studio releases.',
    likes: 74,
    likedByMe: false,
    isMine: true,
    age: '3h ago',
    replies: []
  }
]

export const chatMessages: ChatMessage[] = [
  {
    id: 'chat-1',
    authorName: 'quickscope_kev',
    body: 'that flank was filthy',
    createdAt: new Date(Date.now() - 4 * 60_000).toISOString()
  },
  {
    id: 'chat-2',
    authorName: 'lumen_ghost',
    body: 'what sens are you running',
    createdAt: new Date(Date.now() - 3 * 60_000).toISOString()
  },
  {
    id: 'chat-3',
    authorName: 'Viper_Squadron',
    body: '800 dpi, 0.42 in game',
    createdAt: new Date(Date.now() - 2 * 60_000).toISOString()
  },
  {
    id: 'chat-4',
    authorName: 'static_bloom',
    body: 'promo run lets go',
    createdAt: new Date(Date.now() - 40_000).toISOString()
  }
]

export const reactions: ReactionSummary = { likes: 3120, dislikes: 41, mine: null }

export const channel: ChannelSummary = {
  name: 'EchoCollective',
  followers: '128.4k',
  isFollowing: false,
  clipCount: 42,
  notify: 'none'
}
