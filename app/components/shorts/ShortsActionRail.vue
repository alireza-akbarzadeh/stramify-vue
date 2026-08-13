<script lang="ts" setup>
import {Bookmark, BookmarkCheck, MessageCircle, Repeat1, Send, ThumbsDown, ThumbsUp} from '@lucide/vue'
import {storeToRefs} from 'pinia'
import {toast} from 'vue-sonner'
import type {Short} from '#shared/types/shorts'
import type {ReactionValue} from '#shared/types/watch'
import {formatCount} from '#shared/utils/format'
import {useShortsActions} from '@/composables/useShortsActions'
import {useAuthStore} from '@/stores/auth'
import {useSavedVideos} from '@/composables/useSavedVideos'
import {useShortsStore} from '@/stores/shorts'
import {shortToItem} from '@/utils/shorts'
import ShortsActionButton from './ShortsActionButton.vue'

/**
 * The right-hand rail: like, dislike, comments, share, save.
 *
 * It reaches for what it needs itself — the reaction mutation, the bookmark,
 * the comment sheet's open state — instead of taking five callbacks from the
 * reel above it. That's the whole reason `stores/shorts` exists: the rail is
 * three components deep and none of the layers in between have any business
 * knowing what a like is.
 */
const props = defineProps<{ short: Short }>()

const {user} = storeToRefs(useAuthStore())
const shorts = useShortsStore()
// A short is a vertical clip, so its bookmark is the same account-bound Watch
// later queue every other clip's is.
const savedVideos = useSavedVideos()
const {react} = useShortsActions()

const saved = computed(() => savedVideos.isSaved(props.short.id, 'clip'))
const shares = ref(0)

function onReact(value: ReactionValue) {
  if (!user.value) return toast.error('Log in to react to this short.')
  react.mutate({id: props.short.id, value})
}

function onShare() {
  shares.value += 1
  const link = `${window.location.origin}/shorts?v=${props.short.id}`
  navigator.clipboard
      .writeText(link)
      .then(() => toast('Link copied to clipboard', {description: link}))
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
    <ShortsActionButton
        :active="shorts.repeat"
        :burst="shorts.repeat"
        :caption="shorts.repeat ? 'Looping' : 'Repeat'"
        :icon="Repeat1"
        :label="shorts.repeat ? 'Turn off repeat (r)' : 'Repeat this short (r)'"
        :pressed="shorts.repeat"
        @click="shorts.toggleRepeat()"
    />
    <ShortsActionButton :burst="shares" :icon="Send" :sparks="4" label="Copy link to this short" @click="onShare"/>
    <ShortsActionButton
        :active="saved"
        :burst="saved"
        :caption="saved ? 'Saved' : 'Save'"
        :icon="saved ? BookmarkCheck : Bookmark"
        :label="saved ? 'Remove from Watch later' : 'Save to Watch later'"
        :pressed="saved"
        @click="savedVideos.toggle(shortToItem(short))"
    />
  </ul>
</template>
