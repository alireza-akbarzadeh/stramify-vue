<script lang="ts" setup>
import {Bookmark, BookmarkCheck, Link2, MessageCircle, ThumbsDown, ThumbsUp} from '@lucide/vue'
import {storeToRefs} from 'pinia'
import {toast} from 'vue-sonner'
import type {Short} from '#shared/types/shorts'
import type {ReactionValue} from '#shared/types/watch'
import {formatCount} from '#shared/utils/format'
import {useShortsActions} from '@/composables/useShortsActions'
import {useAuthStore} from '@/stores/auth'
import {useShortsStore} from '@/stores/shorts'
import {useWatchlistStore} from '@/stores/watchlist'
import {shortToItem} from '@/utils/shorts'
import ShortsActionButton from './ShortsActionButton.vue'

/**
 * The right-hand rail: like, dislike, comments, share, save.
 *
 * It reaches for what it needs itself — the reaction mutation, the watchlist,
 * the comment sheet's open state — instead of taking five callbacks from the
 * reel above it. That's the whole reason `stores/shorts` exists: the rail is
 * three components deep and none of the layers in between have any business
 * knowing what a like is.
 */
const props = defineProps<{ short: Short }>()

const {user} = storeToRefs(useAuthStore())
const shorts = useShortsStore()
const watchlist = useWatchlistStore()
const {react} = useShortsActions()

const saved = computed(() => watchlist.isSaved(props.short.id))
const shares = ref(0)

function onReact(value: ReactionValue) {
  if (!user.value) return toast.error('Log in to react to this short.')
  react.mutate({id: props.short.id, value})
}

function onShare() {
  shares.value += 1

  navigator.clipboard
      .writeText(`${window.location.origin}/shorts?v=${props.short.id}`)
      .then(() => toast.success('Link copied to clipboard'))
      .catch(() => toast.error("Couldn't copy the link"))
}
</script>

<template>
  <ul :aria-label="`Actions for ${short.title}`" class="flex flex-col items-center gap-4">
    <ShortsActionButton
        :active="short.myReaction === 'like'"
        :burst="short.myReaction === 'like'"
        :caption="formatCount(short.likes)"
        :icon="ThumbsUp"
        :label="`Like — ${formatCount(short.likes)} likes`"
        :pressed="short.myReaction === 'like'"
        @click="onReact('like')"
    />
    <ShortsActionButton
        :active="short.myReaction === 'dislike'"
        :burst="short.myReaction === 'dislike'"
        :caption="formatCount(short.dislikes)"
        :icon="ThumbsDown"
        :label="`Dislike — ${formatCount(short.dislikes)} dislikes`"
        :pressed="short.myReaction === 'dislike'"
        :sparks="0"
        @click="onReact('dislike')"
    />
    <ShortsActionButton
        :caption="formatCount(short.commentCount)"
        :icon="MessageCircle"
        :label="`Comments — ${formatCount(short.commentCount)}`"
        :pressed="shorts.commentsFor === short.id"
        @click="shorts.openComments(short.id)"
    />
    <ShortsActionButton :burst="shares" :icon="Link2" :sparks="4" label="Copy link to this short" @click="onShare"/>
    <ShortsActionButton
        :active="saved"
        :burst="saved"
        :caption="saved ? 'Saved' : 'Save'"
        :icon="saved ? BookmarkCheck : Bookmark"
        :label="saved ? 'Remove from watchlist' : 'Save to watchlist'"
        :pressed="saved"
        @click="watchlist.toggle(shortToItem(short))"
    />
  </ul>
</template>
