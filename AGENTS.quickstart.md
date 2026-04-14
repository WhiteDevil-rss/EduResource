# AGENTS Quickstart

Use this if you are new to this repo and need the fastest safe path to make changes.

## 60-Second Overview

- Stack: Next.js App Router + Firebase + Tailwind + Vitest
- Main code: `src/app`, `src/components`, `src/lib`, `src/hooks`
- Deploy target: Cloudflare Pages/Workers via OpenNext
- Priority: keep changes small, secure, and role-safe

## First Commands

```bash
npm install
npm run dev
npm run lint
npm test
```

## Where To Edit

- Product and route logic: `src/app/**`
- Shared UI: `src/components/**`
- Auth/session/server helpers: `src/lib/**`
- Hooks: `src/hooks/**`

Prefer touching only files related to the requested task.

## Security Guardrails

- Never commit secrets (`.env*`, service-account JSON keys, API keys).
- Preserve session + role checks on protected routes and API handlers.
- Keep Firestore privileged operations server-side.

## Cloudflare/Firebase Runtime Notes

- This app runs on OpenNext + Cloudflare workers.
- Avoid server-side patterns that pull in heavy Firestore runtime codegen paths.
- If you change server/runtime code, run:

```bash
npm run cf:build
```

## Testing Strategy

- Baseline validation:

```bash
npm run lint
npm test
```

- Prefer API-route and non-JSX-heavy tests for reliability.
- Some `.js` React component imports can be fragile in Vitest parsing depending on setup.

## Done Criteria

Before handoff:

1. Lint and relevant tests pass for changed areas.
2. No secret material was added.
3. Auth/authorization behavior is preserved unless explicitly changed.
4. `npm run cf:build` passes if runtime/server code changed.
5. Summarize changed files and remaining risks.

## Out Of Scope (Unless Asked)

- Broad app-wide redesigns
- Unrelated dependency upgrades
- Routing/auth architecture migrations
- Changes in `firebase-functions/`
