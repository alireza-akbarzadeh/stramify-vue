<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { toast } from 'vue-sonner'
import type { CommentDraft, CommentSort } from '#shared/types/watch'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import WatchComments from '@/components/watch/WatchComments.vue'
import { useReelBox } from '@/composables/useReelBox'
import { useShortsActions } from '@/composables/useShortsActions'
import { useWatchComments } from '@/composables/useWatchComments'
import { useWatchCommentMutations } from '@/composables/useWatchCommentMutations'
import { useAuthStore } from '@/stores/auth'
import { useShortsStore } from '@/stores/shorts'

/**
 * Comments for whichever short opened them, in a drawer that rises out of the
 * bottom of the short.
 *
 * Bottom rather than the side because the thread belongs to the video, not to
 * the page: a panel flying in from the right edge of a 1440px window has no
 * visible relationship to a 9:16 column in the middle of it. Width is tied to
 * that column's own geometry — the reel is `100dvh` minus the top bar, the
 * frame inside it is 9:16, so `height × 9/16` is exactly how wide the video is
 * and the drawer lines up with its edges at any viewport height. On desktop the
 * height comes from the same place (`useReelBox`), which is what makes the
 * panel the size of the short rather than a fixed slab cutting one in half.
 *
 * `Sheet` (Reka UI Dialog) rather than a new drawer dependency: `side="bottom"`
 * already ships the slide-up/slide-down `data-state` animation, and Reka's
 * presence machine holds the unmount until the exit animation finishes. What it
 * does not give is drag-to-dismiss — that would need `vaul-vue`.
 *
 * Both the API and the list are the watch page's — `/api/watch/[slug]/comments`
 * resolves a short's id like any other clip, and `WatchComments` is already
 * presentational, so this component is the drawer, the query wiring, and
 * nothing else. Rebuilding a second comment thread for the same table would be
 * two implementations of replies, sorting and optimistic likes.
 *
 * Which short it belongs to lives in `stores/shorts`, so the rail's button
 * three levels down can open this without a chain of emits.
 */
const shorts = useShortsStore()
const { commentsFor } = storeToRefs(shorts)
const { user } = storeToRefs(useAuthStore())
const { bumpCommentCount } = useShortsActions()

const slug = computed(() => commentsFor.value ?? '')
const sort = ref<CommentSort>('top')
const comments = useWatchComments(slug, sort, computed(() => !!commentsFor.value))
const actions = useWatchCommentMutations(slug)

const open = computed({
  get: () => shorts.commentsOpen,
  set: (value: boolean) => !value && shorts.closeComments()
})

/** The drawer's box, pinned to the reel's — including its height on desktop. */
const sheetBox = useReelBox(open)

function onPost(draft: CommentDraft) {
  if (!user.value) return toast.error('Log in to comment.')
  const id = commentsFor.value
  actions.post.mutate(draft, {
    onSuccess: () => id && bumpCommentCount(id, 1),
    onError: () => toast.error("Couldn't post that comment.")
  })
}

function onRemove(id: string) {
  const shortId = commentsFor.value
  actions.remove.mutate(id, {
    onSuccess: () => {
      if (shortId) bumpCommentCount(shortId, -1)
      toast.success('Comment deleted')
    },
    onError: () => toast.error("Couldn't delete that comment.")
  })
}

function onLike(id: string) {
  if (!user.value) return toast.error('Log in to like comments.')
  actions.like.mutate(id)
}
</script>

<template>
  <Sheet v-model:open="open">
    <!--
      `sm:h-auto` hands the height over to the `top`/`bottom` that `useReelBox`
      pins on desktop, so the panel is exactly as tall as the short. The
      `68dvh` slab stays below `sm`, where the short is the whole viewport and a
      full-height drawer would be a takeover rather than a sheet.
    -->
    <SheetContent
      side="bottom"
      class="mx-auto h-[68dvh] max-h-[calc(100dvh-5rem)] gap-0 rounded-t-2xl border-x motion-reduce:animate-none sm:h-auto sm:max-h-none sm:max-w-[min(32rem,calc((100dvh-4rem)*9/16))] sm:rounded-2xl"
      :style="sheetBox"
    >
      <!--
        The title is the dialog's accessible name and nothing else — `WatchComments`
        renders its own heading with the live count, and two "Comments" headings
        stacked on top of each other is what you get for keeping both visible.
      -->
      <SheetHeader class="sr-only">
        <SheetTitle>Comments</SheetTitle>
        <SheetDescription>
          Comments on the short you are watching. Press Escape to close.
        </SheetDescription>
      </SheetHeader>

      <div class="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-6">
        <WatchComments
          v-model:sort="sort"
          :comments="comments.data.value ?? []"
          :pending="comments.isPending.value"
          :errored="comments.isError.value"
          :posting="actions.post.isPending.value"
          @retry="comments.refetch()"
          @post="onPost"
          @like="onLike"
          @remove="onRemove"
        />
      </div>
    </SheetContent>
  </Sheet>
</template>
