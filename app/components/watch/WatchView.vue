<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import { toast } from 'vue-sonner'
import type { ChannelNotifyMode } from '#shared/types/channel'
import type { CommentDraft, CommentSort, ReactionValue } from '#shared/types/watch'
import { Button } from '@/components/ui/button'
import { notifyConfirmation } from '@/utils/notify'
import { useWatchTarget, useWatchRelated } from '@/composables/useWatchTarget'
import { useWatchComments } from '@/composables/useWatchComments'
import { useWatchCommentMutations } from '@/composables/useWatchCommentMutations'
import { useWatchChat } from '@/composables/useWatchChat'
import { useWatchReaction } from '@/composables/useWatchEngagement'
import { useChannelFollow } from '@/composables/useChannel'
import { useViewCounter } from '@/composables/useViewCounter'
import { useAuthStore } from '@/stores/auth'
import { useWatchlistStore } from '@/stores/watchlist'
import { watchTargetToItem } from '@/utils/watchlist'
import WatchLayout from './WatchLayout.vue'
import WatchSkeleton from './WatchSkeleton.vue'

const props = defineProps<{ slug: string }>()
const slug = computed(() => props.slug)

const target = useWatchTarget(slug)
const related = useWatchRelated(slug)
const isLive = computed(() => target.data.value?.kind === 'live')
const isClip = computed(() => target.data.value?.kind === 'clip')

const sort = ref<CommentSort>('top')
const comments = useWatchComments(slug, sort, isClip)
const commentActions = useWatchCommentMutations(slug)
const chat = useWatchChat(slug, isLive)

const channelName = computed(() => target.data.value?.channel ?? '')
const { reactions, toggle: react } = useWatchReaction(slug)
const { channel, toggle: follow, notify } = useChannelFollow(channelName)
const { count } = useViewCounter(slug)
const { user } = storeToRefs(useAuthStore())
const watchlist = useWatchlistStore()

// A vertical clip is a short, and this page's 16:9 player would letterbox it
// into two black slabs. Search and the up-next rail therefore keep linking
// everything to `/watch` and the right surface is picked here, once.
watch(
  target.data,
  (found) => {
    if (found?.kind === 'clip' && found.orientation === 'vertical') {
      navigateTo(`/shorts?v=${encodeURIComponent(found.id)}`, { replace: true })
    }
  },
  { immediate: true }
)

const notFound = computed(
  () => (target.error.value as { statusCode?: number } | null)?.statusCode === 404
)
const saved = computed(() =>
  target.data.value ? watchlist.isSaved(target.data.value.id) : false
)

const engagement = computed(() => ({
  channel: channel.value,
  reactions: reactions.value,
  saved: saved.value,
  reactPending: react.isPending.value,
  followPending: follow.isPending.value,
  notifyPending: notify.isPending.value
}))
const relatedPanel = computed(() => ({
  items: related.data.value ?? [],
  pending: related.isPending.value,
  errored: related.isError.value
}))
const commentsPanel = computed(() => ({
  items: comments.data.value ?? [],
  pending: comments.isPending.value,
  errored: comments.isError.value,
  posting: commentActions.post.isPending.value
}))
const chatPanel = computed(() => ({
  items: chat.messages.value,
  pending: chat.query.isPending.value,
  errored: chat.query.isError.value,
  sending: chat.send.isPending.value
}))

useHead({
  title: computed(() => (target.data.value ? `${target.data.value.title} — Streamify` : 'Streamify'))
})

function onSave() {
  if (target.data.value) watchlist.toggle(watchTargetToItem(target.data.value))
}
function onReact(value: ReactionValue) {
  if (!user.value) return toast.error('Log in to react to this video.')
  react.mutate(value)
}
function onFollow() {
  if (!user.value) return toast.error('Log in to follow this channel.')
  follow.mutate()
}
function onSetNotify(mode: ChannelNotifyMode) {
  notify.mutate(mode, {
    onSuccess: () => toast.success(notifyConfirmation(mode, channelName.value)),
    onError: () => toast.error("Couldn't change your notifications for this channel.")
  })
}
function onSendChat(body: string) {
  chat.send.mutate(body, { onError: () => toast.error("Couldn't send that message.") })
}
function onPostComment(draft: CommentDraft) {
  if (!user.value) return toast.error('Log in to comment.')
  commentActions.post.mutate(draft, { onError: () => toast.error("Couldn't post that comment.") })
}
function onLikeComment(id: string) {
  if (!user.value) return toast.error('Log in to like comments.')
  commentActions.like.mutate(id)
}
function onRemoveComment(id: string) {
  commentActions.remove.mutate(id, {
    onSuccess: () => toast.success('Comment deleted'),
    onError: () => toast.error("Couldn't delete that comment.")
  })
}
function onShare() {
  navigator.clipboard
    .writeText(window.location.href)
    .then(() => toast.success('Link copied to clipboard'))
    .catch(() => toast.error("Couldn't copy the link"))
}
</script>

<template>
  <div class="mx-auto mt-12 max-w-[1560px] px-4 py-8 sm:px-8">
    <WatchSkeleton v-if="target.isPending.value" />

    <div
      v-else-if="notFound"
      class="rounded-xl border border-dashed border-border py-20 text-center"
    >
      <p class="text-sm font-semibold uppercase tracking-wide text-primary">Not available</p>
      <h1 class="mt-2 text-2xl font-semibold text-foreground">We couldn't find that video</h1>
      <p class="mt-3 text-sm text-muted-foreground">
        It may have been removed, or the channel isn't live right now.
      </p>
      <Button as-child class="mt-6" size="sm">
        <NuxtLink to="/live">
          <ArrowLeft />
          Browse live channels
        </NuxtLink>
      </Button>
    </div>

    <div
      v-else-if="target.isError.value"
      class="rounded-xl border border-dashed border-destructive/40 py-20 text-center"
    >
      <h1 class="text-lg font-semibold text-foreground">Couldn't load this video</h1>
      <p class="mt-2 text-sm text-muted-foreground">Something went wrong on our side.</p>
      <Button type="button" variant="outline" size="sm" class="mt-4" @click="target.refetch()">
        Retry
      </Button>
    </div>

    <WatchLayout
      v-else-if="target.data.value"
      v-model:sort="sort"
      :target="target.data.value"
      :engagement="engagement"
      :related="relatedPanel"
      :comments="commentsPanel"
      :chat="chatPanel"
      @play-start="count()"
      @react="onReact"
      @toggle-save="onSave"
      @share="onShare"
      @toggle-follow="onFollow"
      @set-notify="onSetNotify"
      @send-chat="onSendChat"
      @post-comment="onPostComment"
      @like-comment="onLikeComment"
      @remove-comment="onRemoveComment"
      @retry-related="related.refetch()"
      @retry-comments="comments.refetch()"
      @retry-chat="chat.query.refetch()"
    />
  </div>
</template>
