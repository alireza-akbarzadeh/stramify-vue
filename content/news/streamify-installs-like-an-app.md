---
title: Streamify installs like an app
description: Home-screen icon, standalone window, its own theme colour in the system bar — and one Workbox setting we deliberately left off.
date: 2026-08-13
category: product
tags:
  - pwa
  - performance
author:
  name: Streamify Engineering
  role: Engineering
---

Streamify is now installable. On desktop that's an install button in the
address bar; on a phone it's "Add to home screen". Either way you get a
standalone window with no browser chrome, the app icon on your home screen, and
a status bar that follows your theme instead of being pinned to one of them.

Long-press the installed icon and you'll get shortcuts straight into Shorts,
Following, Trending and Go live.

## Updates apply on the next load

An installed app can handle a new version two ways: prompt you to reload, or
swap it in quietly the next time you open it. We chose the quiet swap.

The reasoning is specific to what this app is. A streaming site gets left open
for hours. A prompt strategy would leave someone on a build from this morning
for an entire session, and the prompt itself would arrive mid-video, which is
the worst possible moment for a dialog about software versions.

## The setting we left off, on purpose

Service workers offer a tempting option called a navigation fallback: precache
one HTML shell and answer every navigation from it, so the app opens instantly
and works offline.

We don't use it, and it's the one decision here worth explaining.

Streamify renders on the server. Turning on a navigation fallback is
all-or-nothing — *every* navigation gets answered from that one cached shell,
which quietly replaces server-rendered pages, including the ones behind your
sign-in, with a static document that knows nothing about you. Fast, and wrong.

::callout{type="note" title="What that costs you"}
Navigations go to the network. If you open the installed app with no
connection, you get the browser's offline page rather than a branded one of
ours. We'd rather ship that gap than ship pages that lie about your session.
::

## What is cached

Build assets — scripts, styles, icons, fonts — plus the two font requests the
stylesheet makes to Google Fonts, which would otherwise sit on the critical
path of every cold load. That's it. Nothing about your account, your history or
your library is stored by the service worker.
