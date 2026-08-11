# AGENTS.md — Project Operating Guide

This file is the entry point for any Codex session working in this
repo. Read [docs/PROGRESS.md](./docs/PROGRESS.md) first — it says exactly
where the project stands and what to do next. This file covers durable
rules that don't change week to week.

## What this project is

A production-grade Twitch + YouTube-style streaming platform built on
Nuxt/Vue. Full product/process spec: [docs/PROMPT.md](./docs/PROMPT.md)
(source of truth for scope — treat it as immutable; don't edit it).

Research and decisions in response to that spec:

- [docs/ARCHITECTURE_RESEARCH.md](./docs/ARCHITECTURE_RESEARCH.md) — Phase 0
  ecosystem research (framework, DB, auth, video infra, etc.)
- [docs/DECISIONS.md](./docs/DECISIONS.md) — ADR log, one entry per
  decision with rejected alternatives. **Append new ADRs here; never
  rewrite a past one in place** — if a decision is reversed, add a new ADR
  that supersedes it and says so (see ADR-009 for the pattern).
- [docs/PROGRESS.md](./docs/PROGRESS.md) — living handoff doc: phase
  status, what's built, what's next, open questions. **Update this at the
  end of every work session** — it's how the next session (or the next
  concurrent one) knows where things stand.

## Current stack (see DECISIONS.md for the "why")

Nuxt 4 + Vue 3.5 + TypeScript · Tailwind CSS v4 + shadcn-vue · Pinia
(client state only) + TanStack Query (server state) · Zod · Nitro server
routes (modular monolith) · PostgreSQL + Drizzle ORM · better-auth ·
Nitro WebSockets (crossws) + Redis pub/sub · Cloudflare Stream (video) +
Cloudflare R2 (object storage) · Postgres full-text search · pino + Sentry
· Vitest + Playwright · GitHub Actions.

## Working rules (from docs/PROMPT.md §20–29 — condensed)

1. **Inspect before building.** Read existing code/docs, search official
   docs for current APIs, find the smallest safe change. Don't rewrite
   working systems without a documented reason (add an ADR if you do).
2. **No fake functionality.** Never hard-code fake data into a production
   code path, never leave a TODO pretending something works, never fake
   realtime/streaming behavior — build the real interface even if a
   dependency (e.g. a provider integration) is stubbed during early
   scaffolding. Mock data only in clearly separated dev fixtures.
3. **Don't over-engineer.** No microservices, Kubernetes, Kafka, GraphQL,
   event sourcing, or extra databases unless an ADR justifies it. Modular
   monolith + managed video infra, per ADR-003/ADR-010.
4. **Definition of done** for any feature: UI exists, responsive, has
   loading/empty/error states, has real backend+DB integration where
   applicable, has validation and authorization, has tests, and has
   accessibility/performance/security considered. Partial = not done.
5. **Security defaults**: never expose stream keys/secrets to the browser;
   never commit secrets (`.env.example` only); validate all input with Zod
   at the API boundary; RBAC checks live server-side, not just in the UI.
6. **Git discipline**: scoped conventional commits
   (`feat(auth): ...`, `fix(player): ...`), no giant mixed commits.
7. **Docs discipline**: every significant subsystem gets a concise
   `docs/<subsystem>.md` (auth, video-streaming, live-chat, database,
   deployment, security, testing) covering what it is, why, how it works,
   how to run/modify it, common failure modes.
8. **Don't get stuck.** Missing info → make a documented, sensible
   assumption (add an ADR or a note in PROGRESS.md) and keep moving. Only
   stop to ask the user when a choice is genuinely irreversible/high-blast
   -radius (e.g. installing untrusted third-party code, deleting data,
   picking a paid vendor).
9. **Concurrent sessions**: if you find files already modified by another
   session (unexpected recent timestamps, content you didn't write), stop
   and reconcile before overwriting — see docs/PROGRESS.md's "Concurrent
   session note" if present, and ask the user rather than guessing.
10. **Modular, small units.** If a function, composable, or `<script setup>`
    block passes ~15 lines of actual logic, pull the excess into a separate
    function/component/composable rather than letting it grow — one clear
    responsibility per unit. Reuse over duplication: if two places need the
    same piece of markup or logic, extract it into `app/components/` or
    `app/composables/` and import it in both, don't copy-paste. This applies
    to every task, not just new pages — apply it when touching existing code
    too.

## Skills installed (`.Codex/skills/`)

Installed via the `ui-ux-pro-max-cli` (see ADR-009): `ui-ux-pro-max`
(style/palette/typography/UX-guideline database, per-stack including
`vue.csv`/`nuxt-ui.csv`), `design-system` (token architecture), `brand`,
`design`, `ui-styling` (shadcn/ui + Tailwind — matches our UI decision),
`banner-design`, `slides`, `Codex-automation-recommender`. Use these for
Phase 2 (design system) and ongoing UI work instead of re-deriving palette/
type-scale decisions from scratch.

Project-authored (not from the CLI): `graphify` (codebase knowledge graph)
and `motion` — this app's animation system. `motion` documents when to use
`data-state` + `tw-animate-css` for Reka UI overlays (Dialog, DropdownMenu,
Popover, …) vs `motion-v` for content animation (scroll reveals, stagger,
gestures) — read it before adding or touching any animation/transition.

## Process (see docs/PROMPT.md §19 for full phase descriptions)

Phase 0 Research → Phase 1 Architecture → Phase 2 Design System →
Phase 3 Foundation → Phase 4 App Shell → Phase 5 Discovery → Phase 6 Video
→ Phase 7 Live Streaming → Phase 8 Live Chat → Phase 9 Creator System →
Phase 10 Social → Phase 11 Admin → Phase 12 Hardening.

Don't skip phases or jump ahead to later-phase code before earlier-phase
foundations exist (e.g. no dashboard analytics charts before the database
schema and auth are real). Check docs/PROGRESS.md for the current phase
before starting work.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use
  `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a
  scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough
  context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
