<script setup lang="ts">
import { ArrowDown, MessageSquare, Send } from '@lucide/vue'
import type { ChatMessage } from '#shared/types/watch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useStickyScroll } from '@/composables/useStickyScroll'
import { useAuthStore } from '@/stores/auth'
import WatchChatMessage from './WatchChatMessage.vue'

const CHAT_MAX_LENGTH = 200

const props = defineProps<{
  messages: ChatMessage[]
  pending: boolean
  errored: boolean
  sending?: boolean
}>()
const emit = defineEmits<{ (e: 'send', body: string): void; (e: 'retry'): void }>()

const auth = useAuthStore()
const draft = ref('')
const list = ref<HTMLElement | null>(null)
const { pinned, onScroll, scrollToBottom } = useStickyScroll(list, () => props.messages.length)

const canSend = computed(() => auth.isAuthenticated && !props.sending && !!draft.value.trim())

function send() {
  if (!canSend.value) return
  emit('send', draft.value.trim().slice(0, CHAT_MAX_LENGTH))
  draft.value = ''
}
</script>

<template>
  <section
    class="flex h-[22rem] flex-col overflow-hidden rounded-xl border border-border bg-card sm:h-[26rem] lg:h-[32rem]"
    aria-labelledby="chat-heading"
  >
    <header class="flex items-center gap-2 border-b border-border px-4 py-3">
      <MessageSquare class="size-4 text-primary" aria-hidden="true" />
      <h2 id="chat-heading" class="text-sm font-semibold text-foreground">Live chat</h2>
      <span class="ml-auto text-xs text-muted-foreground">
        {{ messages.length }} {{ messages.length === 1 ? 'message' : 'messages' }}
      </span>
    </header>

    <div class="relative min-h-0 flex-1">
      <div v-if="pending" class="space-y-3 p-4">
        <div v-for="n in 6" :key="n" class="flex gap-2">
          <div class="size-6 shrink-0 animate-pulse rounded-full bg-muted" />
          <div class="h-8 flex-1 animate-pulse rounded bg-muted" />
        </div>
      </div>

      <div v-else-if="errored" class="grid h-full place-items-center p-6 text-center">
        <div>
          <p class="text-sm font-medium text-foreground">Chat disconnected</p>
          <Button type="button" variant="outline" size="sm" class="mt-3" @click="emit('retry')">
            Reconnect
          </Button>
        </div>
      </div>

      <p
        v-else-if="!messages.length"
        class="grid h-full place-items-center p-6 text-center text-sm text-muted-foreground"
      >
        No messages yet. Say something.
      </p>

      <ul
        v-else
        ref="list"
        class="h-full overflow-y-auto py-2"
        role="log"
        aria-live="polite"
        aria-label="Live chat messages"
        @scroll="onScroll"
      >
        <WatchChatMessage v-for="message in messages" :key="message.id" :message="message" />
      </ul>

      <Button
        v-if="!pinned && messages.length"
        type="button"
        size="sm"
        class="absolute bottom-3 left-1/2 -translate-x-1/2 shadow-lg"
        @click="scrollToBottom"
      >
        <ArrowDown />
        Jump to latest
      </Button>
    </div>

    <form class="border-t border-border p-3" @submit.prevent="send">
      <div v-if="auth.isAuthenticated" class="flex items-center gap-2">
        <Input
          v-model="draft"
          :maxlength="CHAT_MAX_LENGTH"
          placeholder="Send a message"
          aria-label="Send a chat message"
          class="h-9"
        />
        <Button type="submit" size="icon" class="size-9 shrink-0" :disabled="!canSend" aria-label="Send">
          <Send />
        </Button>
      </div>
      <p v-else class="text-center text-xs text-muted-foreground">
        <NuxtLink to="/login" class="font-semibold text-primary hover:underline">Log in</NuxtLink>
        to join the chat.
      </p>
    </form>
  </section>
</template>
