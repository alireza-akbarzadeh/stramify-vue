---
title: The assistant that admits it hasn't watched the video
description: There's now an AI panel beside the player. It answers from the catalogue, it says so, and its recommendations are real rows rather than titles it made up.
date: 2026-08-10
category: product
tags:
  - ai
  - watch
author:
  name: Streamify Product
  role: Product
---

On a wide screen, the watch page was mostly margin. A two-column layout capped
for readability leaves a few hundred dead pixels either side on a 4K display,
and viewers had no way to ask anything about what they were watching. Those
turned out to be one problem with one answer.

There's now an assistant panel in that column.

## It tells you what it hasn't done

The panel says, up front, that it hasn't watched the video. That isn't
modesty — it's the literal truth, and it changes what you should expect from
the answers.

Understanding video content means uploading the file to a model that can
process it, and our sources are arbitrary video files from arbitrary places.
The assistant is grounded in what the catalogue actually knows: title, channel,
category, duration, and the description if there is one. When there isn't one,
the panel makes a visibly weaker claim rather than the same confident one.

An assistant that told you "at 0:23 she puts her hand on the glass" would be
inventing it. We'd rather ship one that says what it's working from.

## Recommendations are rows, not titles

This is the part we'd defend hardest.

When the panel suggests something else to watch, it does not ask a model for
video recommendations. It queries up to two dozen real candidates from the same
place the up-next rail does, hands that list over, and asks the model to pick
six **by ID** and say why.

Then every returned ID is joined back to a real row. Anything invented is
dropped. Anything duplicated is dropped. If nothing survives, you get no
recommendations rather than a plausible-looking list of videos that don't
exist.

The model contributes an ordering and a sentence. Every card underneath it came
out of the database.

::callout{type="note" title="If the panel isn't there"}
The assistant needs an API key to run, and an absent key is a supported state
rather than a broken one: the app reports the feature as off and the panel says
so plainly. It's checked at runtime, not baked in at build time, so the same
build works with or without one.
::

## Cost, in plain terms

It runs on a free-tier model by default. Moving to the paid one is a single
environment variable and nothing else — and the panel labels which tier it's
on, so you're never guessing whether you're spending money.
