# Creator Studio

The creator-facing half of the app: upload a video or a track, and manage what
you've published. Lives under `/studio`, behind the `auth` middleware and the
`studio` layout.

Decisions behind it: [ADR-030](./DECISIONS.md) (uploads are `clips` rows with an
owner and a visibility) and [ADR-031](./DECISIONS.md) (local-disk object storage
behind a seam, served with byte ranges).

## What exists

| Route | What it is |
|---|---|
| `/studio/upload` | Four-step upload wizard |
| `/studio/videos` | Content manager — search, filter, sort, delete |
| `/studio/videos/[id]` | Edit one upload |

Still `ComingSoon`: the studio dashboard (`/studio`), analytics, comments,
playlists, monetization, customization and settings.

## The data model

No new tables. A studio upload **is** a clip — see ADR-030 for why — so
publishing one immediately gets comments, reactions, watch history, playlists
and a `/watch/<id>` page with no extra code. Migration `0012` added two columns
to `clips`:

- **`owner_id`** — nullable FK to `user`. Null means "seeded, nobody's". The
  studio lists and authorizes on this column only.
- **`visibility`** — `private | unlisted | public`, defaulting to `public` so
  the migration left existing rows untouched.

### Where visibility is enforced

One expression, `publishedClips` in `server/utils/discovery.ts`, plus
`publishedClipsSql` for the raw-SQL queries. Applied to: discovery clips and
categories, home feed, following, shorts, music, search, notifications, the
channel directory, a channel's videos tab, up-next, and platform-pulse counts.

**`unlisted` differs from `private` in exactly one place** —
`resolveWatchTarget` in `server/utils/watch.ts`, which resolves by id. Unlisted
resolves for anyone with the link; private resolves for its owner and nobody
else, which is what lets a creator preview a draft on the real watch page.

Deliberately *not* filtered: liked, watch later, playlists, history,
continue-watching. A clip only gets into one of those by having been watchable
when it was saved; dropping it on unpublish would edit a stranger's library.

If you add a browse surface, `grep publishedClips` is the checklist.

## Storage

`server/utils/storage.ts` is the only module that knows where bytes live.

```
UPLOAD_DIR (default .data/uploads)
├── video/<uuid>.mp4
├── audio/<uuid>.mp3
└── thumb/<uuid>.jpg
```

Served by `server/api/media/[...key].get.ts` at `/api/media/<key>`, with
`Range` support (`server/utils/range.ts`) so seeking works. Keys are matched
against an exact pattern before touching the filesystem — traversal is
unrepresentable, not merely rejected.

**Swapping in R2**: rewrite `putObject`/`deleteObjectByUrl` as S3 calls and
return the bucket URL from `objectUrl`. Nothing else changes — not the upload
endpoint, not the database, not any player.

## The upload flow

```
choose ──▶ details ──▶ visibility ──▶ done
 file       title        who can        links to
 + kind     thumbnail    watch          watch/share
```

`app/composables/useUploadWizard.ts` owns the file, what was measured from it,
the step and the transfer. **vee-validate owns the four schema-backed fields**
(`app/utils/studio-form.ts`) — neither keeps a copy of the other's state; the
`WizardForm` adapter in `UploadWizard.vue` is the whole seam.

Two things worth knowing:

- **The file is not sent until the last step.** YouTube uploads while you type,
  which needs a two-phase API and creates orphaned objects for abandoned forms.
  One request at the end has no orphans and no second endpoint to secure. If the
  wait ever becomes the complaint, splitting it is the change.
- **Duration, orientation and the poster frame are measured in the browser**
  (`app/utils/media-probe.ts`) — there is no server-side ffmpeg. A tall video
  becomes a short automatically. The poster is grabbed 10% in, because videos
  open on black. These are *claims*: the server clamps duration and nothing
  about auth or storage depends on them.

Progress is real — `app/utils/upload.ts` uses `XMLHttpRequest` because `fetch`
cannot report upload progress.

## The content manager

`useStudioVideos` (TanStack Query) for the data, `useStudioFilters` for
search/filter/sort. Filtering is client-side because the list endpoint returns
one creator's whole catalogue unpaginated; when that stops being reasonable,
`useStudioFilters`' shape is already the query it would send.

Four real states: loading skeletons, an error with a retry, "you haven't
uploaded anything" (offers the uploader), and "nothing matches those filters"
(offers to clear them). The last two are separate on purpose.

Delete is optimistic and rolls back on failure, but always behind an
`AlertDialog` that names the video and says what goes with it — it cascades to
comments, reactions, playlist entries and watch history, deletes the stored
file, and has no undo.

`StudioVideoFields.vue` is shared by the wizard's details step and the edit
page, so the two cannot drift on labels, limits or validation.

**The media file is not replaceable on an existing upload.** Swapping bytes
under a published id would change what everyone who already commented or liked
was talking about. Delete and re-upload is the honest path.

## API

