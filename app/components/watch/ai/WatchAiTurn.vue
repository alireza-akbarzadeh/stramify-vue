<script setup lang="ts">
import { Sparkles } from '@lucide/vue'
import type { AiTurn } from '#shared/types/ai'
import ChannelAvatar from '@/components/ChannelAvatar.vue'
import { useAuthStore } from '@/stores/auth'

/**
 * One line of the conversation. The viewer's questions sit right and carry
 * their own avatar; the assistant's answers sit left under a mark that is
 * deliberately not a person's face — nothing here should read as a human
 * having watched the video and reported back.
 */
defineProps<{ turn: AiTurn }>()

const auth = useAuthStore()
</script>

<template>
  <li :class="['flex gap-2.5', turn.role === 'user' ? 'flex-row-reverse' : 'flex-row']">
    <ChannelAvatar
      v-if="turn.role === 'user'"
      class="size-6 shrink-0 text-[10px]"
      :image="auth.user?.image"
      :name="auth.user?.name ?? '?'"
    />
    <span
      v-else
      class="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"
      aria-hidden="true"
    >
      <Sparkles class="size-3.5" />
    </span>

    <p
      :class="[
        'max-w-[85%] whitespace-pre-line rounded-xl px-3 py-2 text-sm leading-relaxed',
        turn.role === 'user'
          ? 'bg-primary text-primary-foreground'
          : 'bg-surface-2 text-foreground'
      ]"
    >
      <span class="sr-only">{{ turn.role === 'user' ? 'You asked:' : 'Assistant answered:' }}</span>
      {{ turn.text }}
    </p>
  </li>
</template>
