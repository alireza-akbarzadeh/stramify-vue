---
title: The app is now four layers
description: Three hundred components in one namespace stopped answering "where does this file go". Nuxt layers answered it — and two silent traps nearly shipped with them.
date: 2026-08-15
category: engineering
tags:
  - architecture
  - nuxt
author:
  name: Streamify Engineering
  role: Engineering
---

Nothing was broken. That's the honest starting point. The app had grown to
fifty-odd pages and roughly three hundred components across twenty-two domain
folders, all in one flat namespace, and every one of them worked.

What had stopped working was the question *where does this file go*.

## Four layers, not eight

Nuxt layers are the framework's own answer to this, and the first list we drew
had eight of them — marketing, auth, studio, dashboard, watch, shorts, library,
discovery. We shipped four: **marketing, auth, dashboard, studio**.

The three that became real layers share something the others don't. They're
bounded workspaces you deliberately enter, each with its own shell and its own
reason to exist. The studio has its own sidebar. The dashboard has its own
layout. Auth is the whole signed-out surface. Nothing outside them uses their
components — verified by looking, not assumed.

Everything viewer-facing stayed put: the home feed, watch, shorts, discovery,
channels, following, history, playlists, Watch later, liked, music, search.
That isn't the leftovers. It's the main application.

Those domains interleave constantly — the watch page's up-next rail *is*
discovery's ranking, the home feed scores clips, live sessions and shorts in
one query, and the live badge alone renders on six different surfaces.
Splitting them wouldn't have produced independent layers. It would have
produced a cycle, which is the exact failure mode layering exists to prevent.

A layer boundary is only worth drawing where a seam already exists.

## Two traps, both silent

::callout{type="warning" title="Component names change when a folder becomes a layer"}
The root project registers components without their folder as a prefix. That
setting does not carry into a layer. Moving a folder in silently re-registered
every component in it under a prefixed name, so every template that used them
would have failed at render — not at build. Each layer now sets the option
itself, and the generated component manifest was read to confirm it, rather
than trusted.
::

The second one was worse, because it had a blast radius of nineteen files.

Server routes at the project root import their utilities by relative path.
Moved into a layer, that relative path resolves to a directory that doesn't
exist — and nothing in the build says so, because the server resolves imports
when a request arrives, not when the app is built. Nineteen endpoints would
have returned a 500 on their first call in production. They now use a
root-anchored alias instead.

## What stayed at the root, and why

The session store, the auth client and the route middleware all look like auth
code. They stayed at the root, because the store has forty-six import sites and
the middleware guards pages in every domain. Moving them would have made every
protected page in the app depend on the auth layer.

Only the sign-in *surface* is a layer. The session primitives are
infrastructure.
