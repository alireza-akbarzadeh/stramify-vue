<script setup lang="ts">
import { Send } from '@lucide/vue'
import type { ComponentPublicInstance } from 'vue'
import type { AiTurn } from '#shared/types/ai'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAutoGrow } from '@/composables/useAutoGrow'
import { useStickyScroll } from '@/composables/useStickyScroll'
import { useAuthStore } from '@/stores/auth'
import WatchAiPrompts from './WatchAiPrompts.vue'
import WatchAiTurn from './WatchAiTurn.vue'

const QUESTION_MAX_LENGTH = 500

/**
 * The conversation and its composer.
 *
 * `turns` holds answered exchanges only; the question in flight arrives
 * separately as `pendingQuestion` and is drawn optimistically at the end. That
 * split is what makes a failed ask recoverable — the composer refills with the
 * question that didn't land, and nothing half-finished ever enters the history
 * the next request replays (see `useWatchAsk`).
 *
 * Sign-in is required to ask, matching chat and comments on this page: each
 * question is a metered model call that can't be cached. The server enforces
 * it; this is the courtesy that saves someone typing a paragraph first.
 */
const props = defineProps<{
  turns: AiTurn[]
  pendingQuestion: string | null
  followUps: string[]
  suggestions: string[]
  sending: boolean
  error: string | null
}>()
const emit = defineEmits<{ (e: 'ask', question: string): void }>()

const auth = useAuthStore()
const draft = ref('')
/**
 * `ui/textarea` is a component, so a template ref on it hands back the
 * instance, not the element — `.focus()` and `.style` live one level down on
 * `$el`. Resolving it once here keeps that detail out of the two places that
 * need the real node.
 */
const field = useTemplateRef<ComponentPublicInstance>('field')
const fieldEl = computed(() => (field.value?.$el as HTMLTextAreaElement | undefined) ?? null)
useAutoGrow(fieldEl, draft, 140)

const log = useTemplateRef<HTMLElement>('log')
const { onScroll } = useStickyScroll(log, () => props.turns.length + (props.pendingQuestion ? 1 : 0))

const trimmed = computed(() => draft.value.trim())
const canSend = computed(() => auth.isAuthenticated && !props.sending && !!trimmed.value)
const started = computed(() => props.turns.length > 0 || !!props.pendingQuestion)

/**
 * Only offer openers before the first question. Once there's a thread the
 * model's own follow-ups are the better prompt, and keeping both would put two
 * competing chip rows around a conversation that already has a text box.
 */
const prompts = computed(() => (started.value ? props.followUps : props.suggestions))
const promptLabel = computed(() => (started.value ? 'Ask next' : 'Try asking'))

function send() {
  if (!canSend.value) return
  emit('ask', trimmed.value.slice(0, QUESTION_MAX_LENGTH))
  draft.value = ''
}

/** A suggestion fills the box and hands over the caret — it doesn't send. */
function usePrompt(prompt: string) {
  draft.value = prompt
  fieldEl.value?.focus()
}

/**
 * Put a failed question back in the composer so retrying is one keypress
 * rather than retyping it.
 *
 * The question has to be stashed on the way *out* — by the time the error
 * arrives, `pendingQuestion` has already been cleared. Restoring only on the
 * transition into an error, and only into an empty box, keeps it from
 * clobbering something typed while the request was in flight.
 */
const lastAttempt = ref('')
watch(
  () => props.pendingQuestion,
  (question) => {
    if (question) lastAttempt.value = question
  }
)
watch(
  () => props.error,
  (message, previous) => {
    if (message && !previous && !draft.value) draft.value = lastAttempt.value
  }
)
</script>

<template>
  <div class="space-y-3">
    <ul
      v-if="started"
      ref="log"
      class="max-h-72 space-y-3 overflow-y-auto pr-1"
      role="log"
      aria-live="polite"
      aria-label="Conversation with the assistant"
      @scroll="onScroll"
    >
      <WatchAiTurn v-for="(turn, index) in turns" :key="index" :turn="turn" />
      <WatchAiTurn
        v-if="pendingQuestion"
        :turn="{ role: 'user', text: pendingQuestion }"
        class="opacity-70"
      />
      <li v-if="sending" class="flex items-center gap-2 pl-8.5 text-xs text-muted-foreground">
        <span class="size-1.5 animate-pulse rounded-full bg-primary" aria-hidden="true" />
        Thinking…
      </li>
    </ul>

    <p
      v-if="error"
      class="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-foreground"
      role="alert"
    >
      {{ error }}
    </p>

    <WatchAiPrompts
      :label="promptLabel"
      :prompts="prompts"
      :disabled="sending || !auth.isAuthenticated"
      @pick="usePrompt"
    />

    <form v-if="auth.isAuthenticated" class="flex items-end gap-2" @submit.prevent="send">
      <Textarea
        ref="field"
        v-model="draft"
        rows="1"
        :maxlength="QUESTION_MAX_LENGTH"
        :disabled="sending"
        placeholder="Ask about this video…"
        aria-label="Ask the assistant about this video"
        class="min-h-9 w-full resize-none py-2 text-sm"
        @keydown.enter.exact.prevent="send"
      />
      <Button
        type="submit"
        size="icon"
        class="size-9 shrink-0"
        :disabled="!canSend"
        aria-label="Send question"
      >
        <Send />
      </Button>
    </form>

    <p v-else class="rounded-lg bg-surface-2 px-3 py-2.5 text-center text-xs text-muted-foreground">
      <NuxtLink to="/login" class="font-semibold text-primary hover:underline">Log in</NuxtLink>
      to ask about this video.
    </p>
  </div>
</template>
