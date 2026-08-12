# Streamify

A Twitch + YouTube-style streaming platform built on Nuxt 4. See
[docs/PROGRESS.md](./docs/PROGRESS.md) for where the project stands and
[docs/DECISIONS.md](./docs/DECISIONS.md) for the architecture decisions.

## Setup

This repo uses **pnpm** (10 or newer — `brew install pnpm`, or
`corepack enable pnpm`). Other package managers are not supported: only
`pnpm-lock.yaml` is committed.

```bash
pnpm install
```

See [ADR-025](./docs/DECISIONS.md) for why, and `docs/PROGRESS.md` for the
migration's remaining steps — the lockfile swap itself hasn't been run yet.

## Development Server

Start the development server on `http://localhost:3000`:

```bash
pnpm dev
```

## Production

Build the application for production:

```bash
pnpm build
```

Locally preview production build:

```bash
pnpm preview
```

## Everything else

```bash
pnpm lint          # eslint
pnpm typecheck     # nuxt typecheck
pnpm test          # vitest
pnpm test:e2e      # playwright
pnpm db:migrate    # apply drizzle migrations
pnpm db:seed       # (re-)seed dev data
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
