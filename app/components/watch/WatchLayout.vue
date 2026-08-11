<script setup lang="ts">
import type { ChannelNotifyMode } from '#shared/types/channel'
import type { CommentDraft, CommentSort, ReactionValue, WatchTarget } from '#shared/types/watch'
import type { ChatPanel, CommentsPanel, RelatedPanel, WatchEngagement } from './types'
import WatchPlayer from './WatchPlayer.vue'
import WatchMeta from './WatchMeta.vue'
import WatchActions from './WatchActions.vue'
import WatchSaveToPlaylist from './WatchSaveToPlaylist.vue'
import WatchChannelBar from './WatchChannelBar.vue'
import WatchDescription from './WatchDescription.vue'
import WatchComments from './WatchComments.vue'
import WatchChat from './WatchChat.vue'
import WatchUpNext from './WatchUpNext.vue'
import { useTheaterMode, useTheaterShortcut } from '@/composables/useTheaterMode'

/**
 * Presentational shell for the watch page. Holds no data-fetching of its own so
 * it can be driven either by `WatchView.vue` (real APIs) or by the fixtures on
 * `/zz-watch-preview`. Server state arrives as props; every interaction emits.
 *
 * Client state is the exception: viewer identity (`stores/auth`), the saved
 * list (`stores/watchlist`) and theater mode are read by the leaves that need
 * them. Threading those through here meant `authorName`/`authorImage`/`canPost`
 * travelling five levels to reach the comment composer, and `isSaved` being
 * passed as a function prop. The preview page sets the stores instead of
 * passing props.
 *
 * Layout: one column below `lg`, two columns at `lg` and up. Below `lg` the
 * grid children fall in DOM order — player, metadata, sidebar, comments — which
 * is what puts live chat directly under the video on a phone and the comment
 * list last.
 *
 * At `lg` and up each child is placed explicitly, because theater mode moves
 * two of them: the player grows from the first column to both, and the sidebar
 * drops from row 1 (beside the video) to row 2 (beside the metadata). Keeping
 * the player in its own cell rather than nested with the metadata is what makes
 * that a two-class change instead of a second copy of the markup.
 */
defineProps<{
  target: WatchTarget
  engagement: WatchEngagement
  related: RelatedPanel
  comments: CommentsPanel
  chat: ChatPanel
  /** `?t=` — where to drop the playhead. Passed straight through to the player. */
  resumeAt?: number
}>()

const sort = defineModel<CommentSort>('sort', { required: true })

defineEmits<{
  (e: 'react', value: ReactionValue): void
  (e: 'set-notify', mode: ChannelNotifyMode): void
  (e: 'send-chat', body: string): void
  (e: 'post-comment', draft: CommentDraft): void
  (e: 'like-comment' | 'remove-comment', id: string): void
  (e: 'progress', currentTime: number): void
  (e: 'play-start' | 'ended' | 'toggle-save' | 'share' | 'toggle-follow'): void
  (e: 'retry-related' | 'retry-comments' | 'retry-chat'): void
}>()

const { theater } = useTheaterMode()
useTheaterShortcut()
</script>

<template>
  <div
    class="grid grid-cols-1 gap-x-8 gap-y-4 lg:grid-cols-[minmax(0,1fr)_400px]"
    :data-theater="theater ? '' : undefined"
  >
    <div
      class="min-w-0 lg:row-start-1"
      :class="theater ? 'lg:col-span-2' : 'lg:col-start-1'"
    >
      <WatchPlayer
        :target="target"
        :resume-at="resumeAt"
        @play-start="$emit('play-start')"
        @progress="$emit('progress', $event)"
        @ended="$emit('ended')"
      />
    </div>

    <div class="min-w-0 space-y-4 lg:col-start-1 lg:row-start-2">
      <WatchMeta :target="target" />
      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <WatchChannelBar
          class="min-w-0 flex-1"
          :channel="engagement.channel"
          :name="target.channel"
          :pending="engagement.followPending"
          :notify-pending="engagement.notifyPending"
          @toggle-follow="$emit('toggle-follow')"
          @set-notify="$emit('set-notify', $event)"
        />
        <div class="flex flex-wrap items-center gap-2">
          <WatchActions
            :reactions="engagement.reactions"
            :saved="engagement.saved"
            :pending="engagement.reactPending"
            @react="$emit('react', $event)"
            @toggle-save="$emit('toggle-save')"
            @share="$emit('share')"
          />
          <!-- Clips only: `playlist_items` holds clips, not live sessions.
               Owns its own queries rather than taking props, because it's the
               one control here whose state (which playlists hold this video)
               nothing else on the page needs. -->
          <WatchSaveToPlaylist
            v-if="target.kind === 'clip'"
            :slug="target.slug"
            :clip-id="target.id"
          />
        </div>
      </div>
      <WatchDescription
        :description="target.description"
        :summary="
          target.kind === 'live'
            ? `${target.viewers} · live for ${target.uptime}`
            : `${target.views} · ${target.publishedAt}`
        "
      />
    </div>

    <aside
      class="mt-2 min-w-0 lg:col-start-2 lg:mt-0"
      :class="theater ? 'lg:row-span-2 lg:row-start-2' : 'lg:row-span-3 lg:row-start-1'"
    >
      <div class="space-y-6 lg:sticky lg:top-20">
        <WatchChat
          v-if="target.kind === 'live'"
          :messages="chat.items"
          :pending="chat.pending"
          :errored="chat.errored"
          :sending="chat.sending"
          @send="$emit('send-chat', $event)"
          @retry="$emit('retry-chat')"
        />
        <WatchUpNext
          :items="related.items"
          :pending="related.pending"
          :errored="related.errored"
          @retry="$emit('retry-related')"
        />
      </div>
    </aside>

    <div v-if="target.kind === 'clip'" class="mt-4 min-w-0 lg:col-start-1 lg:row-start-3">
      <WatchComments
        v-model:sort="sort"
        :comments="comments.items"
        :pending="comments.pending"
        :errored="comments.errored"
        :posting="comments.posting"
        @retry="$emit('retry-comments')"
        @post="$emit('post-comment', $event)"
        @like="$emit('like-comment', $event)"
        @remove="$emit('remove-comment', $event)"
      />
    </div>
  </div>
</template>
