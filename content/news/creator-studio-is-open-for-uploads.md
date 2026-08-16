---
title: Creator Studio is open for uploads
description: Upload a video, give it a thumbnail, keep it private until you're ready. Streamify now knows whose video a video is.
date: 2026-08-14
category: creators
tags:
  - studio
  - uploads
  - creators
author:
  name: Creator Experience
  role: Creators
---

Creator Studio has a publish flow. You can upload a video or a track, set a
title, description and category, pick a thumbnail, choose who can see it, and
publish — or not publish, and come back to it.

It lives at `/studio`, beside the app rather than inside it, with its own
sidebar and its own set of pages: your content, your analytics, your comments.

## Private, unlisted, public

Every upload has a visibility, and it starts private.

- **Private** — only you can see it, including on your own channel page.
- **Unlisted** — anyone with the link can watch, but it stays out of browse,
  search and your channel's grid.
- **Public** — it's in the catalogue like anything else.

You can move a video between all three after publishing. Nothing is one-way,
and nothing is deleted by changing its visibility.

## The part that had to change underneath

The catalogue had no idea who owned anything. Videos carried a creator name as
plain text — a label, not an account — and every row was visible to every
browse surface unconditionally. Neither of those is compatible with a studio.

So uploads became ordinary catalogue rows with two new things attached: an
owner, which is a real link to your account, and a visibility.

We considered a separate drafts table that graduated into the catalogue on
publish. It's a tidy diagram and it would have been wrong. Comments key on the
video. So do reactions, watch progress, Watch later, playlists, and the watch
page's own URL resolution. A second table means either duplicating all of that
or migrating a row between two shapes on every publish — and the moment you
edit something you've already published, both shapes have to agree anyway. A
studio upload *is* a video. It gets to be one from the start.

::callout{type="note" title="Older videos have no owner"}
Everything that was in the catalogue before this change has no account behind
it, and that's permanent rather than a gap waiting to be filled. The studio
lists and authorizes strictly by owner — never by matching your display name
against the creator label — so renaming yourself can't hand you someone else's
back catalogue.
::

## What's not here yet

There's no scheduling, no editing of the video file after upload (you can edit
everything around it), and no bulk actions. Analytics in the studio cover your
own content only.
