import type { ClipOrientation } from '#shared/types/discovery'
import type { StudioMediaKind } from '#shared/types/studio'

/**
 * What the browser can learn about a file before it is uploaded.
 *
 * The server has no media probe — there is no ffmpeg in the deployment target
 * and adding one to transcode a thumbnail would be a build dependency for a
 * job the browser already does. So duration, shape and the poster frame are
 * all measured here, from a `<video>` element pointed at a local object URL.
 * Nothing leaves the machine to do it.
 *
 * The consequence, stated plainly: these values are *claims*. The server
 * clamps the duration and takes the orientation at face value because the only
 * thing either drives is a label and which grid the clip lands in. Nothing
 * about authorization or storage depends on them.
 */

export interface MediaProbe {
  durationSeconds: number
  orientation: ClipOrientation
  /** A captured frame for video; `null` for audio, where the creator supplies cover art. */
  poster: Blob | null
}

/** Longest we'll wait for a browser to decode enough of a file to answer. */
const PROBE_TIMEOUT_MS = 15_000

/** Thumbnails are drawn at most this wide; height follows the source's aspect. */
const POSTER_MAX_WIDTH = 1280

/**
 * Ten percent in, rather than the first frame.
 *
 * Videos routinely open on black, a fade-in or a title card, and a thumbnail
 * of black is worse than no thumbnail — it reads as a broken upload. A tenth
 * of the way in is past the intro on almost anything and is still cheap to
 * seek to.
 */
const POSTER_POSITION = 0.1

export async function probeMedia(file: File, kind: StudioMediaKind): Promise<MediaProbe> {
  const url = URL.createObjectURL(file)
  try {
    return kind === 'music' ? await probeAudio(url) : await probeVideo(url)
  } finally {
    // Always — an object URL that outlives its file pins the whole blob in
    // memory, and these are measured in hundreds of megabytes.
    URL.revokeObjectURL(url)
  }
}

async function probeAudio(url: string): Promise<MediaProbe> {
  const audio = document.createElement('audio')
  audio.preload = 'metadata'
  audio.src = url

  await once(audio, 'loadedmetadata')
  return { durationSeconds: toSeconds(audio.duration), orientation: 'landscape', poster: null }
}

async function probeVideo(url: string): Promise<MediaProbe> {
  const video = document.createElement('video')
  video.preload = 'metadata'
  // Required on iOS Safari, which otherwise refuses to decode into a canvas
  // without a user gesture and hands back a blank frame.
  video.muted = true
  video.playsInline = true
  video.src = url

  await once(video, 'loadedmetadata')

  const durationSeconds = toSeconds(video.duration)
  // A square video is not a short — `>` rather than `>=` keeps 1:1 in the
  // landscape grid, where it renders fine, instead of the full-screen reel.
  const orientation: ClipOrientation =
    video.videoHeight > video.videoWidth ? 'vertical' : 'landscape'

  return { durationSeconds, orientation, poster: await capture(video, durationSeconds) }
}

/**
 * Seek, then draw one frame to a canvas.
 *
 * Returns `null` rather than throwing when the browser can't decode this
 * codec — the wizard's answer to a missing poster is to ask the creator for
 * one, which is a working path, and turning a thumbnail failure into an upload
 * failure would reject a video that is otherwise fine.
 */
async function capture(video: HTMLVideoElement, durationSeconds: number): Promise<Blob | null> {
  try {
    video.currentTime = Math.min(durationSeconds * POSTER_POSITION, durationSeconds)
    await once(video, 'seeked')

    const scale = Math.min(1, POSTER_MAX_WIDTH / video.videoWidth)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)

    const context = canvas.getContext('2d')
    if (!context || !canvas.width || !canvas.height) return null
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    return await toBlob(canvas)
  } catch {
    return null
  }
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  // JPEG, not PNG: a photographic frame as PNG is several megabytes for no
  // visible gain over a high-quality JPEG.
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82))
}

/**
 * Resolve on the next `type` event, reject on `error` or timeout.
 *
 * The timeout is the important half: a file the browser starts decoding and
 * then gives up on fires neither event, and without this the wizard would sit
 * on "reading file…" forever with no way back.
 */
function once(element: HTMLMediaElement, type: 'loadedmetadata' | 'seeked'): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => finish(new Error("That file couldn't be read.")),
      PROBE_TIMEOUT_MS
    )

    function finish(error?: Error) {
      clearTimeout(timer)
      element.removeEventListener(type, onDone)
      element.removeEventListener('error', onError)
      if (error) {
        reject(error)
        return
      }
      resolve()
    }

    const onDone = () => finish()
    const onError = () => finish(new Error("That file couldn't be read."))

    element.addEventListener(type, onDone, { once: true })
    element.addEventListener('error', onError, { once: true })
  })
}

/**
 * `Infinity` and `NaN` are both real answers from a media element — a stream
 * with no declared length, or metadata the browser couldn't parse. Either way
 * the honest duration is "unknown", which the schema stores as 0 and the UI
 * renders as a dash rather than `00:00`.
 */
function toSeconds(duration: number): number {
  return Number.isFinite(duration) && duration > 0 ? Math.round(duration) : 0
}
