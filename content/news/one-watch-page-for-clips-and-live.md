---
title: One watch page for clips and live
description: Clips and live channels used to open in two different places. Now they share a single page, a single player, and a single URL shape.
date: 2026-08-07
category: product
tags:
  - watch
  - live
  - chat
author:
  name: Streamify Product
  role: Product
---

Until this week, watching something on Streamify meant landing in one of two
places depending on what you clicked. A clip opened a modal over the grid you
came from. A live channel opened a page of its own. They had different
controls, different layouts, and different ideas about what "share this" should
put on your clipboard.

Both are gone. Everything now opens at `/watch/<slug>`.

## One URL, two kinds of thing

The slug resolves against clip IDs first, then against channel names — so
`/watch/clip-rendering` and `/watch/nordlichter` both work, and neither needs
the URL to announce which one it is. That matters more than it sounds: a link
you paste into a chat should not stop working because the thing behind it went
from a live session to the clip somebody cut out of it.

The old `/live/<username>` addresses still resolve. They redirect, so links
shared before this change keep working.

## What's on the page

The player sits at the top, with the title, view count and publish date under
it, then the channel bar: avatar, name, follower count, and a Follow button
that writes to your account rather than to this browser. Below that, the
actions you'd expect — like, dislike, share, save — and a description that
stays collapsed until you ask for it.

Underneath, the page splits by what you're watching:

- **A clip** gets comments. You can post, reply one level deep, like, and
  delete your own.
- **A live channel** gets chat, which persists — messages are still there when
  you come back, rather than vanishing with the tab.

To the right, an up-next rail pulls from the same category you're watching. On
anything narrower than a laptop it stacks underneath the video instead of
squeezing the player.

::callout{type="note" title="Chat isn't realtime yet"}
Live chat is real — messages are written to the database and read back by
everyone in the room — but the page currently polls for new ones every five
seconds while the tab is visible. The websocket transport is Phase 8 work. When
it lands, nothing about the chat UI changes; only how a message gets to you.
::

## What it cost

Four new tables — comments, chat messages, reactions and follows — and nine
endpoints behind them. Every write goes through the same session check, and
ownership is re-verified on the server before a delete happens rather than
trusting the button that was clicked.

Two components were deleted outright: the clip player modal and the standalone
live channel view. Every place that used to open them now navigates instead.
That's the part we're happiest about — this is a page that replaced two
surfaces rather than a third one added beside them.

## Known gaps

We'd rather name these than let you find them:

- Up-next is category-based. It is not a recommender, and it does not know
  what you've already watched.
- Live viewer counts are static until the streaming pipeline lands in Phase 7.
- Following is keyed on the channel handle, because channels aren't their own
  table yet.
