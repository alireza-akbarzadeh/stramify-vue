<script setup lang="ts">
import { Search, Trash2, X } from '@lucide/vue'
import { toast } from 'vue-sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useClearHistory } from '@/composables/useHistory'

/**
 * Search within history, and clear all of it.
 *
 * The clear mutation is owned here rather than by the view because the dialog
 * that guards it is this component's own affordance, and nothing above reacts
 * to the result beyond the cache invalidation the composable already does.
 *
 * `disabled` when there's nothing to clear: a destructive button that does
 * nothing is worse than one that isn't offered.
 */
defineProps<{ hasHistory: boolean }>()
const term = defineModel<string>({ required: true })

const clear = useClearHistory()

function confirmClear() {
  clear.mutate(undefined, {
    onSuccess: ({ removed }) =>
      toast.success(removed === 1 ? 'Removed 1 video' : `Removed ${removed} videos`),
    onError: () => toast.error("Couldn't clear your history. Nothing was removed.")
  })
}
</script>

<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <!-- A label, not a placeholder-only field: the placeholder disappears the
         moment you type, and "what was this box for" is exactly the question a
         half-typed search raises. Visually hidden because the icon and the
         page context carry it for sighted users. -->
    <div class="relative w-full sm:max-w-sm">
      <label class="sr-only" for="history-search">Search watch history</label>
      <Search
        aria-hidden="true"
        class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        id="history-search"
        v-model="term"
        autocomplete="off"
        class="pl-9 pr-9"
        placeholder="Search watch history"
        type="search"
      />
      <Button
        v-if="term"
        aria-label="Clear search"
        class="absolute right-1 top-1/2 size-9 -translate-y-1/2 rounded-full"
        size="icon"
        type="button"
        variant="ghost"
        @click="term = ''"
      >
        <X class="size-4" />
      </Button>
    </div>

    <AlertDialog>
      <AlertDialogTrigger as-child>
        <Button
          :disabled="!hasHistory || clear.isPending.value"
          class="shrink-0 self-start sm:self-auto"
          size="sm"
          type="button"
          variant="outline"
        >
          <Trash2 class="size-4" />
          {{ clear.isPending.value ? 'Clearing…' : 'Clear all history' }}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear all watch history?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes every video from your history and can't be undone. It also empties Continue
            watching, since that's built from the same saved positions.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <!-- Destructive styling on the confirming action, and Cancel first,
               so the button under the thumb on a phone is the safe one. -->
          <AlertDialogAction
            class="bg-destructive text-white hover:bg-destructive/90"
            @click="confirmClear"
          >
            Clear history
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
