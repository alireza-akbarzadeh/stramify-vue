<script setup lang="ts">
import { Check, Plus } from '@lucide/vue'
import type { ChannelNotifyMode } from '#shared/types/channel'
import type { ChannelSummary } from '#shared/types/watch'
import { Button } from '@/components/ui/button'
import ChannelAvatar from '@/components/ChannelAvatar.vue'
import ChannelNotifyMenu from '@/components/channel/ChannelNotifyMenu.vue'
import PopBurst from '@/components/motion/PopBurst.vue'
import { toChannelPath } from '#shared/utils/channel'

/**
 * Who uploaded this. The avatar and name are one link into the channel page —
 * the standard way out of a video and into everything else that channel made.
 * The Follow button stays a sibling of the link rather than a child of it, so
 * it's still a button to a keyboard and a screen reader.
 *
 * The bell only exists once you follow: its setting is a column on the follow
 * row, so there's nothing for it to store otherwise. It slides in beside the
 * button rather than appearing, which is what makes the two read as one
 * control rather than the layout jumping.
 */
defineProps<{
  channel: ChannelSummary | null
  name: string
  pending?: boolean
  notifyPending?: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-follow'): void
  (e: 'set-notify', mode: ChannelNotifyMode): void
}>()
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-4">
    <NuxtLink
      :to="toChannelPath(name)"
      class="group flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ChannelAvatar :name="name" class="size-11" />
      <div class="min-w-0">
        <p class="truncate font-semibold text-foreground transition-colors group-hover:text-primary">
          {{ name }}
        </p>
        <p class="text-xs text-muted-foreground">
          <template v-if="channel">
            {{ channel.followers }} followers · {{ channel.clipCount }} clips
          </template>
          <span v-else class="inline-block h-3 w-24 animate-pulse rounded bg-muted align-middle" />
        </p>
      </div>
    </NuxtLink>

    <div class="flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        :variant="channel?.isFollowing ? 'outline' : 'default'"
        :aria-pressed="!!channel?.isFollowing"
        :disabled="pending || !channel"
        @click="emit('toggle-follow')"
      >
        <PopBurst :trigger="channel?.isFollowing">
          <component :is="channel?.isFollowing ? Check : Plus" />
        </PopBurst>
        {{ channel?.isFollowing ? 'Following' : 'Follow' }}
      </Button>

      <Transition
        enter-active-class="transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
        enter-from-class="-translate-x-2 scale-95 opacity-0"
        leave-active-class="transition-[opacity,transform] duration-150 ease-out"
        leave-to-class="-translate-x-2 scale-95 opacity-0"
      >
        <!-- Wrapper element because the menu's root is a Reka provider, which
             renders no DOM node of its own for the transition to hold on to. -->
        <div v-if="channel?.isFollowing">
          <ChannelNotifyMenu
            :channel="name"
            :mode="channel.notify"
            :pending="notifyPending"
            @select="emit('set-notify', $event)"
          />
        </div>
      </Transition>
    </div>
  </div>
</template>
