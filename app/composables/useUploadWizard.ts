import { useQueryClient } from '@tanstack/vue-query'
import { STUDIO_VIDEOS_KEY } from './useStudioVideos'
import { probeMedia } from '@/utils/media-probe'
import { buildUploadForm, postWithProgress } from '@/utils/upload'
import type { StudioDetails } from '@/utils/studio-form'
import { IMAGE_RULE, mediaRuleFor, rejectMediaFile } from '#shared/utils/studio'
import { STUDIO_TITLE_MAX } from '#shared/types/studio'
import type { ClipOrientation } from '#shared/types/discovery'
import type { StudioMediaKind, StudioVideo } from '#shared/types/studio'

/**
 * The upload wizard's state machine: which step, which file, and the transfer.
 *
 * The text fields are deliberately *not* here — vee-validate owns those (see
 * `app/utils/studio-form.ts`), so the wizard reads them through the `form`
 * argument rather than keeping a second copy that would have to be synced.
 * What's left is the part vee-validate has no opinion about: the media file,
 * what was measured from it, and the upload itself.
 *
 * Four steps, and the file is *not* sent until the last one. YouTube starts
 * uploading the moment you drop a file so the transfer overlaps with typing
 * the title, which needs a two-phase API — store the object, then create the
 * row — and with it a class of orphan: bytes on disk belonging to a form
 * nobody finished. One request at the end has no orphans to collect and no
 * second endpoint to secure, and the creator sees a real progress bar either
 * way. If uploads ever get long enough that the wait is the complaint, the
 * two-phase split is the change, and it starts here.
 */

export type WizardStep = 'choose' | 'details' | 'visibility' | 'done'

export const WIZARD_STEPS: readonly WizardStep[] = ['choose', 'details', 'visibility', 'done']

export interface WizardForm {
  /** Whether the vee-validate form currently satisfies the schema. */
  valid: () => boolean
  values: () => StudioDetails
  /** Called when a filename is used to pre-fill an untouched title. */
  setTitle: (title: string) => void
  reset: () => void
}

export function useUploadWizard(form: WizardForm) {
  const queryClient = useQueryClient()

  const step = ref<WizardStep>('choose')
  const kind = ref<StudioMediaKind>('video')

  const file = ref<File | null>(null)
  const durationSeconds = ref(0)
  const orientation = ref<ClipOrientation>('landscape')
  /** The captured frame or chosen cover, plus its preview URL for the form. */
  const thumbnail = ref<Blob | null>(null)
  const thumbnailUrl = ref('')
  const thumbnailCaptured = ref(false)

  const reading = ref(false)
  const uploading = ref(false)
  const progress = ref(0)
  const error = ref('')
  const published = ref<StudioVideo | null>(null)

  const stepIndex = computed(() => WIZARD_STEPS.indexOf(step.value))

  /**
   * Whether the current step is satisfied — drives the Next/Publish button's
   * disabled state, so what's missing is visible before the press rather than
   * after it.
   */
  const canAdvance = computed(() => {
    if (step.value === 'choose') return !!file.value && !reading.value
    if (step.value === 'details') return form.valid() && !!thumbnail.value
    if (step.value === 'visibility') return !uploading.value
    return false
  })

  /**
   * Accept a dropped or picked media file: hold it to the shared rules, then
   * read its duration, shape and poster frame out of it locally.
   *
   * A rejected file leaves the previous one in place — re-picking and getting
   * an error shouldn't also lose the file that was already working.
   */
  async function selectFile(candidate: File) {
    const rejection = rejectMediaFile(candidate, mediaRuleFor(kind.value))
    if (rejection) {
      error.value = rejection
      return
    }

    error.value = ''
    reading.value = true
    try {
      const probe = await probeMedia(candidate, kind.value)
      file.value = candidate
      durationSeconds.value = probe.durationSeconds
      orientation.value = probe.orientation
      if (probe.poster) setThumbnail(probe.poster, true)
      // A filename is a better first guess at a title than an empty box, and
      // it's the one the creator chose. Only ever pre-fills — `setTitle`
      // leaves anything already typed alone.
      form.setTitle(titleFromFilename(candidate.name))
    } catch (probeError) {
      error.value = probeError instanceof Error ? probeError.message : "That file couldn't be read."
    } finally {
      reading.value = false
    }
  }

  /** Replace the poster with a chosen image — the "change thumbnail" path. */
  function selectThumbnail(candidate: File) {
    const rejection = rejectMediaFile(candidate, IMAGE_RULE)
    if (rejection) {
      error.value = rejection
      return
    }
    error.value = ''
    setThumbnail(candidate, false)
  }

  function setThumbnail(blob: Blob, captured: boolean) {
    revokeThumbnail()
    thumbnail.value = blob
    thumbnailUrl.value = URL.createObjectURL(blob)
    thumbnailCaptured.value = captured
  }

  function revokeThumbnail() {
    if (thumbnailUrl.value) URL.revokeObjectURL(thumbnailUrl.value)
    thumbnailUrl.value = ''
  }

  /**
   * Switching between video and music discards the file — the accepted formats
   * are disjoint, so whatever was picked is now the wrong kind of thing.
   */
  function setKind(next: StudioMediaKind) {
    if (next === kind.value) return
    reset()
    kind.value = next
  }

  function next() {
    if (!canAdvance.value) return
    if (step.value === 'visibility') return publish()
    step.value = WIZARD_STEPS[stepIndex.value + 1]!
  }

  function back() {
    if (stepIndex.value > 0) step.value = WIZARD_STEPS[stepIndex.value - 1]!
  }

  async function publish() {
    if (!file.value || !thumbnail.value) return

    uploading.value = true
    progress.value = 0
    error.value = ''

    try {
      const details = form.values()
      const body = buildUploadForm({
        file: file.value,
        thumbnail: thumbnail.value,
        fields: {
          title: details.title.trim().slice(0, STUDIO_TITLE_MAX),
          description: details.description.trim(),
          category: details.category,
          visibility: details.visibility,
          kind: kind.value,
          durationSeconds: durationSeconds.value,
          orientation: orientation.value
        }
      })

      published.value = await postWithProgress<StudioVideo>('/api/studio/uploads', body, {
        onProgress: (percent) => (progress.value = percent)
      })
      // The content table is now one row out of date, and the creator is one
      // click from it.
      await queryClient.invalidateQueries({ queryKey: STUDIO_VIDEOS_KEY })
      step.value = 'done'
    } catch (uploadError) {
      error.value = uploadError instanceof Error ? uploadError.message : 'The upload failed.'
    } finally {
      uploading.value = false
    }
  }

  /** Back to an empty wizard, for "upload another". */
  function reset() {
    revokeThumbnail()
    form.reset()
    step.value = 'choose'
    file.value = null
    thumbnail.value = null
    thumbnailCaptured.value = false
    durationSeconds.value = 0
    orientation.value = 'landscape'
    progress.value = 0
    error.value = ''
    published.value = null
  }

  // A preview URL that outlives the component pins a multi-megabyte blob.
  onScopeDispose(revokeThumbnail)

  return {
    step,
    stepIndex,
    kind,
    file,
    durationSeconds,
    orientation,
    thumbnailUrl,
    thumbnailCaptured,
    reading,
    uploading,
    progress,
    error,
    published,
    canAdvance,
    selectFile,
    selectThumbnail,
    setKind,
    next,
    back,
    reset
  }
}

/** `Midnight Echo_final-v2.mp4` → `Midnight Echo final v2`. */
export function titleFromFilename(name: string): string {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, STUDIO_TITLE_MAX)
}
