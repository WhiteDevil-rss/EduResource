# SPS EDUCATIONAM

SPS EDUCATIONAM is a role-based academic resource platform built with Next.js and Firebase. Students can browse curated learning materials, faculty can manage resource uploads, and admins can oversee users and access rules.

## Features

- Email/password authentication with Firebase Auth
- **Change Password**: Secure server-side password management for authenticated users
- Role-based dashboards for students, faculty, and admins
- Protected routes with server-side session checks
- Firestore-backed user profiles and resources
- **Cloudflare Edge Compatible**: All authentication logic (REST API based) is optimized for Cloudflare Workers/Pages
- **Security Audited**: 0 vulnerabilities in top-level and transitive dependencies

## Tech Stack

- Next.js 16
- React 19 (Server Components)
- Firebase Authentication (via REST API for edge compatibility)
- Cloud Firestore
- Cloudflare Workers with OpenNext

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment variables

Copy the example file and fill in your real values:

```bash
cp .env.example .env.local
```

Required values include:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `SESSION_SECRET`

Optional server values (required for some admin features):

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `SUPER_ADMIN_EMAIL`

Frontend code that needs the same check should read `NEXT_PUBLIC_SUPER_ADMIN_EMAIL`.

### 3. Start the app

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

## Authentication & Security

- **Login**: Uses Firebase Auth on the client.
- **Session Management**: Secure, signed cookies enforced for all dashboard routes.
- **Password Updates**: High-security `/api/auth/change-password` route requires the current password for verification.
- **Edge Deployment**: Firebase Auth operations are migrated to a direct REST architecture to ensure 100% compatibility with Cloudflare's `nodejs_compat` environment.
- **Dependency Audit**: The project uses `overrides` in `package.json` to force secure versions of transitive dependencies (`protobufjs`, `jsonwebtoken`), maintaining a **0-vulnerability** status.

## Firestore Rules

This project includes Firestore rules in `firestore.rules` that intentionally deny all client reads and writes. Ensure your Firebase project uses these rules to fully block direct Firestore access from client applications; all Firestore operations are intended to run only through privileged server-side code using the Firebase Admin SDK.

## Cloudflare Pages Deployment

This project uses **OpenNext** for optimal performance on the Cloudflare global network.

### Deployment Commands

| Command | Action |
| :--- | :--- |
| `npm run cf:build` | Build the project for Cloudflare (OpenNext) |
| `npm run preview` | Preview the production build locally (Wrangler) |
| `npm run deploy` | Bundles and deploys the assets to Cloudflare Pages |

### Required Environment Variables (Production)

Ensure these are added in your Cloudflare Pages dashboard:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `SESSION_SECRET`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

## Security Policies

- Do not commit `.env.local` or Service Account JSON files.
- All high-risk endpoints require session verification and role checks.
- Sensitive environment variables are encrypted at rest on Cloudflare.

## Repository

GitHub: [WhiteDevil-rss/SPS EDUCATIONAM](https://github.com/WhiteDevil-rss/EduResource)
