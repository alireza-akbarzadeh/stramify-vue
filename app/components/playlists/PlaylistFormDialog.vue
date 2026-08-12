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
import type { PlaylistDraft, PlaylistSummary, PlaylistVisibility } from '#shared/types/library'

/**
 * The playlist form — "New playlist" and "Edit playlist" are the same three
 * fields, so they're the same dialog.
 *
 * Pass `playlist` to edit it and the dialog seeds from it, retitles itself and
 * emits the changed fields; leave it out and it's a create form. Launched from
 * four places (the library header, a library card's menu, the detail page
 * header, and the watch page's save menu), which is why the fields live here
 * rather than inline in any of them.
 *
 * `v-model:open` is exposed so the menu-driven callers can open it without
 * rendering a trigger — hence `hideTrigger`.
 *
 * Validation mirrors the endpoint's Zod schema rather than replacing it: it's
 * here so the button can be disabled, not so the server can trust the client
 * (CLAUDE.md §5 — the real check stays server-side).
 */
const props = defineProps<{
  pending?: boolean
  hideTrigger?: boolean
  playlist?: PlaylistSummary | null
}>()
const emit = defineEmits<{ (e: 'submit', draft: PlaylistDraft): void }>()

const open = defineModel<boolean>('open', { default: false })

const title = ref('')
const description = ref('')
const visibility = ref<PlaylistVisibility>('private')

const editing = computed(() => !!props.playlist)
const valid = computed(() => title.value.trim().length > 0)

// Scoped ids: a library page can have this dialog mounted more than once (the
// header's and a card's), and duplicate DOM ids would point every label at the
// first one's input.
const titleId = useId()
const descriptionId = useId()
const visibilityName = useId()

const VISIBILITIES: { value: PlaylistVisibility; label: string; hint: string }[] = [
  { value: 'private', label: 'Private', hint: 'Only you' },
  { value: 'unlisted', label: 'Unlisted', hint: 'Anyone with the link' },
  { value: 'public', label: 'Public', hint: 'Anyone' }
]

function submit() {
  if (!valid.value || props.pending) return
  emit('submit', {
    title: title.value.trim(),
    // `''` rather than `undefined` when editing: the patch endpoint reads an
    // empty string as "clear it", where an absent field means "leave it".
    description: editing.value ? description.value.trim() : description.value.trim() || undefined,
    visibility: visibility.value
  })
}

// Seeded on open, not cleared on close, so a failed submit leaves the dialog up
// with what was typed still in it and nothing has to be retyped.
watch(open, (isOpen) => {
  if (!isOpen) return
  title.value = props.playlist?.title ?? ''
  description.value = props.playlist?.description ?? ''
  visibility.value = props.playlist?.visibility ?? 'private'
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
        <DialogTitle>{{ editing ? 'Edit playlist' : 'New playlist' }}</DialogTitle>
        <DialogDescription>
          Collect clips to watch later or share. You can change who can see it at any time.
        </DialogDescription>
      </DialogHeader>

      <form class="grid gap-4" @submit.prevent="submit">
        <div class="grid gap-2">
          <Label :for="titleId">Title</Label>
          <Input
            :id="titleId"
            v-model="title"
            :maxlength="PLAYLIST_TITLE_MAX"
            placeholder="Late night sets"
            required
          />
        </div>

        <div class="grid gap-2">
          <Label :for="descriptionId">
            Description <span class="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            :id="descriptionId"
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
              :name="visibilityName"
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
            <template v-if="editing">{{ pending ? 'Saving…' : 'Save' }}</template>
            <template v-else>{{ pending ? 'Creating…' : 'Create' }}</template>
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
