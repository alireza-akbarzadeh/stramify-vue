<script lang="ts" setup>
import {Button} from '@/components/ui/button'
import {useAutoGrow} from '@/composables/useAutoGrow'
import ChannelAvatar from '@/components/ChannelAvatar.vue'
import {useAuthStore} from '@/stores/auth'
import {Textarea} from "~/components/ui/textarea";

const COMMENT_MAX_LENGTH = 1000

/**
 * The comment box, used for both a new thread and a reply. A reply passes
 * `compact` (smaller avatar, always-open actions, autofocus) — the two differ
 * only in chrome, so they're one component rather than two that drift.
 *
 * Actions stay hidden until the box is focused or has content, which keeps a
 * long comment list from carrying a row of dead buttons above it.
 *
 * The avatar comes from `stores/auth` — only ever the signed-in viewer's own,
 * so there is nothing for a caller to pass in.
 */
const props = withDefaults(
    defineProps<{
      pending?: boolean
      compact?: boolean
      placeholder?: string
      submitLabel?: string
    }>(),
    {
      pending: false,
      compact: false,
      placeholder: 'Add a comment…',
      submitLabel: 'Comment'
    }
)
const emit = defineEmits<{ (e: 'submit', body: string): void; (e: 'cancel'): void }>()

const auth = useAuthStore()

const draft = ref('')
const focused = ref(false)
const field = useTemplateRef<HTMLTextAreaElement>('field')
useAutoGrow(field, draft)

const trimmed = computed(() => draft.value.trim())
const open = computed(() => props.compact || focused.value || !!trimmed.value)
const canSubmit = computed(() => !props.pending && !!trimmed.value)

onMounted(() => {
  if (props.compact) field.value?.focus()
})

function submit() {
  if (!canSubmit.value) return
  emit('submit', trimmed.value.slice(0, COMMENT_MAX_LENGTH))
  draft.value = ''
  focused.value = false
}

function cancel() {
  draft.value = ''
  focused.value = false
  emit('cancel')
}
</script>

<template>
  <form :class="['flex gap-3', compact && 'mt-3']" @submit.prevent="submit">
    <ChannelAvatar
        :class="compact ? 'size-7 text-[11px]' : 'size-9'"
        :image="auth.user?.image"
        :name="auth.user?.name ?? '?'"
    />
    <div class="min-w-0 flex-1">
      <Textarea
          ref="field"
          v-model="draft"
          :aria-label="placeholder"
          :disabled="pending"
          :maxlength="COMMENT_MAX_LENGTH"
          :placeholder="placeholder"
          class="w-full resize-none border-0 border-b border-border bg-transparent pb-2 text-sm outline-none transition-colors placeholder:text-muted-foreground disabled:opacity-60"
          rows="3"
          @focus="focused = true"
          @keydown.enter.exact.prevent="submit"
          @keydown.esc="cancel"

      />
      <div v-if="open" class="mt-2 flex items-center justify-end gap-2">
        <span
            v-if="trimmed.length > COMMENT_MAX_LENGTH - 100"
            class="mr-auto text-xs text-muted-foreground"
        >
          {{ COMMENT_MAX_LENGTH - trimmed.length }} left
        </span>
        <Button :disabled="pending" size="sm" type="button" variant="ghost" @click="cancel">
          Cancel
        </Button>
        <Button :disabled="!canSubmit" size="sm" type="submit">
          {{ pending ? 'Posting…' : submitLabel }}
        </Button>
      </div>
    </div>
  </form>
</template>
