# Watch history (`/history`)

The page that answers "what have I watched, and where did I stop". Until this
was built, `watch_progress` rows were written by the player and read by exactly
one surface — the home page's "Continue watching" rail — and `/history` was a
`ComingSoon` placeholder even though the sidebar linked to it.

## What it is

A reverse-chronological list of every clip the viewer has watched, grouped under
day headings ("Today", "Yesterday", then the date). Every row carries a progress
bar on its thumbnail and a line saying either `Resume · 7 min left` or
`Watched`. Clicking a partly-watched row resumes it via `?t=`; clicking a
finished one restarts it.

Above the list: a search box that filters by title or channel, and
"Clear all history" behind a confirm dialog.

## It reuses `watch_progress` — and what that implies

No new table. `watch_progress` holds **one row per user per clip**, rewritten in
place as you watch (see `server/db/schema/watch-progress.ts`). Two consequences
that are deliberate, not gaps:

- **Rewatching moves a row, it doesn't add one.** History shows the _last_ time
  you watched each video. This is what viewers already expect from a history
  list, and it's what the table can honestly support.
- **There is no "watched at 14:02 on Tuesday, and again Thursday" log.** A
  per-play event table would be a different shape and a Phase 12 analytics
  concern. Nothing in the UI claims otherwise.

Only the watch player writes progress today, so in practice history holds
landscape clips. Shorts have their own feed and no resume behaviour.

## History vs. Continue watching

Same table, different question, so different filters:

|                       | Continue watching | History                |
| --------------------- | ----------------- | ---------------------- |
| Finished clips        | excluded          | **included**, bar full |
| Barely started (<15s) | excluded          | **included**           |
| Near the end (>95%)   | excluded          | **included**           |
| Cap                   | 12, no paging     | paged, 30 per request  |

`selectContinueWatching` applies the resumable window
(`RESUME_MIN_SECONDS`, `RESUME_MAX_FRACTION`); `selectHistory` applies none of
it. "What can I resume" and "what have I watched" are different questions over
the same rows.

## Why day grouping happens in the browser

`groupHistoryByDay` runs client-side, and the API sends a raw ISO `watchedAt`
rather than a pre-formatted date — the only string on `HistoryItem` that isn't
pre-formatted server-side.

Two reasons. The day boundary belongs to the **viewer's** timezone, and the
server doesn't know it: formatting `2026-08-11T21:04` server-side would file a
clip watched at 9pm in Tehran under the wrong day for half the world. And a
day's rows can straddle a page boundary, so the server would have to know about
pagination to group correctly.

`historyDayKey` builds `YYYY-MM-DD` from the date's own parts rather than
`toISOString().slice(0, 10)`, which is UTC and would reintroduce the bug.

## Paging and search

Offset paging (`cursor` = row offset, `limit + 1` fetched to answer "is there
more" without a second count query), matching the home feed's convention. The
list is an infinite query that appends; the search term is part of the query
key, so typing starts a fresh list rather than appending matches under the
unfiltered rows.

The search term is escaped before it reaches `ilike` — `%` and `_` are
wildcards, so an unescaped `%` would match the viewer's entire history and a
literal underscore would match any character. The term is also mirrored into
`?q=`, with `replace` not `push` so typing doesn't bury the previous page under
a dozen history entries.

## Authorization

- `GET /api/history` returns an **empty page** signed out, not a 401 — matching
  `/api/home/continue` and `/api/following/channels`. "Nothing watched" is the
  honest answer for a visitor with no account, and it lets the page render a
  sign-in prompt as an empty state rather than an error.
- `DELETE /api/history` requires a session (`requireUser`). A destructive write
  with no session is a 401, not a no-op that reports success.
- Scope is always the session's own user id. Neither endpoint takes a `userId`
  parameter, so there is no way to spell a request for somebody else's history.
- Removing one row reuses `DELETE /api/watch/[slug]/progress` rather than adding
  a second endpoint — both mean "forget where I was in this clip".

Clearing history **deletes the rows**, which also empties Continue watching.
That's the expected consequence of asking to be forgotten, and the confirm
dialog says so.

## States

Loading is a skeleton mirroring `HistoryRow`'s geometry at the same breakpoints,
so the real list drops into reserved space instead of shifting the page. The
empty state has three variants — signed out, nothing watched, and search matched
nothing — because each has a different fix.

## Common failure modes

- **Empty for a signed-in viewer who has definitely watched things.** Progress
  is only written by the watch player (`useWatchProgress`), and only for
  sessions. Check `select count(*) from watch_progress where user_id = ...`.
- **A row's day heading looks off by one.** Check that `historyDayKey` is being
  used rather than an ISO slice — see the timezone note above.
- **A removed row reappears after clearing the search box.** The optimistic
  update must filter _every_ cached page of _every_ search term, which is why
  `useRemoveFromHistory` uses `setQueriesData` against the `['history']` root
  rather than editing one key.

## Files

| Path                                 | What                                         |
| ------------------------------------ | -------------------------------------------- |
| `shared/types/history.ts`            | `HistoryItem`, `HistoryPage`, page size      |
| `shared/utils/history.ts`            | Day grouping, labels, `historyHref` (+ spec) |
| `server/utils/history.ts`            | `selectHistory`, `clearHistory`              |
| `server/api/history/index.get.ts`    | Paged read, Zod-validated                    |
| `server/api/history/index.delete.ts` | Clear all, auth required                     |
| `app/composables/useHistory.ts`      | Infinite query, search, remove, clear        |
| `app/components/history/`            | View, toolbar, list, row, skeleton, empty    |
