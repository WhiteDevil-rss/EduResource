# 04 — System Architecture

## Version
1.0 — MVP

---

## 1. Architecture Style

- **Serverless** backend (Firebase Cloud Functions)
- **CDN-delivered** frontend (Next.js via Vercel/Netlify)
- **NoSQL** document database (Firestore)
- **Managed file storage** with CDN delivery (Cloudinary)

---

## 2. High-Level Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│           Browser / Mobile Browser                               │
└──────────────────────┬───────────────────────────────────────────┘
                       │  HTTPS
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                       CDN / EDGE LAYER                           │
│         Vercel / Netlify (Next.js Static + SSR)                  │
│         - Static asset caching                                   │
│         - Edge routing                                           │
│         - SSG pages served at the edge                           │
└──────────────────────┬───────────────────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          │                         │
          ▼                         ▼
┌─────────────────┐      ┌─────────────────────────────────────────┐
│  Firebase Auth  │      │         Firebase Cloud Functions        │
│  - JWT tokens   │◄─────│  (Serverless Backend — Node.js runtime) │
│  - Role claims  │      │                                         │
└─────────────────┘      │  uploadResource()                       │
                         │  deleteResource()                       │
                         │  searchResources()                      │
                         │  listUsers()                            │
                         │  updateUserStatus()                     │
                         │  updateUserRole()                       │
                         └──────┬──────────────────┬──────────────┘
                                │                  │
                                ▼                  ▼
                 ┌──────────────────┐   ┌──────────────────────────┐
                 │    Firestore     │   │       Cloudinary          │
                 │  (NoSQL DB)      │   │  (PDF Storage + CDN)      │
                 │                  │   │                           │
                 │  /users          │   │  - PDF upload             │
                 │  /resources      │   │  - PDF compression        │
                 │  /auditLogs      │   │  - CDN delivery URLs      │
                 └──────────────────┘   └──────────────────────────┘
```

---

## 3. Component Descriptions

### 3.1 Frontend — Next.js
- Framework: Next.js 14+ (App Router)
- Styling: Tailwind CSS
- Hosting: Vercel (primary) or Netlify
- Rendering: SSG for public pages, CSR for authenticated panels
- Auth state: React Context backed by Firebase SDK

### 3.2 Authentication — Firebase Auth
- Provider: Email/Password
- Token: Firebase JWT (ID Token)
- Role storage: Custom claims or Firestore `users` document
- Token verification: Performed server-side in Cloud Functions

### 3.3 Backend — Firebase Cloud Functions
- Runtime: Node.js 18+
- Region: Single region (e.g., `us-central1`)
- Trigger: HTTPS callable functions
- Responsibilities:
  - Validate incoming requests and auth tokens
  - Enforce RBAC (role-based access control)
  - Orchestrate PDF compression and Cloudinary upload
  - Read/write Firestore

### 3.4 Database — Firestore
- Type: NoSQL document store
- Collections: `users`, `resources`, `auditLogs`
- Indexes: Composite indexes on `(class, subject, createdAt)`
- Security: Firestore rules enforce read/write per role

### 3.5 File Storage — Cloudinary
- Stores compressed PDFs
- Provides CDN-backed download URLs
- Upload triggered from Cloud Functions (server-side SDK)
- Free tier: ~25 GB storage

### 3.6 PDF Compression
- Library: `ghostscript` (subprocess) or `pdf-lib` (Node.js)
- Applied before upload to Cloudinary
- Target: Reduce average PDF size by 40–60%

---

## 4. Request Flows

### 4.1 Authentication Flow
```
1. User submits email + password
2. Firebase Auth SDK authenticates → returns ID Token (JWT)
3. Frontend stores token in memory / secure cookie
4. Each API call includes token in Authorization header
5. Cloud Function verifies token via Admin SDK
6. Role is read from Firestore users document
7. User is redirected to role-appropriate panel
```

### 4.2 File Upload Flow (Faculty)
```
1. Faculty selects PDF + fills metadata form
2. Frontend calls uploadResource() Cloud Function with file + metadata
3. Function verifies JWT → checks faculty role
4. Validates MIME type (application/pdf) and file size (≤ 10 MB)
5. Compresses PDF (ghostscript / pdf-lib)
6. Uploads compressed file to Cloudinary → receives CDN URL
7. Writes resource document to Firestore with metadata + CDN URL
8. Returns success response to frontend
```

### 4.3 Search Flow (Student)
```
1. Student types query (debounced 300 ms)
2. Frontend calls searchResources() with query + filters
3. Function verifies JWT → checks student role
4. Queries Firestore using indexed fields (title, class, subject)
5. Returns paginated results (limit + cursor)
6. Frontend renders result cards
```

### 4.4 Download Flow
```
1. Student clicks Download on a resource card
2. Frontend fetches fileUrl from Firestore (or already in search result)
3. Browser redirects to Cloudinary CDN URL
4. File download begins directly from CDN
```

---

## 5. Scalability Design

| Layer | Strategy |
|-------|----------|
| Frontend | SSG + CDN edge caching → near-zero origin load |
| Backend | Serverless auto-scaling → handles burst traffic |
| Database | Firestore auto-scales; composite indexes for fast reads |
| Storage | Cloudinary CDN → distributes download load |
| API | Stateless functions → horizontal scaling by default |

Target: **5 000 concurrent users** without infrastructure changes.

---

## 6. Security Architecture

| Concern | Mechanism |
|---------|-----------|
| Authentication | Firebase Auth JWT, verified server-side |
| Authorization | RBAC enforced in Cloud Functions + Firestore rules |
| File validation | MIME type + extension check before processing |
| Transport | HTTPS enforced at CDN and Firebase layer |
| Input validation | Server-side validation in all Cloud Functions |
| Rate limiting | Per-user upload throttling in Cloud Functions |

---

## 7. Failure Handling

| Scenario | Handling |
|----------|----------|
| Upload failure (network) | Frontend retry with exponential backoff |
| Compression failure | Upload rejected; user shown error |
| Cloudinary unavailable | Upload fails; Firestore record not created |
| Firestore write failure | Cloudinary upload rolled back (delete call) |
| Slow Firestore query | Composite index optimization; pagination limits |

---

## 8. Scaling Beyond MVP

If user base grows beyond 5 000 concurrent users:

| Current | Upgrade Path |
|---------|-------------|
| Firebase Cloud Functions | Node.js + Express on Cloud Run / Railway |
| Firestore | PostgreSQL (Supabase / Neon) with full-text search |
| Cloudinary | AWS S3 + CloudFront |
| No caching layer | Redis (Upstash) for query caching |
| Basic search | Algolia / Meilisearch for full-text search |