| Method | Route | Notes |
|---|---|---|
| `GET` | `/api/studio/videos` | Owner's uploads, newest first, unpaginated |
| `GET` | `/api/studio/videos/[id]` | One upload; 404 if not yours |
| `PATCH` | `/api/studio/videos/[id]` | Title, description, category, visibility |
| `DELETE` | `/api/studio/videos/[id]` | Row, file and thumbnail |
| `POST` | `/api/studio/uploads` | Multipart: `fields` (JSON) + `file` + `thumbnail` |
| `GET` | `/api/media/[...key]` | Public, range-capable |

Ownership is folded into the `where` of every statement
(`server/utils/studio.ts`) rather than checked after a read — a `where` that
doesn't match affects zero rows, while a post-read check is one a future call
site can forget. Someone else's video is a 404, never a 403.

`POST /api/studio/uploads` requires an explicit `visibility`. There is no
default, so a missing field is a 400 and never a silent publish.

## Limits

In `shared/utils/studio.ts`, checked in the browser *and* on the server:

| | Formats | Max |
|---|---|---|
| Video | MP4, WebM, MOV | 512 MB |
| Audio | MP3, M4A, AAC, WAV, OGG, WebA | 64 MB |
| Thumbnail | JPEG, PNG, WebP | 8 MB |

Title 100 chars, description 5000, duration capped at 6 hours.

Only formats browsers play natively, because there is no transcoding step.

## Failure modes

- **Upload 413** — over the size ceiling. Checked against `Content-Length`
  before the body is buffered, since `readMultipartFormData` holds the whole
  request in memory.
- **Poster capture returns null** — a codec the browser won't decode into a
  canvas. Not fatal: the wizard asks for a thumbnail instead, and won't advance
  without one.
- **Duration reads 0** — `Infinity`/`NaN` from the media element. Stored as 0,
  rendered as a dash, never as `00:00`.
- **A private video 404s on `/watch`** — correct for everyone but its owner.
- **An upload doesn't appear in a feed** — check its visibility before
  suspecting the feed.
- **Orphaned files** — delete removes the row first, then the objects. A failure
  between the two leaves a file nobody can see rather than a row whose video
  404s.

## ⚠️ Three traps in the wizard, all found by running it

These cost real debugging time. Each has a test behind it now; don't undo them.

### 1. `keepValuesOnUnmount: true` is load-bearing

Each step is a `v-if`, so walking Details → Visibility **unmounts** the title,
description and category fields, and vee-validate's default is to discard a
field's value when its component unmounts. Without this flag the review panel
renders `Title —` and Publish posts an empty title, which the server correctly
rejects as a 400. The wizard is one form spread across four screens; the values
have to outlive the screen that collected them.

### 2. Every step needs a `StepperTrigger`, even a non-interactive one

Reka's `StepperRoot` renders a screen-reader-only "Step 3 of 4" whose total
comes from `totalStepperItems` — a set that **only `StepperTrigger` registers
into**. An earlier version omitted the trigger to keep the stepper
non-interactive and the announcement silently became **"Step 4 of 0"**: the one
part of the component that exists purely for assistive tech was the broken
part. Steps ahead of you are `disabled` (so no jumping to a screen whose
prerequisites aren't met); steps behind stay live and act as a way back.

### 3. Do not put `.default()` in `studioDetailsSchema`

`@vee-validate/zod@4.15.1` walks the schema for defaults and calls
`_def.defaultValue()` **as a function**. In zod 4 — which this project pins —
that property is a plain value, so one `.default()` anywhere in that object
throws `value._def.defaultValue is not a function` from inside `useForm`,
taking down **both** the upload wizard and the edit page on mount, before
either renders a single field.

Starting values go in `initialValues` at the two call sites instead. This is
covered by `UploadWizard.spec.ts` and `StudioVideoEditor.spec.ts` — both mount
the real component, so a reintroduction fails the suite rather than the page.

## Testing

```bash
pnpm vitest run shared/utils/studio.spec.ts server/utils/range.spec.ts app/utils/upload.spec.ts app/composables/useStudioFilters.spec.ts app/components/studio
```

84 tests across nine files.

**Pure logic** — shared limits and rejection messages, slug generation,
byte-range parsing (including 416 and the multi-range fallback), progress
arithmetic, and the filter/sort/search matrix.

**Mounted components** — `StudioChoiceGroup` (real radios, one group name,
emits rather than mutates), `StudioVisibilityBadge` (word + icon, never colour
alone), `StudioVideoList` (all four states, and specifically that "nothing
matches those filters" is not the "you haven't uploaded anything" screen),
`UploadWizard` (opens on the file step, won't advance without a file, swaps
accepted formats with the kind toggle) and `StudioVideoEditor` (seeds from its
prop, Save stays disabled until `meta.dirty`).

The wizard's transfer and the media probing are not unit-tested: both need a
real `File` that the browser can decode, and happy-dom has no codec. They're
covered by `app/utils/upload.spec.ts` at the arithmetic level and by the live
`Range` check on the media route.
