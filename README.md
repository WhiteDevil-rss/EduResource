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

## Cloudflare Pages Deployment

This project is configured for deployment on Cloudflare Pages with automatic builds via GitHub integration.

### Deployment Setup
1. Connect your GitHub repository to Cloudflare Pages
2. Set build command: `npm run build`
3. Set build output directory: `.next`
4. Configure environment variables in Cloudflare Pages dashboard

### Required Environment Variables
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `SESSION_SECRET`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_PROJECT_ID`

### Local Development
```bash
npm run dev
```

The app runs at `http://localhost:3000`.

### Preview Production Build
```bash
npm run preview
```

### Deploy to Production
```bash
npm run deploy
```

## Security Features

- **Role-Based Access Control**: Strict RBAC with admin, faculty, and student roles
- **Secure Authentication**: Google OAuth for students, credential-based for faculty/admin
- **Session Management**: Signed cookies with expiration and validation
- **API Security**: All endpoints protected with authentication and authorization
- **Database Security**: Firestore access restricted to server-side operations
- `npm run deploy` deploys to Cloudflare

## Security

- Do not commit `.env.local`
- Use a strong `SESSION_SECRET` in production
- Keep Cloudinary and Firebase private keys in server-side secrets only
- Avoid creating admin users from client-side logic

## Repository

GitHub: [WhiteDevil-rss/EduResource](https://github.com/WhiteDevil-rss/EduResource)
