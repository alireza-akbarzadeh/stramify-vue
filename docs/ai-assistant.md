# AI assistant (watch page)

The assistant on `/watch/[slug]`: a panel that says what a video looks like
from its listing, answers questions about it, and re-ranks the up-next
catalogue with a reason per row. Backed by the Gemini API on a free-tier model
by default. See [ADR-029](./DECISIONS.md) for the decisions behind it.

## The one thing to know first

**The model does not watch the video.** Gemini's video understanding needs a
file uploaded through the Files API or a YouTube URL; this app's sources are
arbitrary mp4/HLS URLs on R2 and elsewhere. So every answer is grounded in the
*catalogue metadata* — title, channel, category, description, duration, view
count, uptime — plus the real rows around it.

That is not a caveat bolted on afterwards, it is enforced in three places:

1. `GROUNDING_RULE` in `server/utils/watch-ai.ts` tells the model it has not
   seen the video and must say so rather than invent a timestamp or a visual.
2. `WatchInsights.basis` records whether there was a description at all, and
   `WatchAiInsights.vue` changes its wording accordingly — "written from the
   channel's description" vs "no description, so this is from the title alone".
3. Recommendations can only name videos that exist — see *Grounding* below.

Pretending otherwise would be exactly the fake functionality CLAUDE.md §2 and
PROMPT.md §21 rule out. If real video understanding is wanted later, the honest
route is uploading through the Files API when Cloudflare Stream lands in Phase
6/7, and it changes the prompts, not the shape of any of this.

## Configuration

Two environment variables, both server-side only:

```bash
# Required. Without it the feature is off — not broken, off.
GEMINI_API_KEY=your-key-from-aistudio.google.com

# Optional. Defaults to gemini-2.5-flash (free tier).
GEMINI_MODEL=gemini-2.5-pro
```

**On the default model.** It is `gemini-2.5-flash`, not the newer
`gemini-3.5-flash`. Both are free on the standard tier, but 3.5-flash returned
Google's *"This model is currently experiencing high demand"* 503 on every call
while this was being built — the newest flash model shares free capacity with
everyone who wants to try it, and a default that is usually busy is not a
default. 2.5-flash is a generation older, amply provisioned, and more than
enough to summarise a paragraph of metadata. Switch with `GEMINI_MODEL` in
either direction when that changes.

They land in `runtimeConfig.gemini` (`nuxt.config.ts`), which sits **outside**
`public`, so the key is never in the client bundle. The browser only ever talks
to our own routes.

**Moving to a paid model is the env var and nothing else.** `modelTier()` in
`server/utils/gemini.ts` classifies the id against a list of known free-tier
models and calls anything unrecognised `pro` — guessing "free" wrongly costs
money, guessing "pro" wrongly mislabels a badge. The panel shows that tier as a
chip, with the model id in its `title`.

`GET /api/ai/config` reports `{ enabled, model, tier }` at runtime. It is a
route rather than a `runtimeConfig.public` value because `public` is baked at
build time: an image built without a key and deployed with one would otherwise
ship a panel permanently switched off.

With no key set, `WatchAiPanel` renders nothing at all in production, and a
one-line "set `GEMINI_API_KEY`" hint in dev — the person who can act on it is
the only one who sees it.

## What's on the page

| Piece | Component | Endpoint |
| --- | --- | --- |
| "Ask AI" trigger + side sheet | `watch/ai/WatchAiSheet.vue` | `GET /api/ai/config` |
| Summary, topics, opening questions | `watch/ai/WatchAiInsights.vue` | `GET /api/watch/[slug]/ai/insights` |
| Conversation and composer | `watch/ai/WatchAiAsk.vue` | `POST /api/watch/[slug]/ai/ask` |
| "Because you're watching this" | `watch/ai/WatchAiPicks.vue` | `GET /api/watch/[slug]/ai/picks` |

The assistant is a **sheet behind a trigger** in the actions row, next to Share
and Save; the picks list sits in the sidebar directly above "Up next".

It was first built as a permanent third column in `WatchLayout` above 1920px,
and that was wrong twice over: it sat visibly empty on any deployment without a
key, and it spent width the page would rather give the video. Asking about a
video is something you reach for, not something you read alongside. The layout
kept its two columns and simply got wider caps (`WatchView`), which fills a 4K
screen without inventing a column to fill it with.

The sheet's content is unmounted while closed, which is what stops the insights
request — the one Gemini call this page would otherwise make unprompted — from
firing on page load. Nobody spends quota by opening a watch page.

Every piece fetches its own data rather than taking props, the same way
`WatchPlaylistQueue` and `WatchSaveToPlaylist` do — nothing else on the page
reads a conversation.

The playhead reaches the panel as a **getter**, not a prop. Vidstack fires
`time-update` several times a second and the value is read once, when someone
presses send; a reactive prop would re-render the conversation continuously to
carry a number nobody is looking at.

## Grounding: how "more like this" stays real

`/ai/picks` never asks the model to name videos. It:

