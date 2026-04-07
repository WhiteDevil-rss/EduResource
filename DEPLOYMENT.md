# EduResource Hub - Deployment Guide

## Overview
This application is configured for deployment on Cloudflare Pages with full support for the secure authentication and role-based access control system.

## Deployment Method
**Cloudflare Pages** - Static site deployment with API routes support

## Prerequisites
1. Cloudflare account with Pages enabled
2. GitHub repository connected to Cloudflare Pages
3. Environment variables configured in Cloudflare Pages dashboard

## Build Configuration
- **Build Command**: `npm run cf:build`
- **Build Output Directory**: `.open-next/assets`
- **Node Version**: 20.x

## Environment Variables (Cloudflare Pages Dashboard)

### Required Environment Variables
```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-firebase-app-id

# Session Security
SESSION_SECRET=your-long-random-secret-string

# Super Admin Access
SUPER_ADMIN_EMAIL=your-super-admin-email
VITE_SUPER_ADMIN_EMAIL=your-super-admin-email

# Firebase Admin (for server-side operations)
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_PROJECT_ID=your-project-id
```

## Deployment Steps

### 1. Connect Repository to Cloudflare Pages
1. Go to Cloudflare Pages dashboard
2. Click "Create a project"
3. Connect your GitHub repository
4. Configure build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `.next`
   - **Root directory**: `/` (leave empty)

### 2. Configure Environment Variables
In the Cloudflare Pages project settings:
1. Go to "Environment variables"
2. Add all required variables listed above
3. Set environment to "Production"

### 3. Deploy
1. Push code to the main branch
2. Cloudflare Pages will automatically build and deploy
3. Monitor deployment status in the dashboard

## Post-Deployment Verification

### 1. Authentication Testing
- **Student Registration**: Visit `/register` → Google OAuth for students
- **Student Login**: Visit `/login` → Select "Student" → Google OAuth only
- **Faculty/Staff Login**: Visit `/login` → Select "Staff" → Email/password credentials (admin-provisioned)
- **Admin Access**: Full dashboard access for user management

### 2. API Functionality
- All API routes should work: `/api/*`
- Authentication endpoints: `/api/auth/*`
- Protected routes require valid sessions
- Role-based access enforced

### 3. Security Verification
- Direct API access blocked without authentication
- Role restrictions working (students can't access admin routes)
- Session management functional
- CSRF protection active

## Troubleshooting

### Build Failures
- Ensure all environment variables are set
- Check Node.js version compatibility (20.x)
- Verify package.json dependencies

### Runtime Issues
- Check Firebase configuration
- Ensure Firestore security rules are deployed
- Check session secret is properly set

### Authentication Problems
- Verify Firebase project settings
- Check Google OAuth configuration
- Ensure service account credentials are correct

## Security Notes
- All sensitive operations use server-side authentication
- API routes validate sessions and roles
- Database access restricted to server-side code
- Environment variables encrypted in production

## Performance Optimization
- Static assets served via Cloudflare CDN
- API routes optimized for edge computing
- Image optimization through Next.js
- Caching configured for optimal performance

## Monitoring
- Cloudflare Pages provides deployment logs
- Application errors logged to console
- Firebase provides authentication logs
- Admin dashboard shows system activity