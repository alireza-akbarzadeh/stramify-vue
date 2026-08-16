---
title: Where your uploads actually live
description: The plan says Cloudflare R2. The plan is unfunded. So uploads write to disk behind a seam narrow enough to swap in an afternoon.
date: 2026-08-14
category: engineering
tags:
  - storage
  - uploads
  - infrastructure
author:
  name: Streamify Engineering
  role: Engineering
---

The architecture for this platform has named Cloudflare R2 as the object store
and Cloudflare Stream as the video pipeline since the first week. The config
has carried credentials for both ever since.

Neither is configured. Both are paid. And Stream doesn't accept audio at all,
which the studio needs — a track uploaded there is what puts a row on `/music`.

That left a real choice to make, because an uploader that only works once
somebody has bought a bucket is an uploader nobody can run, and a publish
button that doesn't publish is worse than no publish button.

## The seam

One module knows where bytes live. It writes files under a configurable
directory, hands back a key and a URL, and that's the entire surface. Nothing
else in the codebase — not the upload endpoint, not the database, not any
player — knows whether that directory is a disk, a bucket, or a mount.

Swapping to R2 is two functions becoming S3 calls and the returned URL becoming
a bucket URL. Everything above the seam is untouched.

## This is a real store, not a stub

Worth being precise about, because "we'll wire up storage later" usually means
something that only looks like it works:

- The bytes survive a restart. They're files.
- The file extension comes from a MIME allowlist, not from the uploaded
  filename — a browser will happily send you `payload.mp4` containing anything
  at all.
- Playback is genuine playback, from the file you uploaded, through the same
  player the rest of the app uses.

## Byte ranges are why the media route is handwritten

Serving the upload directory as a static mount would have been one line. It
would also have broken seeking.

A video element seeks by asking for a byte range — "give me from 4.2 MB
onward" — and a server that answers with the whole file from the start turns
the scrubber into a decoration. So the media route handles range requests
itself: it parses the requested range, answers with the partial-content status
and the matching headers, and streams only that slice.

::callout{type="note" title="If you're running this locally"}
Uploads land in a gitignored directory under the project root by default, and
the path is configurable through an environment variable. Nothing you upload in
development leaves your machine.
::