1. queries the catalogue for up to 24 real candidates (`selectRelated`, the
   same query the up-next rail uses),
2. hands the model that list and asks it to pick six **by id**, with a reason,
3. runs `groundPicks()`, which joins the chosen ids back to the rows, drops
   anything not in the candidate set, drops duplicates and caps the list.

So the model's only contributions are the order and the sentence. A
hallucinated id matches nothing and disappears; if none survive, the endpoint
returns `[]` and the section hides itself, leaving the ordinary rail underneath.
`server/utils/watch-ai.spec.ts` covers each of those cases.

`/ai/ask` is grounded the same way for anything it suggests: the prompt carries
the ten nearest real rows and says the model may not name anything else.

## Caching and quota

The free tier is metered per minute and per day, so both cacheable routes are
cached with Nitro's `defineCachedFunction`, keyed by `model:slug` (the model is
in the key so switching `GEMINI_MODEL` doesn't serve answers from the old one):

- **insights** — 6 hours. Its inputs change roughly never.
- **picks** — 2 hours, and *only the `{ id, reason }` choice is cached*, never
  the rendered rows. Candidates are re-queried per request and re-joined, so a
  clip pulled from the catalogue vanishes from the panel immediately instead of
  sitting in a cache as a card that 404s when clicked.

`ask` is not cached — every question is different.

On top of that, `server/utils/rate-limit.ts` applies a sliding window per user
(or per client IP when signed out):

| Route | Limit |
| --- | --- |
| `ask` | 20 / 10 min |
| `insights`, `picks` | 40 / 10 min |

**The limiter is in memory, per instance, deliberately.** Redis is in the stack
(ADR-003) but has no client wired up yet, and an approximate limiter that costs
nothing today is what actually stands between us and a blown quota. When Redis
lands in Phase 8 this becomes `ZADD` + `ZCOUNT` behind the same `check()`
signature. It is not an oversight.

## Authorization

- `insights` and `picks` are readable signed out. They say nothing a visitor
  can't already read off the page, they're cached, and gating them would make
  the panel dead weight for exactly the people deciding whether to sign up.
- `ask` requires sign-in (`requireUser`), matching comments, chat and reactions
  on the same page. Each question is an uncacheable metered call, so an
  anonymous route would be a public quota drain. The composer's logged-out
  state is a courtesy; the server check is the control (CLAUDE.md §5).

## Prompt injection

Video titles, descriptions and candidate rows are **user-supplied content**
being pasted into a prompt. Channel-authored text can say whatever it likes,
including "ignore your instructions". Mitigations, all in `watch-ai.ts`:

- the system instruction states that metadata and catalogue lists are data, not
  instructions, and to ignore anything in them that says otherwise;
- recommendations are id-based and re-joined server-side, so the worst a
  malicious description can achieve in that path is a bad ranking;
- answers are plain text rendered as text — no markdown, no HTML, no links
  built from model output.

The residual risk is a model persuaded to write something odd in an answer
bubble. That is contained: nothing the model returns is executed, stored, or
used to build a request.

## Failure modes

| Symptom | Cause | Where |
| --- | --- | --- |
| No "Ask AI" button | No `GEMINI_API_KEY` | `WatchAiSheet` `v-if="enabled"` |
| 503 "not configured" | Key missing but a route was called directly | `requireGemini` |
| 503 "model is busy" | Google's capacity error — try again, or switch `GEMINI_MODEL` | `toGeminiError` |
| 429 "over its quota" | Gemini's own rate limit | `toGeminiError` |
| 429 "too many AI requests" | Our limiter | `enforceRateLimit`, `Retry-After` set |
| 504 "took too long" | 20s timeout | `REQUEST_TIMEOUT_MS` |
| 502 "unexpected shape" | Model ignored `responseSchema` | `generateJson` Zod check |
| 422 "blocked by safety filters" | `promptFeedback.blockReason` | `generate` |
| 502 "unavailable" | Anything else — **read the log** | `toGeminiError` |

**Debugging a 502.** The viewer-facing messages are deliberately vague, so
`toGeminiError` logs the real upstream cause at `error` level, and in dev also
attaches it to the response as `data.upstream` (visible in the network tab).
Google puts the cause in `data.error.message` — "models/x is not found", "API
key not valid". If the body isn't Google's JSON at all the raw text is logged
instead, truncated: a `<!DOCTYPE html>` there means something between this
server and Google (a corporate proxy, a sandboxed egress) returned its own
block page, and the key and model are not the problem.

Insights failing does **not** take the ask box down — losing the summary is no
reason to remove the thing the panel is named after. A failed question is put
back in the composer so retrying is one keypress.

## Testing

`server/utils/watch-ai.spec.ts` and `server/utils/rate-limit.spec.ts` cover the
pure parts — grounding, prompt construction, history trimming, window
arithmetic — with no API key and no network. The transport (`gemini.ts`) is
deliberately thin enough to not need its own mock suite; it is one `$fetch` and
an error map.
