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
import WatchPlaylistQueue from './WatchPlaylistQueue.vue'
import WatchUpNext from './WatchUpNext.vue'
import WatchAiPicks from './ai/WatchAiPicks.vue'
import WatchAiSheet from './ai/WatchAiSheet.vue'
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
 * Above 1920px the two columns keep their shape and simply get more room: the
 * sidebar widens at `3xl`/`4xl` and the container's cap steps up in `WatchView`
 * so a 4K desktop or a TV isn't mostly margin. A *third* column was tried and
 * reverted — the only thing with a claim on it was the AI assistant, and a
 * permanent panel that sat empty whenever no key was configured read as broken
 * chrome. The assistant is a sheet behind a trigger in the actions row instead
 * (`WatchAiSheet`), which costs nothing when it isn't wanted.
 *
 * On a phone the metadata cell is a *sheet*: it bleeds past the page's side
 * padding to the screen edges and rides up over the bottom of the video on a
 * rounded top edge, the way a native player screen does. That costs one
 * `relative` — the player is positioned, so a static sibling would paint
 * underneath it however late it comes in the DOM. Everything about the sheet
 * is switched off again at `lg`, where the video and the metadata are stacked
 * in a column with room to breathe and the overlap would read as a mistake.
 *
 * How far it rides up is `--player-sheet-overlap`, defined in `player.css`
 * rather than written here, because the player's control row is pinned to the
 * bottom of the video and has to be padded up by the same amount — see the
 * comment on that variable. It is `0` from `lg`, which is what flattens the
 * negative margin without a `lg:` override.
 *
 * Row gaps are per-cell rather than a grid `gap-y` below `lg`, because the
 * sheet's whole point is a *negative* gap against the player; a grid gap would
 * have to be cancelled before it could be overlapped.
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

/**
 * Grouped by payload rather than by feature, which is what `unified-signatures`
 * asks for: `send-chat` carries a message body and the two comment events carry
 * a comment id, so all three are one `string` signature; everything the viewer
 * merely *pressed* carries nothing.
 */
const emit = defineEmits<{
  (e: 'react', value: ReactionValue): void
  (e: 'set-notify', mode: ChannelNotifyMode): void
  (e: 'post-comment', draft: CommentDraft): void
  (e: 'progress', currentTime: number): void
  (e: 'send-chat' | 'like-comment' | 'remove-comment', value: string): void
  (
    e:
      | 'play-start'
      | 'ended'
      | 'toggle-save'
      | 'share'
      | 'toggle-follow'
      | 'retry-related'
      | 'retry-comments'
      | 'retry-chat'
  ): void
}>()

const { theater } = useTheaterMode()
useTheaterShortcut()

/**
 * The playhead, kept in a plain variable and handed to the assistant as a
 * getter rather than a prop.
 *
 * Vidstack fires `time-update` several times a second, and the only thing on
 * this page that reads the position does so once, when someone presses send on
 * a question. A ref would re-render the conversation continuously to carry a
 * number nobody is looking at. The event is still emitted unchanged — this is
 * a mirror, not a second source of truth; `useWatchProgress` remains the one
 * that persists it.
 */
let playhead = 0
function onProgress(currentTime: number) {
  playhead = currentTime
  emit('progress', currentTime)
}
</script>

<template>
  <div
    class="grid grid-cols-1 gap-x-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-y-4 3xl:gap-x-10 3xl:grid-cols-[minmax(0,1fr)_440px] 4xl:grid-cols-[minmax(0,1fr)_480px]"
    :data-theater="theater ? '' : undefined"
  >
    <div class="min-w-0 lg:row-start-1" :class="theater ? 'lg:col-span-2' : 'lg:col-start-1'">
      <WatchPlayer
        :target="target"
        :resume-at="resumeAt"
        @play-start="$emit('play-start')"
        @progress="onProgress"
        @ended="$emit('ended')"
      />
    </div>

    <div
      class="relative z-10 -mx-4 mt-[calc(var(--player-sheet-overlap)*-1)] min-w-0 space-y-4 rounded-t-xl bg-background px-4 pt-5 shadow-[0_-12px_32px_-16px_var(--shadow-color)] sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-none lg:px-0 lg:pt-0 lg:shadow-none lg:col-start-1 lg:row-start-2"
    >
      <WatchMeta :target="target" />
      <!-- Below `lg` the channel and the actions are separate full-width rows.
           Sharing one wrapping row is what squeezed the channel name down to a
           couple of characters on a phone and stacked "N followers · N clips"
           three lines deep next to it. -->
      <div
        class="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-4"
      >
        <WatchChannelBar
          class="min-w-0 lg:flex-1"
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
          <!-- The assistant, behind its own trigger rather than parked on the
               page: it's something you reach for, and a permanent panel had to
               be given width the page would rather spend on the video. Renders
               nothing when no key is configured. -->
          <WatchAiSheet :target="target" :playhead="() => playhead" />
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
      class="mt-6 min-w-0 lg:col-start-2 lg:mt-0"
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
        <!-- Above "Up next" and self-fetching for the same reason
             `WatchSaveToPlaylist` is: it renders only when the URL carries
             `?list=`, and nothing else on the page reads the queue. -->
        <WatchPlaylistQueue :slug="target.slug" />
        <!-- The same catalogue "Up next" draws, reordered by the model with a
             reason per row. Directly above it, and silent when it has nothing
             — the plain rail underneath is the fallback, so this never has to
             render an apology. -->
        <WatchAiPicks :slug="target.slug" />
        <WatchUpNext
          :items="related.items"
          :pending="related.pending"
          :errored="related.errored"
          @retry="$emit('retry-related')"
        />
      </div>
    </aside>

    <div v-if="target.kind === 'clip'" class="mt-8 min-w-0 lg:col-start-1 lg:row-start-3 lg:mt-0">
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
