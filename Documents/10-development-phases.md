# 10 — Development Phases

## Version
1.0 — MVP

---

## 1. Overview

The MVP is delivered across **4 phases** spanning approximately 4–5 weeks for a single developer. Each phase produces a deployable increment.

```
Phase 1 (Week 1)     — Foundation & Auth
Phase 2 (Week 2)     — Faculty Core
Phase 3 (Week 3)     — Student Core
Phase 4 (Week 4–5)   — Admin Panel + Polish + Launch
```

---

## 2. Phase 1 — Foundation & Authentication

**Duration**: ~5 days  
**Goal**: Working auth system with role-based routing and deployable skeleton

### Deliverables

#### Infrastructure
- [ ] Initialize monorepo (`apps/web`, `functions`)
- [ ] Configure Firebase project (Auth, Firestore, Functions)
- [ ] Create Cloudinary account and configure upload folder
- [ ] Set up Vercel project and link to GitHub repo
- [ ] Configure GitHub Actions for auto-deploy on push to `main`
- [ ] Set up environment variables in Vercel and GitHub Secrets

#### Database
- [ ] Define and deploy Firestore security rules
- [ ] Create composite indexes (`firestore.indexes.json`)
- [ ] Implement `onUserCreate` Auth trigger

#### Backend
- [ ] Cloud Functions scaffolding + shared middleware (`verifyAuth`, `requireRole`, `validatePayload`)

#### Frontend
- [ ] Next.js project setup with Tailwind CSS
- [ ] Firebase SDK integration (`config.ts`, `AuthContext.tsx`)
- [ ] Landing page (`/`)
- [ ] Login page (`/login`)
- [ ] Register page (`/register`) with role selector
- [ ] Auth guards / middleware (Next.js middleware.ts)
- [ ] Role-based redirect after login

### Exit Criteria
- User can register, log in, and be redirected to the correct panel
- Banned user cannot log in
- Unauthenticated requests to protected routes are redirected to `/login`

---

## 3. Phase 2 — Faculty Core

**Duration**: ~5 days  
**Goal**: Faculty can upload, edit, and delete PDFs

### Deliverables

#### Backend
- [ ] `uploadResource` — validate → compress → Cloudinary → Firestore
- [ ] `updateResource` — metadata update
- [ ] `deleteResource` — Cloudinary + Firestore deletion
- [ ] `getFacultyResources` — paginated own uploads

#### PDF Pipeline
- [ ] Implement PDF MIME validation
- [ ] Implement PDF compression (`pdf-lib` or `ghostscript`)
- [ ] Write unit tests for compression pipeline

#### Frontend
- [ ] Faculty layout (sidebar + header)
- [ ] Upload page with file picker, metadata form, progress indicator
- [ ] My Resources page with paginated table + edit/delete actions
- [ ] Edit Resource page (metadata form)
- [ ] Upload success/failure feedback

### Exit Criteria
- Faculty can upload a valid PDF with metadata
- Compressed file is stored in Cloudinary; metadata in Firestore
- Invalid files (non-PDF, > 10 MB) are rejected with clear error
- Faculty can edit metadata and delete own resources

---

## 4. Phase 3 — Student Core

**Duration**: ~5 days  
**Goal**: Students can search, filter, and download resources

### Deliverables

#### Backend
- [ ] `searchResources` — prefix query + filters + cursor pagination
- [ ] Client-side relevance scoring utility

#### Frontend
- [ ] Student layout (sidebar + header)
- [ ] Search page with debounced search bar
- [ ] Class and subject filter dropdowns
- [ ] Paginated resource cards with download button
- [ ] Empty state (no results found)
- [ ] Loading skeleton for search results

### Exit Criteria
- Student can search by title prefix and get results in < 1 s
- Class and subject filters work independently and in combination
- Download button fetches valid PDF from Cloudinary CDN
- Pagination loads next page correctly

---

## 5. Phase 4 — Admin Panel + Polish + Launch

**Duration**: ~5 days  
**Goal**: Admin functionality, UI polish, and production launch

### Deliverables

#### Backend
- [ ] `listUsers` — paginated with optional filters
- [ ] `updateUserStatus` — ban/unban
- [ ] `updateUserRole` — role change
- [ ] Audit log writes in admin functions

#### Frontend
- [ ] Admin layout (sidebar + header)
- [ ] Users page — paginated table, ban/unban toggle, role dropdown
- [ ] Resources page — full resource list with delete action
- [ ] Confirmation dialogs (delete, ban)
- [ ] Toast notifications for actions

#### Polish
- [ ] Responsive layout review (tablet + mobile)
- [ ] Error boundary components
- [ ] Loading states on all data fetches
- [ ] 404 and unauthorized pages

#### Launch
- [ ] Final security rules review
- [ ] Environment variable audit
- [ ] Production smoke test (all 3 roles)
- [ ] Performance test (search latency check)
- [ ] Storage budget verification

### Exit Criteria
- Admin can view, ban, unban users and delete any resource
- All 3 roles function end-to-end in production
- No P0 bugs
- Search latency < 1 s on production data

---

## 6. Phase Timeline Summary

| Phase | Focus | Duration | Cumulative |
|-------|-------|----------|-----------|
| 1 | Foundation & Auth | 5 days | Week 1 |
| 2 | Faculty Core | 5 days | Week 2 |
| 3 | Student Core | 5 days | Week 3 |
| 4 | Admin + Polish + Launch | 5 days | Week 4–5 |
| **Total** | | **~20 dev days** | |

---

## 7. Post-MVP Roadmap

After the MVP launch, the following phases are planned:

| Phase | Focus |
|-------|-------|
| v1.1 | Full-text search (Algolia integration) |
| v1.2 | Email notifications (upload confirmation, ban notification) |
| v1.3 | Analytics dashboard for admin |
| v2.0 | Mobile application (React Native) |
| v2.1 | AI resource recommendations |
| v3.0 | Scale migration (Node.js backend + PostgreSQL + S3) |
