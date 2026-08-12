# Watch later (`/watch-later`)

The queue that answers "I want this, just not now". Until this was built,
`/watch-later` was a `ComingSoon` placeholder that the sidebar linked to, and
there was no way to save a video for later at all — only the browser-local
watchlist, which is a different thing (see below).

## What it is

A flat, account-bound list of clips, newest save first:

- **`GET /api/watch-later`** — the queue. `?limit=` lets the home rail ask for
  ten while the page asks for a screenful; signed out it answers `[]`.
- **`POST /api/watch-later`** `{ clipId }` — save. Idempotent.
- **`DELETE /api/watch-later/[clipId]`** — unsave. Idempotent.

Two surfaces read it: the **Watch later shelf** on the home page (ten cards,
"See all" → the page) and **`/watch-later`** itself (a grid, up to sixty). One
surface writes it: **Save to Watch later** in any clip's ⋮ menu, with an Undo on
the confirmation toast.

## Why its own table, not a playlist and not the watchlist

Three things that look alike coexist here on purpose — the same three YouTube
has, for the same reasons:

|                   | Bound to    | Ordered  | Shareable | Works signed out |
| ----------------- | ----------- | -------- | --------- | ---------------- |
| `stores/watchlist`| the browser | no       | no        | **yes**          |
| `watch_later`     | the account | by save  | no        | no               |
| `playlists`       | the account | manually | yes       | no               |

- The **watchlist** (localStorage, `/watchlist`) can't back this: a queue you
  can't reach from your phone isn't a queue. It stays because it's the only
  save a signed-out visitor can make.
- **Playlists** can't back it either. Modelling Watch later as a magic row in
  `playlists` means every playlist query grows an "…except the special one"
  clause and every rename/delete path has to refuse it.

So: its own two-column table, `unique(user_id, clip_id)`, indexed
`(user_id, added_at)`. No `position` — the only order it has is when you saved,
so there is nothing to renumber and a save is one insert with no read first.

**Clips only**, with a real foreign key, matching `watch_progress`: a live
session is over by the time "later" arrives. A stream's VOD is a clip and can be
saved; the stream itself can't, which is why the menu item only appears on
clips.

## Idempotency, and what it buys

Both writes are no-ops when repeated:

- `POST` uses `onConflictDoNothing` on the unique index, so the menu can fire
  without checking membership first — and re-saving keeps the **original**
  `added_at` rather than jumping an old item to the front of the queue.
- `DELETE` doesn't care whether the row existed. Both surfaces remove the card
  optimistically, so a double press must not surface an error for the outcome
  already on screen.

The reads answer `[]` signed out rather than 401 (matching `/api/home/continue`,
`/api/history`, `/api/playlists`); the writes use `requireUser` and 401, because
there is genuinely nowhere to put a save without an account, and a 200 for a
write that stored nothing would be a lie.

## Cache shape

Everything lives under the `['watch-later']` prefix, with the limit in the key:

- `['watch-later', 'list', 10]` — the home rail
- `['watch-later', 'list', 60]` — the page

Saving invalidates the whole prefix; removing patches every cached list
optimistically, so a card removed on the rail is already gone when you walk to
the page. `staleTime: 0` throughout — saving a video and coming back to a shelf
that doesn't show it reads as a dropped save.

## Failure modes

- **A clip deleted after it was saved** drops out of the queue: the read is an
  `innerJoin` on `clips`, and the FK cascades anyway. It never renders a row
  with a broken thumbnail.
- **`POST` with an unknown clip id** is a 404, not a 500 — the id is checked
  before the insert, so a bad request doesn't surface as a foreign-key
  violation.
- **Signed out**, the menu item shows a toast rather than failing at the
  endpoint; the rail and page render their sign-in states.
- **Sixty saves is the ceiling** on one response. The page doesn't page, on the
  theory that a queue you scroll through in pages has become a backlog. If that
  bites, add paging to the page — don't raise the number.

## Related

- [history.md](./history.md) — the shelf directly below this one on the home
  page, and why "recently watched" and "continue watching" are different
  questions over one table.
- ADR-023 in [DECISIONS.md](./DECISIONS.md) — the table-vs-playlist decision
  and what was rejected.
