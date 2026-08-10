<script setup lang="ts">
/**
 * Dev-only preview of `WatchLayout` against fixtures — the real page is
 * `/watch/[slug]`, which reads live APIs. Kept so the layout can be eyeballed
 * in both modes (clip vs live) without needing seeded rows for each. Mirrors
 * the existing `zz-discovery-preview.vue` convention.
 */
import * as fixtures from '@/components/watch/__fixtures__/watch'
import type { ChannelNotifyMode } from '#shared/types/channel'
import type { CommentSort, ReactionValue } from '#shared/types/watch'
import WatchLayout from '@/components/watch/WatchLayout.vue'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth'
import { applyReaction } from '@/utils/reactions'

useHead({ title: 'Watch preview (temp)' })

// Viewer identity is client state, so the signed-in variants (composer, chat
// box) are previewed by seeding the store rather than passing props down.
useAuthStore().session = {
  user: { name: 'Preview_Viewer', email: 'preview@streamify.test' }
}

const mode = ref<'clip' | 'live'>('clip')
const sort = ref<CommentSort>('top')
const target = computed(() => (mode.value === 'live' ? fixtures.liveTarget : fixtures.clipTarget))

// Engagement is local state here rather than a frozen fixture: like, follow
// and the bell all animate on the way *into* their on-state, which you can't
// eyeball unless the preview actually toggles.
const channel = reactive({ ...fixtures.channel })
const reactions = reactive({ ...fixtures.reactions })
const saved = ref(false)

const engagement = computed(() => ({
  channel,
  reactions,
  saved: saved.value,
  reactPending: false,
  followPending: false,
  notifyPending: false
}))

function onToggleFollow() {
  channel.isFollowing = !channel.isFollowing
  channel.notify = channel.isFollowing ? 'all' : 'none'
}
function onReact(value: ReactionValue) {
  Object.assign(reactions, applyReaction(reactions, value))
}
function onSetNotify(mode: ChannelNotifyMode) {
  channel.notify = mode
}
const related = { items: fixtures.relatedItems, pending: false, errored: false }
const comments = { items: fixtures.comments, pending: false, errored: false, posting: false }
const chat = { items: fixtures.chatMessages, pending: false, errored: false, sending: false }
</script>

<template>
  <div class="mx-auto max-w-[1560px] px-4 pb-8 pt-24 sm:px-8">
    <div class="mb-6 flex w-fit gap-1 rounded-lg border border-border bg-muted p-1">
      <Button
        v-for="option in (['clip', 'live'] as const)"
        :key="option"
        type="button"
        size="sm"
        :variant="mode === option ? 'default' : 'ghost'"
        @click="mode = option"
      >
        {{ option === 'clip' ? 'Clip (VOD)' : 'Live' }}
      </Button>
    </div>
    <WatchLayout
      v-model:sort="sort"
      :target="target"
      :engagement="engagement"
      :related="related"
      :comments="comments"
      :chat="chat"
      @react="onReact"
      @toggle-save="saved = !saved"
      @toggle-follow="onToggleFollow"
      @set-notify="onSetNotify"
    />
  </div>
</template>
