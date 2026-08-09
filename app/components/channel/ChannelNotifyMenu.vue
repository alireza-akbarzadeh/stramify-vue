<script setup lang="ts">
import { Check, ChevronDown } from '@lucide/vue'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger
} from 'reka-ui'
import { CHANNEL_NOTIFY_MODES, type ChannelNotifyMode } from '#shared/types/channel'
import { Button } from '@/components/ui/button'
import PopBurst from '@/components/motion/PopBurst.vue'
import { NOTIFY_OFF_ICON, NOTIFY_OPTIONS } from '@/utils/notify'

/**
 * The bell: how loud a channel you already follow is allowed to be.
 *
 * Only meaningful next to a Follow button — `notify` is a column on the follow
 * row, so the caller is responsible for showing this to followers only (the
 * API returns 409 otherwise). Each option maps to a real filter in
 * `server/utils/notifications.ts`, so switching to "Live only" genuinely stops
 * upload rows from being read.
 *
 * Motion is Track A for the panel (`data-state` + `tw-animate-css`, which
 * Reka's presence machine waits on) and Track B for the trigger — the bell
 * swings once when it's switched back on. See the `motion` skill.
 */
const props = defineProps<{
  /** Channel handle, for the trigger's accessible name. */
  channel: string
  mode: ChannelNotifyMode
  pending?: boolean
}>()

const emit = defineEmits<{ (e: 'select', mode: ChannelNotifyMode): void }>()

const current = computed(() => NOTIFY_OPTIONS[props.mode])
const muted = computed(() => props.mode === 'none')
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger as-child :disabled="pending">
      <!--
        Outline in every state, like the Following button it sits next to —
        the bell is a setting on that follow, not a second call to action. On
        vs off is carried by the icon and its colour.
      -->
      <Button
        type="button"
        size="sm"
        variant="outline"
        class="px-2.5"
        :class="muted ? '' : 'text-primary'"
        :aria-label="`Notifications for ${channel}: ${current.label.toLowerCase()}`"
      >
        <!-- Muted is the off state, so the swing plays when it's switched back on. -->
        <PopBurst :trigger="!muted" effect="ring" :sparks="5">
          <component :is="muted ? NOTIFY_OFF_ICON : current.icon" />
        </PopBurst>
        <ChevronDown class="size-3.5! opacity-70" aria-hidden="true" />
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuPortal>
      <DropdownMenuContent
        :side-offset="8"
        align="end"
        class="z-50 w-64 rounded-xl border border-border bg-popover p-1.5 shadow-[0_24px_60px_-24px_var(--shadow-color)] backdrop-blur-xl duration-200 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 motion-reduce:animate-none"
      >
        <p class="px-2.5 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Notify me about
        </p>

        <DropdownMenuItem
          v-for="option in CHANNEL_NOTIFY_MODES"
          :key="option"
          class="flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground outline-none transition-colors data-highlighted:bg-surface-2"
          @select="emit('select', option)"
        >
          <component
            :is="NOTIFY_OPTIONS[option].icon"
            class="mt-0.5 size-4 shrink-0"
            :class="option === mode ? 'text-primary' : 'text-muted-foreground'"
            aria-hidden="true"
          />
          <span class="min-w-0 flex-1">
            <span class="block font-medium">{{ NOTIFY_OPTIONS[option].label }}</span>
            <span class="block text-xs text-muted-foreground">
              {{ NOTIFY_OPTIONS[option].hint }}
            </span>
          </span>
          <Check v-if="option === mode" class="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
