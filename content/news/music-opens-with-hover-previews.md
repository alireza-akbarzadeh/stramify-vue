---
title: Music opens, and it previews on hover
description: A wall of thumbnails is a grid of links. Hover one and it plays a few seconds — which is the difference between a directory and a library.
date: 2026-08-11
category: product
tags:
  - music
  - discovery
author:
  name: Streamify Product
  role: Product
---

`/music` used to be a "coming soon" card. It's now a browse page: one hero
track at the top, four shelves under it, and a preview that starts playing when
your pointer rests on a card.

## The hover preview

Hovering a card fades the thumbnail out and starts the clip, muted, from the
top. Move away and it stops. It's the affordance every music app has settled
on, and it's the whole reason the page feels like a library rather than a page
of links.

There's no streaming shim behind it — no HLS library, no adaptive ladder, no
extra runtime. It's a plain video element playing the same file the watch page
plays, with the preview capped short enough that it never becomes a second way
to watch something. Anything more would have meant shipping a media stack to
serve a hover state.

::callout{type="note" title="Reduced motion is respected"}
If your system asks for reduced motion, previews don't autoplay. The card still
tells you what it is; it just doesn't move on its own.
::

## Every shelf is derived, none are invented

The four shelves are orderings of columns that already exist: what's newest,
what's most watched, what's short enough to sample, and what comes from
channels you follow.

What you won't find is a "Chill", "Workout" or "Late night" shelf. We could
have written those headings in an afternoon and filled them by hand. They'd
have been fiction — a mood nobody tagged, curated by nobody, going stale the
moment a new track lands. A shelf on this page means something the catalogue
can actually justify.

The same rule cuts the other way: a shelf with fewer than three tracks in it is
dropped rather than shipped. At that size it's just the first shelf again with
a different title.

## Not a new content type

There is no music table. `/music` is the Music slice of the same catalogue
every other surface reads, which means a change to how a video is presented
reaches this page for free — and a track you find here opens on the same watch
page as everything else, with the same comments, the same save button, and the
same URL shape.
