# Claude Code project bootstrap template

This is the doc/instruction scaffold that made Streamify's Claude Code
sessions stay coherent across many concurrent/serial sessions — extracted
and stripped of anything streaming-specific so it can seed a brand new
project.

## How to use this

1. Copy this whole folder's contents into the root of the new repo:
   - `CLAUDE.md` → repo root
   - `docs/PRODUCT_SPEC.md`, `docs/DECISIONS.md`, `docs/PROGRESS.md`,
     `docs/ARCHITECTURE.md` → the new repo's `docs/`
2. Fill in `docs/PRODUCT_SPEC.md` with the actual product/process spec for
   the new project (what it is, scope, phases). Once filled in, treat it as
   immutable — same rule as Streamify's `PROMPT.md`.
3. Edit the `## What this project is` and `## Current stack` sections of
   `CLAUDE.md` — everything else (working rules, docs discipline, concurrent
   -session handling) is intentionally project-agnostic and can stay as-is.
4. Delete the placeholder bullet points in `docs/DECISIONS.md` /
   `docs/PROGRESS.md` and start real entries once work begins.
5. Open Claude Code in the new repo — it reads `CLAUDE.md` automatically,
   which points it at `docs/PROGRESS.md` first.

## Why this structure (what problem it solves)

Streamify ran many Claude Code sessions back-to-back — and sometimes
concurrently — over weeks. Two failure modes showed up repeatedly and this
structure exists specifically to prevent them:

- **Context loss between sessions.** A session would start with no idea what
  the previous one built, half-rebuild it, or contradict an earlier decision.
  Fixed by making `docs/PROGRESS.md` the mandatory first read, and requiring
  it to be updated before a session ends.
- **Concurrent sessions stepping on each other.** Two windows open on the
  same repo would both edit the same doc or file around the same time.
  Fixed by the "Concurrent sessions" working rule (#9) — check timestamps
  before overwriting, reconcile rather than silently clobber, and leave a
  note in `PROGRESS.md` when it happens (see the real examples still in
  Streamify's `docs/PROGRESS.md` if you want to see what that looks like in
  practice).

Everything else (ADR log, docs-per-subsystem, definition-of-done) exists so
that decisions and system behavior are discoverable from the repo itself
instead of living only in chat history.
