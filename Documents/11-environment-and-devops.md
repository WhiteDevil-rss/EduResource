# 11 — Environment & DevOps

## Version
1.0 — MVP

---

## 1. Environments

| Environment | Purpose | URL |
|------------|---------|-----|
| `local` | Developer local machine | `http://localhost:3000` |
| `preview` | Auto-deployed from feature branches | `https://<branch>.vercel.app` |
| `production` | Live environment, main branch | `https://eduresourcehub.vercel.app` |

---

## 2. Tech Stack Versions

| Tool | Version |
|------|---------|
| Node.js | 18 LTS |
| Next.js | 14+ |
| React | 18+ |
| Tailwind CSS | 3+ |
| Firebase SDK (client) | 10+ |
| Firebase Admin SDK (functions) | 12+ |
| Firebase Functions | v2 (Node.js 18 runtime) |
| TypeScript | 5+ |

---

## 3. Environment Variables

### `apps/web/.env.local` (Frontend)

```env
# Firebase Client Config
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Cloud Functions Region
NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION=us-central1
```

### `firebase-functions/.env` (Cloud Functions)

```env
# Firebase
FIREBASE_PROJECT_ID=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_UPLOAD_FOLDER=eduresource-hub/resources
```

> ⚠️ Never commit `.env.local` or `firebase-functions/.env` to version control. Only `.env.example` is committed.

---

## 4. Local Development Setup

### Prerequisites

```bash
node --version   # 18+
npm --version    # 9+
```

### Setup Steps

```bash
# 1. Clone repository
git clone https://github.com/your-org/eduresource-hub.git
cd eduresource-hub

# 2. Install all workspace dependencies
npm install

# 3. Copy env templates
cp apps/web/.env.example apps/web/.env.local
cp firebase-functions/.env.example firebase-functions/.env
# Fill in actual values

# 4. Install Firebase CLI
npm install -g firebase-tools

# 5. Login to Firebase
firebase login

# 6. Start Next.js dev server
npm run dev

# 7. (Optional) Start Firebase emulators for local backend
cd firebase-functions && npm run serve
```

### Firebase Emulators (local backend)

```bash
firebase emulators:start --only functions,firestore,auth
```

Emulator UI available at `http://localhost:4000`

Update frontend env for local emulators:
```env
NEXT_PUBLIC_USE_EMULATORS=true
```

---

## 5. Firebase Project Setup

### Steps

1. Create project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** → Email/Password provider
3. Create **Firestore Database** in production mode
4. Enable **Cloud Functions** (requires Blaze plan for HTTP functions)
5. Deploy security rules: `firebase deploy --only firestore:rules`
6. Deploy indexes: `firebase deploy --only firestore:indexes`
7. Deploy functions: `firebase deploy --only functions`

---

## 6. Vercel Deployment

### Initial Setup

1. Import GitHub repository in [vercel.com](https://vercel.com)
2. Set **Root Directory** to `apps/web`
3. Add all `NEXT_PUBLIC_*` environment variables in Vercel dashboard
4. Set **Production Branch** to `main`

### Build Config

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install"
}
```

---

## 7. CI/CD Pipelines

### 7.1 Deploy Frontend — `.github/workflows/deploy-web.yml`

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]
    paths:
      - 'apps/web/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run lint
        run: npm run lint --workspace=apps/web

      - name: Run tests
        run: npm run test --workspace=apps/web

      - name: Build
        run: npm run build --workspace=apps/web
        env:
          NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.NEXT_PUBLIC_FIREBASE_API_KEY }}
          NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN }}
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}
          NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID }}
          NEXT_PUBLIC_FIREBASE_APP_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_APP_ID }}

      # Vercel handles actual deployment via GitHub integration
```

### 7.2 Deploy Cloud Functions — `.github/workflows/deploy-functions.yml`

```yaml
name: Deploy Cloud Functions

on:
  push:
    branches: [main]
    paths:
      - 'firebase-functions/**'
      - 'firestore/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci --workspace=firebase-functions

      - name: Run tests
        run: npm run test --workspace=firebase-functions

      - name: Deploy functions
        uses: w9jds/firebase-action@v13.0.2
        with:
          args: deploy --only functions,firestore:rules,firestore:indexes
        env:
          GCP_SA_KEY: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
```

---

## 8. Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code; auto-deployed |
| `develop` | Integration branch for feature work |
| `feat/<name>` | Individual feature branches |
| `fix/<name>` | Bug fix branches |
| `chore/<name>` | Non-functional changes |

### Merge Policy
- PRs required to merge into `main` and `develop`
- Minimum 1 reviewer (or self-review for solo dev)
- CI must pass before merge
- Squash merge preferred to keep history clean

---

## 9. Secrets Management

| Secret | Stored In |
|--------|----------|
| Firebase config (public) | Vercel environment variables |
| Firebase service account | GitHub Actions secrets |
| Cloudinary credentials | Firebase Functions config / `.env` |

> Never store secrets in source code. Use `.env.example` with placeholder values only.

---

## 10. Monitoring & Observability

| Tool | Purpose |
|------|---------|
| Firebase Console | Function invocation logs, error tracking |
| Vercel Analytics | Frontend traffic, Web Vitals |
| Cloudinary Dashboard | Storage usage, bandwidth |
| Firebase Firestore Metrics | Read/write counts, index usage |

### Storage Budget Alert
Set a Cloudinary usage alert at **80% of free tier** (16 GB / 20 GB) to prompt cleanup or upgrade before hitting the limit.
