# Security Checklist

Date: 2026-04-09
Scope: API routes, shared validation, upload safety, auth flows, and admin controls.

## Route Group Coverage

### Authentication (`/api/auth/*`)
- Same-origin enforcement on mutating requests.
- Input validation for credential identifier and password length bounds.
- Google token format validation before verification.
- 2FA challenge ID and OTP strict format validation.
- Change-password validation with strong password complexity policy.
- Session/cookie creation uses secure server-side session paths.

### Search and Discovery (`/api/search`, `/api/student/resources`)
- Query sanitization for search term, filters, and sort fields.
- Whitelisting for resource type and sort values.
- Pagination parsing with bounded limits.

### Faculty Resource Management (`/api/faculty/resources*`)
- Same-origin and role checks.
- Upload MIME allowlist enforced.
- Upload size cap enforced (1 byte to 25MB).
- Filename sanitization plus hard-fail for unsafe/invalid names.
- JSON parse hard-fail for invalid non-multipart payloads.
- Resource update actions sanitized before processing.

### Admin User Management (`/api/admin/users*`)
- Role-protected routes.
- Query sanitization for role/status/search filters.
- Protected-admin safeguards for delete/credential operations.
- Password complexity enforcement for admin credential reset.

### Admin Monitoring and Logs (`/api/admin/audit-logs`, `/api/admin/suspicious-activities`, `/api/admin/activity-timeline`)
- Super-admin gating where required.
- Query sanitization for search/filter parameters.
- Pagination validated and bounded.
- Date input validation uses strict invalid-date checks.
- Mutating identifiers sanitized before action.

### Collections, Reviews, Comments, Versions, Preferences
- Session/role checks on read/write routes.
- Server-side normalization and sanitization in shared data layer.
- Resource-review update path verifies review-resource ownership relation.

## Shared Data Layer Controls (`src/lib/server-data.js`)
- Normalized text input strips tags/control chars and bounds length.
- URL normalization permits only HTTP/HTTPS for stored links.
- Create/update flows enforce sanitized persisted fields.
- Version snapshots and moderation records use guarded write paths.

## Test Coverage Added (Negative Paths)
- Malformed Google JWT format rejected before token verification.
- Invalid 2FA challenge ID/OTP rejected before challenge verification call.
- Upload reject on unsupported MIME type and invalid filename.
- Change-password rejects weak password complexity before credential verification.
- Admin reset-credentials rejects weak password before reset action.

## Operational Validation
- `npm run lint` passes.
- `npm test` passes.
- `npm run build` passes.

## CI Release Gate Matrix (Pass/Fail)

Use this matrix as the required merge gate for security-impacting changes.

| Gate ID | Gate Name | Command / Source | Pass Criteria | Fail Criteria | Evidence in PR |
|---|---|---|---|---|---|
| G1 | Lint | `npm run lint` | Exit code `0` and no ESLint errors | Any lint error or non-zero exit code | Paste command result summary |
| G2 | Tests | `npm test` | Exit code `0`; all test files pass | Any failing test, skipped critical test, or non-zero exit code | Paste test summary (`files`, `tests`) |
| G3 | Production Build | `npm run build` | Build completes successfully and routes generate | Build/type error or non-zero exit code | Paste build success summary |
| G4 | Auth Negative Paths | Vitest suite | Malformed JWT + invalid 2FA format tests pass | Any auth negative-path failure | Confirm tests in PR checklist |
| G5 | Upload Hard-Fail Paths | Vitest suite | Unsupported MIME + invalid filename tests pass | Any upload hard-fail test failure | Confirm tests in PR checklist |
| G6 | Password Policy Enforcement | Vitest suite | Change-password + admin reset weak-password rejections pass | Any policy bypass in tests | Confirm tests in PR checklist |
| G7 | Sanitization Consistency | Code review + tests | Modified API inputs pass through sanitization/validation and role checks | Unsanitized user input reaches persistence/query/action | Reviewer sign-off in PR checklist |
| G8 | Same-Origin Protection | Code review | Mutating routes keep same-origin checks where required | Missing same-origin checks on sensitive mutating routes | Reviewer sign-off in PR checklist |

### Merge Policy
- For security-sensitive PRs, all gates `G1` through `G8` must be `PASS`.
- Any `FAIL` blocks merge until fixed and re-verified.
- If a gate is `N/A`, include a one-line justification in the PR checklist.

### Suggested Required CI Checks
- `CI / lint`
- `CI / test`
- `CI / build`
- `CI / security-gate-review`

## Residual Risk and External Validation
- Static and runtime checks reduce risk but do not prove zero vulnerabilities.
- Recommended release gates outside this repo:
  - SAST + dependency vulnerability scan in CI.
  - DAST against staging.
  - WAF/rate-limit policy verification.
  - Security event alerting and log retention checks.
