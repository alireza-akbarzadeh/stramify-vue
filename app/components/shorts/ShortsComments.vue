<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { toast } from 'vue-sonner'
import type { CommentDraft, CommentSort } from '#shared/types/watch'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import WatchComments from '@/components/watch/WatchComments.vue'
import { useShortsActions } from '@/composables/useShortsActions'
import { useWatchComments } from '@/composables/useWatchComments'
import { useWatchCommentMutations } from '@/composables/useWatchCommentMutations'
import { useAuthStore } from '@/stores/auth'
import { useShortsStore } from '@/stores/shorts'

/**
 * Comments for whichever short opened them, in a sheet.
 *
 * Both the API and the list are the watch page's — `/api/watch/[slug]/comments`
 * resolves a short's id like any other clip, and `WatchComments` is already
 * presentational, so this component is the sheet, the query wiring, and
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
    <SheetContent side="right" class="w-full gap-0 sm:max-w-md">
      <SheetHeader class="border-b border-border px-5 py-4">
        <SheetTitle>Comments</SheetTitle>
        <SheetDescription class="sr-only">
          Comments on the short you are watching. Press Escape to close.
        </SheetDescription>
      </SheetHeader>

      <div class="min-h-0 flex-1 overflow-y-auto px-5 py-5">
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
