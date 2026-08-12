# Liked videos (`/liked`)

The library that answers "what was that video I liked?". Until this was built,
`/liked` was a `ComingSoon` placeholder that the sidebar linked to (and whose
copy said "playlist"), so a like was write-only: you could leave one on the
watch page and never see it again.

## What it is

A searchable, sortable, paged view over the likes you have already left:

- **`GET /api/liked`** — one page of liked clips. `?q=` filters, `?sort=`
  reorders, `?cursor=`/`?limit=` page. Signed out it answers an empty page.
- **`POST /api/liked`** `{ clipId }` — like a clip outright. Idempotent.
- **`DELETE /api/liked/[clipId]`** — take the like back. Idempotent.

One surface reads it (`/liked`), and two write it: the watch page's thumbs-up,
and this page's own "Remove from Liked videos" with an Undo on the toast.

## Why there is no `liked` table

Because a like already has one. A like **is** a `reactions` row with
`value = 'like'` — the row the watch page's thumbs-up writes and
`readReactionSummary` counts. This page reads those rows back.

That's the whole design, and it's what makes the page honest: there is no
second copy of the state to keep in sync, so a like left on `/watch` is on
`/liked` at the next load, and a removal here un-lights the button there.
A dedicated table would have meant two writes per press and a class of bug
where the page and the button disagree.

**Clips only.** `reactions.target_kind` can also be `'live'`, but a live
session ends, and a library full of dead links to streams that finished last
month isn't a library. The session's VOD is a clip and appears here on its own.
The `innerJoin` on `clips` enforces this structurally (a `live_streams.id`
can't match a `clips.id`); the explicit `target_kind` filter says so out loud.

Shorts — vertical clips — are **not** filtered out. A liked short is a liked
video, and dropping it would silently lose something the viewer chose. Its card
links to `/watch/[id]` like any other, and that page redirects verticals to
`/shorts?v=` (see `WatchClip.orientation`).

## Set, not toggle

`POST /api/watch/[slug]/reaction` already exists and is what the thumbs-up
calls. It **toggles**: pressing it on something already liked clears it. That's
right under a button whose job is to express both answers, and wrong for both
of this page's writes, where the caller knows the outcome it wants:

- `DELETE /api/liked/[clipId]` means remove, whatever the row currently says —
  a toggle arriving against a stale row would *re-like* the video the viewer
  just asked to drop.
- `POST /api/liked` is the Undo behind that removal. An upsert on the unique
  `(user_id, target_id)` pair, so it lands on `like` whether the viewer had
  nothing, a like, or a dislike.

The delete is also scoped to `value = 'like'`, so an unlike racing a change of
mind on the watch page can only ever remove a like — never silently clear a
dislike left in between.

## Ordering, and the index it needs

Three orders, validated at the boundary against the same `LIKED_SORTS` tuple
the menu is built from — one list, so the UI and the schema can't drift:

| `?sort=`  | Label            | `ORDER BY`                                     |
| --------- | ---------------- | ---------------------------------------------- |
| `recent`  | Recently liked   | `reactions.created_at DESC` (default)          |
| `oldest`  | First liked      | `reactions.created_at ASC`                     |
| `popular` | Most viewed      | `clips.views DESC, reactions.created_at DESC`  |

`recent` and `oldest` are a single key deliberately: that's
`reactions_user_created_idx` (`user_id, created_at`, added with this feature)
exactly, so paging is an index scan rather than a sort over every reaction the
viewer has ever left. `popular` orders by a column on the *joined* table and
can't use an index whatever we do, so it can afford the recency tiebreak that
keeps two equally-viewed clips stable across pages.

Search is substring over title and channel, case-insensitive, sharing
`toLikePattern` with `/api/search` so the `%`/`_` escaping rule is written down
once rather than per surface.

## Cache shape

Everything lives under the `['liked']` prefix, with both filters in the key:

- `['liked', 'list', <term>, <sort>]` — one infinite query per combination

Removing patches **every** cached combination optimistically, so the card
doesn't reappear when the search box is cleared or the sort is changed.
Restoring invalidates instead of re-inserting — the card has to land in the
position the current sort says it belongs, which the client can't work out for
"Most viewed". Both also invalidate `['watch', 'reaction', <clipId>]`, the key
`useWatchReaction` holds the thumbs-up state under.

`staleTime: 0`, like every other personalised surface: liking something and
coming back to a list that doesn't show it reads as a dropped like.

## URL state

`?q=` and `?sort=` mirror the toolbar, so a filtered list is a URL you can
bookmark and come back to. `router.replace`, not `push` — pushing on every
debounced keystroke would bury the page you arrived from under a dozen entries,
so "back" would mean "delete one letter". The default order is the *absence* of
`?sort=`; `?sort=recent` on every URL is noise.

Unlike `useHistorySearch`, one watcher covers both parameters: two watchers each
calling `router.replace` would race and drop each other's value.

## Failure modes

- **A clip deleted after it was liked** drops out: the read is an `innerJoin` on
  `clips`. It never renders a card with a broken thumbnail.
- **`POST` with an unknown clip id** is a 404, not a 500 — the id is checked
  before the insert, so a bad request doesn't surface as a foreign-key
  violation.
- **`?sort=` with an unknown value** is a 400 rather than a silent fallback that
  quietly ignores what was asked for.
- **Signed out**, the read answers an empty page and the page renders a sign-in
  state; the writes use `requireUser` and 401, because there is nowhere to put a
  like without an account.
- **Offset paging** means a like added while you're on page 3 can shift a row
  across the boundary. Same trade-off `/history` takes, for the same reason: a
  keyset cursor over `(created_at, id)` is the fix if it ever matters.

## Related

- [watch-page.md](./watch-page.md) — where likes are written, and the reaction
  summary the button reads.
- [watch-later.md](./watch-later.md) — the neighbouring library surface, and why
  *that* one needed its own table when this one didn't.
- [history.md](./history.md) — the other searchable library page, and where the
  search box's shape came from.
