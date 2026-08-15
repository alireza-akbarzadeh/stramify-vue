<script lang="ts" setup>
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import type { StudioVideo } from '#shared/types/studio'

/**
 * The confirmation in front of the one action in the studio with no undo.
 *
 * It names the video and lists what goes with it. "Are you sure?" over a
 * generic dialog is the version of this that gets clicked through without
 * reading — and the thing being deleted here takes the video's comments and
 * its stored file with it (UX: `confirmation-dialogs`).
 *
 * `AlertDialog` rather than `Dialog`: it traps focus on the *cancel* button by
 * default and can't be dismissed by clicking the backdrop, which is the right
 * bias when one of the two buttons is destructive.
 */
defineProps<{ video: StudioVideo | null; pending: boolean }>()

const emit = defineEmits<{ confirm: []; 'update:open': [open: boolean] }>()
</script>

<template>
  <AlertDialog :open="!!video" @update:open="emit('update:open', $event)">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete “{{ video?.title }}”?</AlertDialogTitle>
        <AlertDialogDescription>
          This permanently removes the video file, its thumbnail, and every comment and
          like on it. Anyone with the link will get a "not available" page. This can't be
          undone.
        </AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter>
        <AlertDialogCancel :disabled="pending">Keep it</AlertDialogCancel>
        <!--
          `@click.prevent` so the dialog stays open while the request is in
          flight — Reka closes on action by default, which would hide the
          pending state and leave a failure with nowhere to be reported.
        -->
        <AlertDialogAction
            :disabled="pending"
            class="bg-destructive text-destructive-foreground hover:opacity-90"
            @click.prevent="emit('confirm')"
        >
          {{ pending ? 'Deleting…' : 'Delete forever' }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
