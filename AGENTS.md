# AGENTS.md

This file provides guidance for coding agents working in this repository.

Need a fast onboarding path? See `AGENTS.quickstart.md`.

Use this document for full-depth execution rules, architecture context, and quality gates.

## Project Snapshot

- App: EduResource Hub (role-based education resource platform)
- Framework: Next.js App Router (`src/app`)
- Runtime targets: Node (local/dev) + Cloudflare Pages/Workers via OpenNext
- Auth/DB: Firebase Auth + Firestore
- Styling/UI: Tailwind CSS + React components in `src/components`
- Tests: Vitest

## Mission and Priorities

When handling tasks in this repository, optimize in this order:

1. Correctness and security (auth, role checks, data safety)
2. Runtime compatibility (Cloudflare/OpenNext constraints)
3. Minimal, focused change sets
4. Maintainability (clear code, existing conventions)
5. Performance and developer experience

If priorities conflict, preserve security and runtime compatibility first.

## Key Commands

- Install: `npm install`
- Dev server: `npm run dev`
- Lint: `npm run lint`
- Tests (CI style): `npm test`
- Tests (watch): `npm run test:watch`
- Build (default): `npm run build`
- Cloudflare build: `npm run cf:build`
- Cloudflare preview: `npm run preview`
- Cloudflare deploy: `npm run deploy`

## Operating Workflow for Agents

1. Read task scope and identify impacted folders before editing.
2. Prefer smallest viable implementation over broad refactor.
3. Update or add tests when behavior changes.
4. Run lint and targeted tests early; run broader checks before handoff.
5. Summarize what changed, why, and any remaining risk.

For non-trivial tasks, split work into:

- Discovery: gather current behavior and constraints
- Implementation: apply minimal edits
- Verification: lint, tests, and runtime checks
- Handoff: clear summary with any caveats

## Working Rules

- Keep changes focused and minimal; avoid unrelated refactors.
- Prefer editing files under `src/` unless task explicitly targets infra/docs/scripts.
- Preserve existing code style (ES module syntax, semicolon-free style, existing patterns).
- Do not commit or expose secrets (`.env*`, service account JSON files, API keys).
- For security-sensitive routes, preserve or improve role/session checks.

Additional rules:

- Avoid broad dependency changes unless required by the task.
- Do not alter deployment or build infra files unless explicitly requested.
- Keep naming, folder organization, and public API behavior stable unless change is requested.
- Prefer server-side handling for privileged operations and sensitive business logic.

## Architecture Notes

- Primary app code lives in `src/app` (routes and API route handlers).
- Shared UI components are in `src/components`.
- Utility/auth/server helpers live in `src/lib` and hooks in `src/hooks`.
- Dashboard UI has role-specific pages under `src/app/dashboard/*`.
- Firestore client access is restricted by rules; privileged operations should run server-side.

### Route and API Structure

- App Router pages/layouts live under `src/app/**`.
- API handlers are under `src/app/api/**` using route handlers.
- Route protection should rely on trusted server-side session checks, not client-only guards.

### Component Structure

- Reusable UI and workflow components live in `src/components/**`.
- Keep components focused; avoid embedding heavy data-fetching logic in presentation components.
- Prefer composing existing components over introducing parallel variants.

### Auth and Session Boundaries

- Treat `src/lib` auth utilities as the source of truth for session and role validation.
- Any privileged data path must verify both authentication and role authorization.
- Avoid adding alternate auth paths that bypass existing checks.

## Cloudflare + Firebase Constraints

- This codebase is Cloudflare/OpenNext oriented. Prefer edge-safe dependencies and patterns.
- Avoid server-side use of Firestore full SDK paths that can trigger runtime codegen issues on Workers.
- If Firestore reads are needed in edge-sensitive code, prefer Lite/client-compatible paths where appropriate.
- Validate Cloudflare build compatibility when changing server/runtime code.

Edge compatibility notes:

- Avoid Node-only APIs in edge-sensitive code paths unless runtime support is verified.
- Keep dependencies edge-friendly and avoid packages that rely on dynamic code generation.
- When changing server handlers, confirm behavior in both local dev and Cloudflare build paths.

Known risk:

- Cloudflare Workers can fail with `EvalError: Code generation from strings disallowed` when incompatible Firestore/server bundles are introduced.

## Testing Guidance

