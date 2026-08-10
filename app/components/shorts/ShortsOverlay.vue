<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { toast } from 'vue-sonner'
import type { Short } from '#shared/types/shorts'
import { toChannelHandle } from '#shared/utils/channel'
import { Button } from '@/components/ui/button'
import ChannelAvatar from '@/components/ChannelAvatar.vue'
import { useShortsActions } from '@/composables/useShortsActions'
import { useAuthStore } from '@/stores/auth'

/**
 * Who made this and what it is — the bottom-left block, over a scrim.
 *
 * The description collapses to two lines with a "more" toggle rather than
 * truncating outright: a short's caption is often the only context there is,
 * and a caption you can't finish reading is worse than one that pushes the
 * frame up a little.
 */
const props = defineProps<{ short: Short }>()

const { user } = storeToRefs(useAuthStore())
const { follow } = useShortsActions()
const expanded = ref(false)

const handle = computed(() => toChannelHandle(props.short.channel))

function onFollow() {
  if (!user.value) return toast.error('Log in to follow this channel.')
  follow.mutate(props.short.channel)
}

// A new short in the same slot is a different caption; don't inherit "more".
watch(() => props.short.id, () => (expanded.value = false))
</script>

<template>
  <div class="pointer-events-none absolute inset-x-0 bottom-0 z-20 pb-9">
    <div
      class="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/85 via-black/45 to-transparent"
      aria-hidden="true"
    />

    <!-- `pr-16` keeps the caption clear of the action rail stacked to its right. -->
    <div class="pointer-events-auto relative space-y-3 pb-2 pl-4 pr-16">
      <div class="flex items-center gap-2.5">
        <NuxtLink
          :to="`/channel/${handle}`"
          class="flex min-w-0 items-center gap-2.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <ChannelAvatar
            :name="short.channel"
            :image="short.avatarUrl"
            class="size-9 ring-2 ring-white/25"
          />
          <span class="truncate text-sm font-semibold text-white drop-shadow-md">
            {{ short.channel }}
          </span>
        </NuxtLink>

        <Button
          type="button"
          size="sm"
          :variant="short.isFollowing ? 'secondary' : 'default'"
          class="h-8 shrink-0 rounded-full px-4 text-xs font-semibold"
          :aria-pressed="short.isFollowing"
          :disabled="follow.isPending.value"
          @click="onFollow"
        >
          {{ short.isFollowing ? 'Following' : 'Follow' }}
        </Button>
      </div>

      <h2 class="text-balance text-[15px] font-semibold leading-snug text-white drop-shadow-md">
        {{ short.title }}
      </h2>

      <p v-if="short.description" class="max-w-prose text-[13px] leading-relaxed text-white/85">
        <span :class="!expanded && 'line-clamp-2'">{{ short.description }}</span>
        <button
          type="button"
          class="mt-0.5 block cursor-pointer text-[13px] font-semibold text-white/70 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          :aria-expanded="expanded"
          @click="expanded = !expanded"
        >
          {{ expanded ? 'Show less' : 'more' }}
        </button>
      </p>

      <p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-white/70">
        <NuxtLink
          :to="`/category/${short.category.toLowerCase()}`"
          class="rounded-full bg-white/15 px-2 py-0.5 font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {{ short.category }}
        </NuxtLink>
        <span>{{ short.views }}</span>
        <span aria-hidden="true">·</span>
        <span>{{ short.publishedAt }}</span>
      </p>
    </div>
  </div>
</template>
