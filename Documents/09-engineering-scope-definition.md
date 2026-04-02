# 09 — Engineering Scope Definition

## Version
1.0 — MVP

---

## 1. Purpose

This document defines what is **in scope**, **out of scope**, and **deferred** for the MVP engineering effort. It establishes the boundaries used for sprint planning, effort estimation, and stakeholder alignment.

---

## 2. In Scope — MVP

### 2.1 Frontend (Next.js)

| Feature | Description |
|---------|-------------|
| Landing page | Static marketing/intro page with login/register CTAs |
| Authentication pages | Login and register forms with Firebase Auth |
| Role-based routing | Post-login redirect based on user role |
| Admin — Users page | Paginated user list, ban/unban, role change |
| Admin — Resources page | Full resource list, delete action |
| Faculty — Upload page | PDF file picker + metadata form + progress indicator |
| Faculty — My Resources page | Own uploads list, edit/delete actions |
| Faculty — Edit Resource page | Metadata update form |
| Student — Search page | Keyword search + class/subject filters + paginated results |
| Download | Direct CDN link download from resource card |
| Auth guard (middleware) | Redirect unauthenticated/wrong-role users |
| Responsive layout | Desktop-first; usable on tablet/mobile |
| Error states | Inline form errors, empty states, loading skeletons |

### 2.2 Backend (Firebase Cloud Functions)

| Function | Description |
|----------|-------------|
| `onUserCreate` | Auth trigger: creates user document with default role |
| `uploadResource` | Validate → compress → upload to Cloudinary → write Firestore |
| `updateResource` | Update metadata for own resource |
| `deleteResource` | Delete from Cloudinary + Firestore (faculty own / admin any) |
| `searchResources` | Prefix + filter query with cursor pagination |
| `getFacultyResources` | Paginated list of own uploads |
| `listUsers` | Paginated user list for admin |
| `updateUserStatus` | Ban / unban user |
| `updateUserRole` | Change user role |

### 2.3 Database & Storage

| Item | Description |
|------|-------------|
| Firestore collections | `users`, `resources`, `auditLogs` |
| Firestore security rules | RBAC per collection |
| Composite indexes | All required search + filter combinations |
| Cloudinary setup | Account, upload presets, folder structure |
| PDF compression pipeline | `pdf-lib` or `ghostscript` in Cloud Function |

### 2.4 DevOps

| Item | Description |
|------|-------------|
| GitHub repository | Monorepo with `apps/web` and `functions` |
| Vercel deployment | Auto-deploy frontend on push to `main` |
| Firebase deploy | CI/CD for Cloud Functions via GitHub Actions |
| Environment config | `.env.local` for web, `.env` for functions |

---

## 3. Out of Scope — MVP

These items will **not** be built during MVP:

| Feature | Reason deferred |
|---------|----------------|
| AI-based resource recommendations | Requires ML pipeline; post-MVP |
| Push notifications (email/browser) | Added complexity; not critical for v1 |
| Mobile native app (iOS/Android) | Web-first approach for MVP |
| Advanced analytics dashboard | Nice-to-have; post-MVP |
| File versioning | Storage cost + complexity; not required for v1 |
| Full-text search (Algolia/Meilisearch) | Firestore prefix search sufficient for MVP scale |
| Social features (comments, ratings) | Not in PRD for v1 |
| Bulk upload | Single file upload sufficient for MVP |
| SSO / OAuth login (Google, GitHub) | Email/password sufficient for MVP |
| Dark mode | UI enhancement; deferred |
| Audit log viewer in Admin UI | Logs written; UI display deferred |

---

## 4. Technical Constraints

| Constraint | Detail |
|-----------|--------|
| Infrastructure cost | Must stay within free tiers |
| Storage budget | ≤ 20 GB on Cloudinary free plan |
| File type | PDF only |
| File size limit | 10 MB pre-compression |
| Concurrent users target | 5 000 |
| Search response time | < 1 second P95 |
| Backend runtime | Firebase Cloud Functions (Node.js 18+) |
| Database | Firestore only (no relational DB for MVP) |

---

## 5. Effort Estimates

| Area | Estimated Dev Days |
|------|--------------------|
| Project setup & CI/CD | 1 day |
| Authentication (login, register, routing) | 2 days |
| Database schema + Firestore rules | 1 day |
| Cloud Functions scaffolding + middleware | 1 day |
| PDF compression + Cloudinary integration | 2 days |
| Faculty panel (upload, manage) | 3 days |
| Student panel (search, filter, download) | 3 days |
| Admin panel (users, resources) | 2 days |
| Frontend polish + error states | 2 days |
| Testing (unit + integration) | 2 days |
| Deployment + environment config | 1 day |
| **Total** | **~20 dev days** |

> Assumes 1 developer. Parallel work across frontend/backend can reduce calendar time.

---

## 6. Definition of Done (MVP)

A feature is considered **done** when:

- [ ] Functionality matches acceptance criteria in `02-user-stories-and-acceptance-criteria.md`
- [ ] Error states are handled and communicated to the user
- [ ] Firestore security rules prevent unauthorized access
- [ ] Code is reviewed and merged to `main`
- [ ] Feature is deployed and verified in production environment
- [ ] No P0/P1 bugs open against the feature

---

## 7. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Cloudinary free tier storage exceeded | Medium | High | Compress aggressively; monitor usage; alert at 80% |
| Firestore query limitations for search | Medium | Medium | Implement prefix search; plan Algolia migration |
| PDF compression breaking files | Low | High | Validate output PDF before returning success |
| Firebase Cold Start latency | Medium | Medium | Keep functions warm; optimize bundle size |
| Concurrent user spike beyond 5 000 | Low | High | CDN absorbs frontend; serverless scales backend |
