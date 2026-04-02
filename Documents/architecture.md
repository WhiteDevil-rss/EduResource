# System Architecture

## Overview
This project is a scalable web platform with three role-based panels:
- Admin Panel
- Faculty Panel
- Student Panel

Built using modern serverless architecture to handle up to 5000 concurrent users.

---

## Tech Stack

### Frontend
- Next.js (React Framework)
- Tailwind CSS
- Hosted on Vercel / Netlify

### Backend
- Firebase Functions (Serverless)

### Authentication
- Firebase Authentication

### Database
- Firebase Firestore (NoSQL)

### Storage
- Cloudinary (Free ~25GB storage)

### PDF Compression
- ghostscript / pdf-lib

---

## Architecture Diagram (Concept)

User → Frontend → Firebase Auth  
                     ↓  
               Firestore DB  
                     ↓  
              Cloud Functions  
                     ↓  
                Cloudinary Storage  

---

## Flow

1. User logs in via Firebase Auth
2. Role-based routing (Admin / Faculty / Student)
3. Faculty uploads PDF
4. PDF is compressed via backend
5. Stored in Cloudinary
6. Metadata saved in Firestore
7. Student searches & downloads

---

## Scalability Strategy

- CDN caching via Vercel
- Firestore auto-scaling
- Serverless backend (no fixed limits)
- Indexed queries
- Pagination & lazy loading