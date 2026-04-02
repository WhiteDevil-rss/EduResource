# 07 — Monorepo Structure

## Version
1.0 — MVP  
Package Manager: **npm workspaces** (or pnpm)

---

## 1. Repository Layout

```
eduresource-hub/
│
├── package.json                   # Root workspace config
├── .gitignore
├── .env.example                   # Shared env variable template
├── README.md
│
├── apps/
│   └── web/                       # Next.js frontend application
│       ├── package.json
│       ├── next.config.js
│       ├── tailwind.config.js
│       ├── tsconfig.json
│       ├── public/
│       │   └── assets/            # Static images, icons
│       └── src/
│           ├── app/               # Next.js App Router
│           │   ├── layout.tsx
│           │   ├── page.tsx                  # Landing page (/)
│           │   ├── login/
│           │   │   └── page.tsx
│           │   ├── register/
│           │   │   └── page.tsx
│           │   ├── admin/
│           │   │   ├── layout.tsx
│           │   │   ├── page.tsx
│           │   │   ├── users/
│           │   │   │   └── page.tsx
│           │   │   └── resources/
│           │   │       └── page.tsx
│           │   ├── faculty/
│           │   │   ├── layout.tsx
│           │   │   ├── page.tsx
│           │   │   ├── upload/
│           │   │   │   └── page.tsx
│           │   │   └── resources/
│           │   │       ├── page.tsx
│           │   │       └── [id]/
│           │   │           └── edit/
│           │   │               └── page.tsx
│           │   └── student/
│           │       ├── layout.tsx
│           │       ├── page.tsx
│           │       └── search/
│           │           └── page.tsx
│           │
│           ├── components/        # Shared UI components
│           │   ├── ui/            # Base components (Button, Input, Modal, etc.)
│           │   ├── layout/        # Header, Sidebar, Footer
│           │   ├── auth/          # LoginForm, RegisterForm
│           │   ├── resources/     # ResourceCard, ResourceTable, UploadForm
│           │   ├── users/         # UserTable, UserRow
│           │   └── search/        # SearchBar, FilterPanel
│           │
│           ├── contexts/
│           │   └── AuthContext.tsx
│           │
│           ├── hooks/
│           │   ├── useAuth.ts
│           │   ├── useResources.ts
│           │   └── useUsers.ts
│           │
│           ├── lib/
│           │   ├── firebase/
│           │   │   ├── config.ts           # Firebase app init
│           │   │   ├── auth.ts             # Auth helpers
│           │   │   └── functions.ts        # Callable function wrappers
│           │   └── utils/
│           │       ├── formatBytes.ts
│           │       ├── debounce.ts
│           │       └── validators.ts
│           │
│           └── types/
│               ├── user.ts
│               └── resource.ts
│
├── functions/                     # Firebase Cloud Functions
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env                       # Functions-specific env (not committed)
│   └── src/
│       ├── index.ts               # Exports all functions
│       │
│       ├── auth/
│       │   └── onUserCreate.ts    # Auth trigger — create user doc
│       │
│       ├── resources/
│       │   ├── uploadResource.ts
│       │   ├── updateResource.ts
│       │   ├── deleteResource.ts
│       │   ├── searchResources.ts
│       │   └── getFacultyResources.ts
│       │
│       ├── admin/
│       │   ├── listUsers.ts
│       │   ├── updateUserStatus.ts
│       │   └── updateUserRole.ts
│       │
│       ├── services/
│       │   ├── cloudinary.ts      # Cloudinary SDK wrapper
│       │   ├── pdfCompressor.ts   # PDF compression logic
│       │   └── auditLogger.ts     # Write to auditLogs collection
│       │
│       └── middleware/
│           ├── verifyAuth.ts      # Verify Firebase ID token
│           ├── requireRole.ts     # Role-based access guard
│           └── validatePayload.ts # Request payload validation
│
├── firestore/
│   ├── firestore.rules            # Firestore security rules
│   └── firestore.indexes.json     # Composite index definitions
│
├── .github/
│   └── workflows/
│       ├── deploy-web.yml         # Deploy frontend to Vercel on push to main
│       └── deploy-functions.yml   # Deploy Cloud Functions on push to main
│
└── docs/
    ├── 01-product-requirements.md
    ├── 02-user-stories-and-acceptance-criteria.md
    ├── 03-information-architecture.md
    ├── 04-system-architecture.md
    ├── 05-database-schema.md
    ├── 06-api-contracts.md
    ├── 07-monorepo-structure.md
    ├── 08-scoring-engine-spec.md
    ├── 09-engineering-scope-definition.md
    ├── 10-development-phases.md
    ├── 11-environment-and-devops.md
    └── 12-testing-strategy.md
```

---

## 2. Root `package.json`

```json
{
  "name": "eduresource-hub",
  "private": true,
  "workspaces": [
    "apps/web",
    "functions"
  ],
  "scripts": {
    "dev": "npm run dev --workspace=apps/web",
    "build": "npm run build --workspace=apps/web",
    "functions:dev": "npm run serve --workspace=functions",
    "functions:deploy": "npm run deploy --workspace=functions",
    "lint": "npm run lint --workspaces",
    "test": "npm run test --workspaces"
  }
}
```

---

## 3. Key Configuration Files

### `apps/web/.env.local`
```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION=us-central1
```

### `functions/.env`
```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
FIREBASE_PROJECT_ID=
```

---

## 4. Shared Types

The `types/` directories in `apps/web/src/types/` and `functions/src/` share the same type definitions. For a larger project, extract to a shared `packages/types/` workspace.

### `types/user.ts`
```typescript
export type UserRole = 'admin' | 'faculty' | 'student';
export type UserStatus = 'active' | 'banned';

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  displayName?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### `types/resource.ts`
```typescript
export interface Resource {
  id: string;
  title: string;
  class: string;
  subject: string;
  fileUrl: string;
  cloudinaryPublicId: string;
  fileSize: number;
  originalFileSize: number;
  uploadedBy: string;
  uploaderEmail: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 5. Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Files | camelCase | `uploadResource.ts` |
| React components | PascalCase | `ResourceCard.tsx` |
| CSS classes | Tailwind utility | `text-sm font-medium` |
| Firestore collections | camelCase | `resources`, `auditLogs` |
| Cloud Function names | camelCase | `uploadResource` |
| Environment variables | SCREAMING_SNAKE_CASE | `CLOUDINARY_API_KEY` |
