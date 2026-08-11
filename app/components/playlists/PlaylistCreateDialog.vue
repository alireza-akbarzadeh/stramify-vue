<script setup lang="ts">
import { Plus } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PLAYLIST_DESCRIPTION_MAX, PLAYLIST_TITLE_MAX } from '#shared/types/library'
import type { PlaylistDraft, PlaylistVisibility } from '#shared/types/library'

/**
 * "New playlist".
 *
 * A dialog rather than an inline form because it's launched from two places
 * (the library header and the save-to-playlist menu) and both need the same
 * fields. `v-model:open` is exposed so the save menu can open it without
 * rendering the trigger — hence `hideTrigger`.
 *
 * Validation is a mirror of the endpoint's Zod schema, not a replacement for
 * it: this is here so the button can be disabled rather than the server having
 * to reject an obviously empty title (CLAUDE.md §5 — the real check stays
 * server-side).
 */
const props = defineProps<{ pending?: boolean; hideTrigger?: boolean }>()
const emit = defineEmits<{ (e: 'create', draft: PlaylistDraft): void }>()

const open = defineModel<boolean>('open', { default: false })

const title = ref('')
const description = ref('')
const visibility = ref<PlaylistVisibility>('private')

const valid = computed(() => title.value.trim().length > 0)

const VISIBILITIES: { value: PlaylistVisibility; label: string; hint: string }[] = [
  { value: 'private', label: 'Private', hint: 'Only you' },
  { value: 'unlisted', label: 'Unlisted', hint: 'Anyone with the link' },
  { value: 'public', label: 'Public', hint: 'Anyone' }
]

function submit() {
  if (!valid.value || props.pending) return
  emit('create', {
    title: title.value.trim(),
    description: description.value.trim() || undefined,
    visibility: visibility.value
  })
}

// Cleared on close, not on open: a failed create leaves the dialog up with
// what was typed still in it, so nothing has to be retyped.
watch(open, (isOpen) => {
  if (isOpen) return
  title.value = ''
  description.value = ''
  visibility.value = 'private'
})
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger v-if="!hideTrigger" as-child>
      <Button type="button" size="sm">
        <Plus />
        New playlist
      </Button>
    </DialogTrigger>

    <DialogContent>
      <DialogHeader>
        <DialogTitle>New playlist</DialogTitle>
        <DialogDescription>
          Collect clips to watch later or share. You can change who can see it at any time.
        </DialogDescription>
      </DialogHeader>

      <form class="grid gap-4" @submit.prevent="submit">
        <div class="grid gap-2">
          <Label for="playlist-title">Title</Label>
          <Input
            id="playlist-title"
            v-model="title"
            :maxlength="PLAYLIST_TITLE_MAX"
            placeholder="Late night sets"
            required
          />
        </div>

        <div class="grid gap-2">
          <Label for="playlist-description">Description <span class="text-muted-foreground">(optional)</span></Label>
          <Textarea
            id="playlist-description"
            v-model="description"
            :maxlength="PLAYLIST_DESCRIPTION_MAX"
            placeholder="What's in this one?"
            rows="3"
          />
        </div>

        <fieldset class="grid gap-2">
          <legend class="mb-2 text-sm font-medium text-foreground">Visibility</legend>
          <label
            v-for="option in VISIBILITIES"
            :key="option.value"
            class="flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2 text-sm transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
          >
            <input
              v-model="visibility"
              type="radio"
              name="playlist-visibility"
              :value="option.value"
              class="accent-primary"
            />
            <span class="font-medium text-foreground">{{ option.label }}</span>
            <span class="text-xs text-muted-foreground">{{ option.hint }}</span>
          </label>
        </fieldset>

        <DialogFooter>
          <Button type="button" variant="outline" @click="open = false">Cancel</Button>
          <Button type="submit" :disabled="!valid || pending">
            {{ pending ? 'Creating…' : 'Create' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
