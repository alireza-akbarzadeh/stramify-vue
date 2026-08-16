---
title: One bookmark, one destination
description: Saving a video used to have two controls, two menus and two destinations — one of which had no page in the nav. Now there's one bookmark and it always means Watch later.
date: 2026-08-12
category: product
tags:
  - library
  - watch-later
author:
  name: Streamify Product
  role: Product
---

Here's a bug report we could reproduce every single time:

> Bookmark a video. Open Watch later from the sidebar. It's empty.

Nothing had failed. Nothing had thrown. The bookmark had saved your video
perfectly — to a list whose only page wasn't linked from anywhere in the
product.

## How it got that way

Watch later shipped as a real, account-bound queue with its own table. But the
app already had an older list that lived in browser storage, and every existing
save control still pointed at it: the bookmark on every card, Save on the
shorts rail, Save under the player. The new queue was reachable through exactly
one menu entry, on two surfaces.

Worse, the overflow menu ended up carrying both — "Save to watchlist" and
"Save to Watch later", one line apart. That is not a distinction anyone should
be asked to hold in their head, and the wrong one was the obvious one.

## What changed

There's now a single bookmark, and it routes by what you're saving:

- **A clip or a short** goes to **Watch later** — account-bound, on every
  device you sign in on, and rendered by the page the sidebar actually links.
- **A live channel** stays in local browser storage, because a live session
  isn't a video you come back to later; it's a channel you want to keep an eye
  on. Following it is the account-bound version of that, and that's a different
  button.

Every save control in the app — the card bookmark, the shorts rail, the player,
the overflow menu — now goes through one place in the code. The duplicate menu
entry is gone.

::callout{type="warning" title="If you saved things before this change"}
Anything you bookmarked previously went to browser storage on that device. It's
still there, but it doesn't move into Watch later on its own — clips saved
before this change won't appear in the account-bound queue until you bookmark
them again.
::

## The rule we took from it

If a product offers two ways to do one thing, one of them is going to be
somebody's bug report. The fix wasn't a better label on the second control; it
was not having a second control.
