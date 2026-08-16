---
title: "What's next: live streaming and realtime chat"
description: Two things the app currently fakes the shape of without faking the behaviour — and what has to be true before either ships.
date: 2026-08-16
category: roadmap
featured: true
tags:
  - roadmap
  - live
  - chat
author:
  name: Streamify Product
  role: Product
---

::callout{type="warning" title="Nothing on this page has shipped"}
This is a roadmap post. Everything below describes work that is planned, not
work you can use today. If it's described in the present tense elsewhere in the
newsroom, it exists; if it's here, it doesn't yet.
::

Two capabilities are named all over this product and neither is finished. We'd
rather write down exactly where they stand than let the gap be something you
discover.

## Going live

`/stream` exists. The live directory at `/live` is real — those channels are
rows in a database, with genuine video playing from real sources. What doesn't
exist is the part where *you* go live: no ingest endpoint, no stream key, no
transcode, no viewer count that moves.

That's Phase 7, and it depends on a decision that's already been made and not
yet paid for. The video pipeline is Cloudflare Stream, which is a managed
service — and until it's configured, "go live" would mean an ingest URL that
accepts nothing.

What ships when it does:

- A stream key you can put into OBS, which is generated server-side and
  **never** rendered into a page you could screenshot.
- Live viewer counts that actually count.
- Sessions that end up as clips, so a stream you did is a video someone can
  find a week later.

## Realtime chat

Chat is the more interesting one, because it's already real — just not
realtime. Messages you send are written to the database and read back by
everyone in the room, and they're still there tomorrow. What the page currently
does is ask the server for new messages every five seconds while the tab is
visible.

That's an honest interval, not a simulation. Nothing pretends a message
arrived; it just arrives up to five seconds late.

Phase 8 replaces the polling with a websocket connection and a pub/sub channel
between server instances, so a message is pushed the moment it's written. The
important detail: **the chat interface doesn't change**. The component, the
message list, the composer and the moderation controls all stay exactly as they
are. Only the transport underneath them is different — which is the whole
reason it was built this way round.

## Why in this order

Chat is a smaller change with a bigger daily effect, and it has no dependency
on a vendor. Streaming is the larger piece and needs the video pipeline funded
and configured before a single line of it can be verified against anything
real.

Neither one gets a UI that pretends to work in the meantime.
