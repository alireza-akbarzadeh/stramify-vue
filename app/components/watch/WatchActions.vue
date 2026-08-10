<script setup lang="ts">
import { Bookmark, BookmarkCheck, Link2, ThumbsDown, ThumbsUp } from '@lucide/vue'
import type { ReactionSummary, ReactionValue } from '#shared/types/watch'
import { formatCount } from '#shared/utils/format'
import { Button } from '@/components/ui/button'
import PopBurst from '@/components/motion/PopBurst.vue'

/**
 * Like / dislike / share / save.
 *
 * Every one of these is a `PopBurst`: the icon pops and throws sparks the
 * moment it turns on, which is the only immediate confirmation you get for
 * like and save (both are optimistic, so there's no request to wait on).
 * Share has no on-state, so it's triggered by a counter instead.
 */
const props = defineProps<{ reactions: ReactionSummary; saved: boolean; pending?: boolean }>()
const emit = defineEmits<{
  (e: 'react', value: ReactionValue): void
  (e: 'toggle-save' | 'share'): void
}>()

const likes = computed(() => formatCount(props.reactions.likes))
const dislikes = computed(() => formatCount(props.reactions.dislikes))

/** Share is fire-and-forget, so the burst counts presses rather than watching state. */
const shares = ref(0)
function onShare() {
  shares.value += 1
  emit('share')
}

/** Tint whichever reaction is yours, matching the icon's fill. */
const active = 'bg-primary/10 text-primary hover:bg-primary/15'
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <div class="flex items-center rounded-md border border-border bg-surface-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        class="rounded-r-none"
        :class="reactions.mine === 'like' && active"
        :aria-pressed="reactions.mine === 'like'"
        :aria-label="`Like — ${likes} likes`"
        :disabled="pending"
        @click="emit('react', 'like')"
      >
        <PopBurst :trigger="reactions.mine === 'like'">
          <ThumbsUp :class="reactions.mine === 'like' ? 'fill-current' : ''" />
        </PopBurst>
        {{ likes }}
      </Button>
      <span class="h-5 w-px bg-border" aria-hidden="true" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        class="rounded-l-none"
        :class="reactions.mine === 'dislike' && active"
        :aria-pressed="reactions.mine === 'dislike'"
        :aria-label="`Dislike — ${dislikes} dislikes`"
        :disabled="pending"
        @click="emit('react', 'dislike')"
      >
        <PopBurst :trigger="reactions.mine === 'dislike'" :sparks="0">
          <ThumbsDown :class="reactions.mine === 'dislike' ? 'fill-current' : ''" />
        </PopBurst>
        <span class="sr-only sm:not-sr-only">{{ dislikes }}</span>
      </Button>
    </div>

    <Button type="button" variant="outline" size="sm" @click="onShare">
      <PopBurst :trigger="shares" :sparks="4">
        <Link2 />
      </PopBurst>
      Share
    </Button>

    <Button
      type="button"
      variant="outline"
      size="sm"
      :class="saved && active"
      :aria-pressed="saved"
      @click="emit('toggle-save')"
    >
      <PopBurst :trigger="saved">
        <component :is="saved ? BookmarkCheck : Bookmark" />
      </PopBurst>
      {{ saved ? 'Saved' : 'Save' }}
    </Button>
  </div>
</template>
