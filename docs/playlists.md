# Playlists (`/playlists`)

Named, ordered, shareable collections of clips, bound to an account. The third
of the three "save this" mechanisms in the app, and the only one with an order
the viewer chooses.

## What it is

Two tables — `playlists` and `playlist_items` — and seven endpoints:

| Endpoint                                      | Does                                        |
| --------------------------------------------- | ------------------------------------------- |
| `GET /api/playlists`                          | your playlists, most recently touched first |
| `POST /api/playlists`                         | create one                                  |
| `GET /api/playlists/[id]`                     | one playlist and its videos                 |
| `PATCH /api/playlists/[id]`                   | rename / re-describe / change visibility    |
| `DELETE /api/playlists/[id]`                  | delete it, items cascade                    |
| `POST /api/playlists/[id]/items`              | add a clip                                  |
| `PATCH /api/playlists/[id]/items/[clipId]`    | move it one slot up or down                 |
| `DELETE /api/playlists/[id]/items/[clipId]`   | remove it                                   |

Plus `GET /api/watch/[slug]/playlists`, which answers "which of my playlists
already hold this video" — the checkbox state in the save menu, keyed on the
watch slug because that's what the page has.

Three surfaces:

- **`/playlists`** — the library grid. Create, edit and delete from here.
- **`/playlists/[id]`** — one playlist: cover, metadata, Play all, Edit, and a
  numbered list the owner can reorder and prune.
- **Save to playlist** on the watch page (`WatchSaveToPlaylist`) — a checkbox
  per playlist plus "New playlist", which creates and adds in one gesture.

## Why it isn't Watch later, and isn't the watchlist

See the table in [watch-later.md](./watch-later.md#why-its-own-table-not-a-playlist-and-not-the-watchlist).
Short version: the browser-local watchlist is the only save a signed-out visitor
can make, Watch later is an account-bound queue ordered by when you saved, and
this is the one with a manual order and a shareable link. Collapsing any pair
means losing one of those three properties.

The save menu sits **beside** the bookmark button on the watch page rather than
replacing it, for that reason: the bookmark works signed out, this doesn't.

## Ordering, and why `position` is sparse

`playlist_items.position` is a sparse integer, not a dense `0..n`:

- **Appending** is `max(position) + 1` — one read, one insert, and no existing
  row is renumbered.
- **Removing** leaves a gap that nothing reads, because order is
  `order by position` and gaps don't affect that.
- **Reordering** swaps two rows' `position` values. Two updates whatever the
  list's length, where "move to index N" would rewrite every row below the move.

The row number you see on the page comes from the rendered order, **not** from
`position` — showing the stored value would count 1, 2, 4 after a removal.

Reordering is exposed as two arrows rather than drag-and-drop: arrows work from
the keyboard and on touch with no gesture layer and no drag dependency, and a
swap is exactly what the server does. The endpoint takes a **direction**, not a
target index, so a client whose list went stale (another tab removed an item)
can't move something to the wrong slot — "swap with whatever is above you" is
resolved against the rows as they actually are.

The two updates run in a transaction. There is no unique index on
`(playlist_id, position)`, so the pair can cross without an intermediate value;
the transaction is what stops a crash between the statements leaving both rows
sharing a position.

## Visibility

`private` (default) · `unlisted` · `public`.

Authorization is part of the read, not a check a caller might forget:
`selectPlaylist` returns `null` for a private playlist the viewer doesn't own,
so a private playlist and a non-existent one produce the identical 404 and the
response can't be used to probe which ids exist. The writes scope ownership in
the `where` of the statement itself — no check-then-act window, and someone
else's id simply affects no rows.

`unlisted` and `public` render identically today. The distinction is recorded
now so the column needs no migration when channel pages start listing playlists.

## Playing a playlist (`?list=`)

**Play all** links to the first clip with `?list=<playlist id>` attached. On the
watch page that turns on two things:

- **`WatchPlaylistQueue`** above "Up next" — the full list, current row marked
  with `aria-current` as well as colour, every link carrying `?list=` forward so
  the queue survives each hop.
- **Auto-advance** on the player's `ended` event, in `WatchView.onEnded`.

The queue lives in the URL, like `?t=` does for a resume point: it survives a
refresh, and someone sent the link mid-playlist lands in the playlist rather
than on one loose video. Without `?list=` the watch page behaves exactly as it
did before — nothing auto-advances off the up-next rail, which is a suggestion
rather than a queue the viewer opted into.

`useWatchPlaylist` is called by both the panel and `WatchView`; TanStack Query
keys on the playlist id, so that's one request, not two.

## Cache shape

- `['playlists']` — the library grid and the save menu's list
- `['playlist', id]` — one playlist's detail
- `['watch', slug, 'playlists']` — membership checkboxes for one video

What's optimistic and what isn't:

- **Toggling membership** is optimistic — a checkbox that waits for a round trip
  reads as broken, and both endpoints are idempotent so a rapid double-toggle
  can't strand the server somewhere the UI can't describe.
- **Reordering** is optimistic — direct manipulation, so a row that only moves
  on the response invites a second press. `onSettled` refetches, because the
  client never computes stored positions.
- **Deleting a playlist** is optimistic, but the caller confirms first
  (`PlaylistCard` uses an `AlertDialog`): it cascades and there's no undo.
- **Creating and editing** are not. The server assigns the id, the library is
  ordered by `updated_at`, and there's nothing meaningful to show early.

Editing invalidates **both** `['playlists']` and `['playlist', id]` — the grid
draws the title and the lock icon, the detail page draws all three, and
refreshing only the one the edit was launched from leaves the other stale.

## How to modify it

- **The form** (`PlaylistFormDialog`) is one component for both create and edit
  — pass `playlist` to edit, leave it out to create. Add a field there and all
  four launch points get it.
- **The edit dialog's state** lives in `usePlaylistEditor`, shared by the
  library grid and the detail page, so a page mounts one dialog rather than one
  per card.
- **Pure logic** (`movedPlaylistItems`, `playlistWatchHref`,
  `playlistCountLabel`) lives in `shared/utils/library.ts` with a spec beside
  it. Put new arithmetic or copy there rather than in a component.

## Failure modes

- **A clip deleted after it was added** drops out: the read is an `innerJoin` on
  `clips` and the FK cascades. It never renders a row with a broken thumbnail.
- **Adding a clip twice** is a no-op, not a duplicate row and not an error —
  `onConflictDoNothing` on `unique(playlist_id, clip_id)`.
- **An empty playlist** aggregates to `{null}` through the `left join`, which
  `array_remove` strips; the card draws a placeholder rather than one broken
  cover image.
- **Moving an item already at the end** returns `true` with no write. It's the
  state the caller asked for, and the arrow is disabled in the UI anyway.
- **`?list=` pointing at a private playlist you don't own**, or at a clip that
  isn't in the list, leaves `next` as `null` — the panel renders empty and
  nothing auto-advances, rather than jumping to the top of a list the viewer
  isn't in.
- **Signed out**, the library and the save menu render sign-in prompts; the
  reads answer `[]` rather than 401 (matching `/api/watch-later`,
  `/api/history`), while every write uses `requireUser`.
- **Someone else's playlist id** answers 404, never 403 — on every write.

## Related

- [watch-later.md](./watch-later.md) — the queue this is deliberately not.
- [watch-page.md](./watch-page.md) — where the save menu and the queue panel
  live.
