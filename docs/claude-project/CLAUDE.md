# CLAUDE.md — Project Operating Guide

This file is the entry point for any Claude Code session working in this
repo. Read [docs/PROGRESS.md](./docs/PROGRESS.md) first — it says exactly
where the project stands and what to do next. This file covers durable
rules that don't change week to week.

## What this project is

<!-- TODO: one paragraph — what is being built, for whom, on what stack. -->
<!-- TODO: link the full product/process spec, e.g.
     Full product/process spec: [docs/PRODUCT_SPEC.md](./docs/PRODUCT_SPEC.md)
     (source of truth for scope — treat it as immutable once written;
     don't edit it — supersede via an ADR instead). -->

Research and decisions in response to that spec live here:

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — system design: frontend,
  backend, database, integrations, security, deployment, observability.
- [docs/DECISIONS.md](./docs/DECISIONS.md) — ADR log, one entry per
  decision with rejected alternatives. **Append new ADRs here; never
  rewrite a past one in place** — if a decision is reversed, add a new ADR
  that supersedes it and says so.
- [docs/PROGRESS.md](./docs/PROGRESS.md) — living handoff doc: phase
  status, what's built, what's next, open questions. **Update this at the
  end of every work session** — it's how the next session (or the next
  concurrent one) knows where things stand.

## Current stack

<!-- TODO: language/framework, state management, data layer, auth, infra,
     test tooling, CI. See DECISIONS.md for the "why" behind each choice. -->

## Working rules

1. **Inspect before building.** Read existing code/docs, check current
   library/API docs before using them, find the smallest safe change.
   Don't rewrite working systems without a documented reason (add an ADR
   if you do).
2. **No fake functionality.** Never hard-code fake data into a production
   code path, never leave a TODO pretending something works, never fake
   real-time/async behavior — build the real interface even if a
   dependency (e.g. a third-party integration) is stubbed during early
   scaffolding. Mock data only in clearly separated dev fixtures.
3. **Don't over-engineer.** No microservices, Kubernetes, message queues,
   GraphQL, event sourcing, or extra datastores unless an ADR justifies it.
   Default to the simplest architecture that satisfies the spec.
4. **Definition of done** for any feature: UI exists (if applicable),
   responsive, has loading/empty/error states, has real backend+DB
   integration where applicable, has validation and authorization, has
   tests, and has accessibility/performance/security considered. Partial
   = not done.
5. **Security defaults**: never expose secrets/keys to the client; never
   commit secrets (`.env.example` only); validate all input at the API
   boundary; authorization checks live server-side, not just in the UI.
6. **Git discipline**: scoped conventional commits
   (`feat(auth): ...`, `fix(player): ...`), no giant mixed commits.
7. **Docs discipline**: every significant subsystem gets a concise
   `docs/<subsystem>.md` covering what it is, why, how it works, how to
   run/modify it, and common failure modes.
8. **Don't get stuck.** Missing info → make a documented, sensible
   assumption (add an ADR or a note in PROGRESS.md) and keep moving. Only
   stop to ask the user when a choice is genuinely irreversible/high-blast
   -radius (e.g. installing untrusted third-party code, deleting data,
   picking a paid vendor).
9. **Concurrent sessions**: if you find files already modified by another
   session (unexpected recent timestamps, content you didn't write), stop
   and reconcile before overwriting — check `docs/PROGRESS.md` for a
   concurrent-session note, and ask the user rather than guessing.
10. **Modular, small units.** If a function/component/module passes ~15
    lines of actual logic, pull the excess into a separate unit rather than
    letting it grow — one clear responsibility per unit. Reuse over
    duplication: if two places need the same logic, extract it and import
    it in both, don't copy-paste. Applies to every task, not just new code.

## Process

<!-- TODO: if the project benefits from phased delivery (e.g. Research →
     Architecture → Foundation → Feature phases), list the phases here and
     note that later-phase code shouldn't be built before earlier-phase
     foundations exist. Check docs/PROGRESS.md for the current phase before
     starting work. Delete this section if the project is small enough not
     to need phases. -->
