# EduResource Hub

EduResource Hub is a role-based academic resource platform built with Next.js and Firebase. Students can browse curated learning materials, faculty can manage resource uploads, and admins can oversee users and access rules.

## Features

- Email/password authentication with Firebase Auth
- Role-based dashboards for students, faculty, and admins
- Protected routes with server-side session checks
- Firestore-backed user profiles and resources
- Cloudflare-ready deployment using OpenNext

## Tech Stack

- Next.js 16
- React 19
- Firebase Authentication
- Cloud Firestore
- Cloudinary
- Cloudflare Workers with OpenNext

## Local Development

### 1. Install dependencies

```bash
npm install --legacy-peer-deps
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

Optional server values:

- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

### 3. Start the app

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

## Authentication Notes

- Login uses Firebase Auth on the client.
- Session cookies are signed server-side for protected dashboard routes.
- Role checks are enforced on the server for dashboard access.
- Students cannot access admin routes through URL changes alone.

## Firestore Rules

This project includes Firestore rules in `firestore.rules`. Make sure your Firebase project uses the matching rules and indexes before testing the app in production.

## Cloudflare Deployment

This project is configured for Cloudflare Workers using OpenNext.

### Pages compatibility note

Cloudflare Pages auto-detects a top-level `functions/` directory as Pages Functions.
This repo stores Firebase Cloud Functions in `firebase-functions/` to avoid Pages
build warnings and keep Firebase code separate from Cloudflare Pages Functions.

### 1. Install Wrangler

```bash
npm install
```

### 2. Log in to Cloudflare

```bash
npx wrangler login
```

### 3. Set production secrets

In the Cloudflare dashboard or via Wrangler, set:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `SESSION_SECRET`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

### 4. Build for Cloudflare

```bash
npm run cf:build
```

### 5. Preview locally in Wrangler

```bash
npm run preview
```

### 6. Deploy

```bash
npm run deploy
```

## Scripts

- `npm run dev` starts local Next.js development
- `npm run build` builds the Next.js app
- `npm run cf:build` builds the Cloudflare worker output
- `npm run preview` previews the Cloudflare build locally
- `npm run deploy` deploys to Cloudflare

## Security

- Do not commit `.env.local`
- Use a strong `SESSION_SECRET` in production
- Keep Cloudinary and Firebase private keys in server-side secrets only
- Avoid creating admin users from client-side logic

## Repository

GitHub: [WhiteDevil-rss/EduResource](https://github.com/WhiteDevil-rss/EduResource)