- Start with: `npm run lint` and `npm test`.
- Add/update tests for behavior changes, especially in API routes.
- Known caveat: many React components are `.js` with JSX; Vitest parsing can fail depending on import path/config.
- Reliable baseline tests in this repo are API route and non-JSX-heavy integration/config tests.

### Recommended Test Strategy by Change Type

- API route logic changes:
	- Add or update integration-style route tests.
	- Validate auth and role-failure paths, not only happy paths.
- Auth/session changes:
	- Verify login/session creation, guarded route access, and role enforcement.
	- Check cookie/session behavior does not regress.
- UI-only changes:
	- Prefer lightweight tests that avoid brittle parser-heavy imports unless necessary.
	- Manually verify affected dashboard/page flows when automated coverage is limited.

### Minimum Verification Before Handoff

1. `npm run lint`
2. `npm test` (or targeted tests with equivalent confidence)
3. `npm run cf:build` when runtime/server paths were changed

## Change Checklist

Before finishing a task, agents should:

1. Run lint and relevant tests for changed areas.
2. Verify no secrets were added to tracked files.
3. Confirm auth/authorization behavior is unchanged unless intended.
4. If runtime/server code changed, ensure `npm run cf:build` still succeeds.
5. Summarize changed files and note any follow-up risks.

Also verify:

- No accidental edits to unrelated files.
- No credentials or environment values were hardcoded.
- Any new config assumptions are documented.

## Deployment Notes

- Production target is Cloudflare Pages using OpenNext output (`.open-next/assets`).
- Keep required env vars in mind (Firebase public config + session/admin secrets).
- Do not alter deployment config (`wrangler.json`, `open-next.config.ts`, `pages.toml`) unless requested.

### Deployment-Sensitive Changes

Treat these as high-risk and validate carefully:

- Session/auth token handling
- API runtime behavior and headers/cookies
- Firestore data access patterns
- Any code in shared server utilities under `src/lib`

If one of these areas changed, include explicit verification notes in handoff.

## Coding Style and Implementation Preferences

- Follow existing ES module style and semicolon-free formatting.
- Prefer pure/helper functions for reusable business logic.
- Keep route handlers thin: validate, authorize, delegate to helpers.
- Return clear and consistent error responses from API handlers.
- Add concise comments only where intent is non-obvious.

## Security Checklist for API and Auth Changes

When editing auth or protected APIs, confirm all below:

1. Session is validated on the server for each protected operation.
2. Role checks are explicit and deny by default.
3. Input is validated and sanitized where needed.
4. Error responses do not leak secrets or internal implementation details.
5. Privileged operations are not reachable from unauthenticated clients.

## Performance and Reliability Notes

- Prefer indexed and bounded queries; avoid unbounded scans where possible.
- Preserve pagination/limit behavior in resource endpoints.
- Avoid adding expensive synchronous work in request hot paths.
- Keep client bundle impact low for shared UI components.

## Documentation and Handoff Expectations

At task completion, provide:

1. Files changed and purpose of each change
2. Validation executed (lint/tests/build)
3. Security/runtime implications
4. Any residual risk or follow-up suggestion

## Out of Scope Unless Requested

- Broad UI redesigns across unrelated pages
- Dependency upgrades unrelated to the task
- Migration of routing/auth architecture
- Changes in `firebase-functions/` unless task explicitly requests it

## Common Pitfalls (Do/Don't)

### 1) Firestore imports in server/edge code

- Do: keep edge-sensitive access patterns lightweight and compatible with Cloudflare/OpenNext.
- Don't: introduce server bundles that trigger dynamic code generation and fail on Workers.

### 2) Auth checks in protected APIs

- Do: validate session and role on the server in every protected handler.
- Don't: rely on client-side role state or UI guards as the only protection.

### 3) Scope creep during fixes

- Do: patch the requested behavior with the smallest viable change set.
- Don't: refactor unrelated modules or rename broad symbols without a task requirement.

### 4) Fragile UI tests

- Do: favor API-route and non-JSX-heavy tests when confidence is needed quickly.
- Don't: add brittle component-import tests that depend on parser edge cases unless necessary.

### 5) Deployment config edits

- Do: keep deployment/runtime files unchanged unless explicitly requested.
- Don't: modify `wrangler.json`, `open-next.config.ts`, or `pages.toml` as part of routine feature work.

### 6) Secrets and credentials hygiene

- Do: use environment variables and scrub logs/responses for sensitive values.
- Don't: commit `.env*`, service-account files, tokens, or private keys.
