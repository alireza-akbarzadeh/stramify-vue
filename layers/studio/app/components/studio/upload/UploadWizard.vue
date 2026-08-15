<script lang="ts" setup>
import { useForm } from 'vee-validate'
import { ArrowLeft, ArrowRight, Loader2, Music, Video } from '@lucide/vue'
import StudioChoiceGroup from '../StudioChoiceGroup.vue'
import type { Choice } from '../StudioChoiceGroup.vue'
import StudioVideoFields from '../StudioVideoFields.vue'
import UploadDoneStep from './UploadDoneStep.vue'
import UploadDropzone from './UploadDropzone.vue'
import UploadStepper from './UploadStepper.vue'
import UploadThumbnailPicker from './UploadThumbnailPicker.vue'
import UploadVisibilityStep from './UploadVisibilityStep.vue'
import { Button } from '@/components/ui/button'
import { studioDetailsValidation } from '../../../utils/studio-form'
import type { StudioDetails } from '../../../utils/studio-form'
import { useUploadWizard } from '../../../composables/useUploadWizard'
import type { StudioMediaKind } from '#shared/types/studio'

/**
 * The upload flow, end to end.
 *
 * Two owners, split along a clean line: vee-validate owns the four fields that
 * have a schema (`studioDetailsValidation`), and `useUploadWizard` owns the
 * file, what was measured from it, which step is showing and the transfer.
 * Neither keeps a copy of the other's state — the wizard reads the form
 * through the small `WizardForm` adapter below, which is the whole seam.
 */

/**
 * `keepValuesOnUnmount` is load-bearing, not a precaution.
 *
 * Each step is a `v-if`, so walking from Details to Visibility unmounts the
 * title, description and category fields — and vee-validate's default is to
 * drop a field's value when its component unmounts. Without this the review
 * panel on the last step renders "Title —" and Publish posts an empty title,
 * which the server correctly rejects as a 400. The wizard is one form spread
 * across four screens; the values have to outlive the screen that collected
 * them.
 *
 * `visibility` starts private so that a flow which somehow submits early
 * can't publish, matching the server's refusal to default that field at all.
 */
const form = useForm<StudioDetails>({
  keepValuesOnUnmount: true,
  validationSchema: studioDetailsValidation,
  initialValues: { title: '', description: '', category: 'Creative', visibility: 'private' }
})

const wizard = useUploadWizard({
  valid: () => form.meta.value.valid,
  values: () => form.values as StudioDetails,
  // Only ever a pre-fill: a title the creator has touched is theirs, and
  // having it overwritten by a filename after swapping the file would be a
  // small betrayal.
  setTitle: (title) => {
    if (!form.values.title) form.setFieldValue('title', title)
  },
  reset: () =>
    form.resetForm({
      values: { title: '', description: '', category: 'Creative', visibility: 'private' }
    })
})

const kindChoices: Choice<StudioMediaKind>[] = [
  { value: 'video', label: 'Video', detail: 'MP4, WebM or MOV. Tall videos become shorts automatically.', icon: Video },
  { value: 'music', label: 'Music or podcast', detail: 'MP3, M4A, WAV and more. Lands on the Music page.', icon: Music }
]

const nextLabel = computed(() => {
  if (wizard.step.value === 'visibility') return wizard.uploading.value ? 'Publishing…' : 'Publish'
  return 'Continue'
})

/** Category is fixed to Music once the creator says they're uploading a track. */
const lockedCategory = computed(() => (wizard.kind.value === 'music' ? ('Music' as const) : undefined))

// Keeps the form's category honest with the kind toggle, so what gets
// submitted matches what the details step told the creator it would be.
watch(wizard.kind, (kind) => {
  if (kind === 'music') form.setFieldValue('category', 'Music')
})
</script>

<template>
  <div class="mx-auto w-full max-w-4xl">
    <UploadStepper :current="wizard.stepIndex.value" @go="wizard.goTo"/>

    <!--
      `form` rather than a div: Enter in the title field should advance the
      step, which is what a form's implicit submission does for free. The
      wizard decides what "submit" means per step.
    -->
    <form class="mt-8" novalidate @submit.prevent="wizard.next()">
      <div
          class="rounded-2xl border border-border bg-card/60 p-5 shadow-[0_1px_2px_var(--shadow-color)] sm:p-7"
      >
        <template v-if="wizard.step.value === 'choose'">
          <StudioChoiceGroup
              :choices="kindChoices"
              :columns="2"
              :model-value="wizard.kind.value"
              class="mb-6"
              label="What are you uploading?"
              @update:model-value="wizard.setKind"
          />

          <UploadDropzone
              :duration-seconds="wizard.durationSeconds.value"
              :file="wizard.file.value"
              :kind="wizard.kind.value"
              :reading="wizard.reading.value"
              @select="wizard.selectFile"
          />
        </template>

        <template v-else-if="wizard.step.value === 'details'">
          <div class="grid gap-6">
            <StudioVideoFields :locked-category="lockedCategory"/>
            <UploadThumbnailPicker
                :captured="wizard.thumbnailCaptured.value"
                :url="wizard.thumbnailUrl.value"
                @select="wizard.selectThumbnail"
            />
          </div>
        </template>

        <template v-else-if="wizard.step.value === 'visibility'">
          <UploadVisibilityStep
              :duration-seconds="wizard.durationSeconds.value"
              :file-name="wizard.file.value?.name ?? ''"
              :kind="wizard.kind.value"
              :progress="wizard.progress.value"
              :thumbnail-url="wizard.thumbnailUrl.value"
              :title="form.values.title ?? ''"
              :uploading="wizard.uploading.value"
          />
        </template>

        <UploadDoneStep
            v-else-if="wizard.published.value"
            :video="wizard.published.value"
            @again="wizard.reset"
        />
      </div>

      <!--
        `role="alert"` so a rejection is announced, not just drawn — a creator
        using a screen reader gets no other signal that the file they dropped
        was refused (UX: `aria-live-errors`).
      -->
      <p
          v-if="wizard.error.value"
          class="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
      >
        {{ wizard.error.value }}
      </p>

      <div v-if="wizard.step.value !== 'done'" class="mt-6 flex items-center justify-between gap-3">
        <Button
            :disabled="wizard.stepIndex.value === 0 || wizard.uploading.value"
            type="button"
            variant="ghost"
            @click="wizard.back()"
        >
          <ArrowLeft aria-hidden="true"/>
          Back
        </Button>

        <Button :disabled="!wizard.canAdvance.value" size="lg" type="submit">
          <Loader2 v-if="wizard.uploading.value" aria-hidden="true" class="animate-spin"/>
          {{ nextLabel }}
          <ArrowRight v-if="!wizard.uploading.value" aria-hidden="true"/>
        </Button>
      </div>
    </form>
  </div>
</template>
