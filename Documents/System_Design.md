# System Design Document

## 1. Overview

EduResource Hub is a scalable web-based platform designed for managing and accessing academic study resources. It supports three primary roles:

* **Admin**: Manages users and platform operations
* **Faculty**: Uploads and manages study materials
* **Student**: Searches and downloads study resources

The system is designed to efficiently handle up to **5000 concurrent users** using a **serverless and CDN-based architecture**.

---

## 2. High-Level Architecture

### Architecture Style

* Serverless Architecture
* CDN-backed frontend delivery

### Core Components

* **Frontend**: Next.js (React Framework)
* **Authentication**: Firebase Authentication
* **Backend**: Firebase Cloud Functions
* **Database**: Firestore (NoSQL)
* **File Storage**: Cloudinary (for PDFs)
* **CDN**: Vercel / Netlify

---

## 3. Architecture Diagram

```
[ Client Browser ]
        |
        v
[ Frontend (Next.js via CDN) ]
        |
        v
[ Firebase Authentication ]
        |
        v
[ Cloud Functions (Backend Logic) ]
        |
        v
-----------------------------------
|           Data Layer            |
|  Firestore (Metadata Storage)  |
|  Cloudinary (PDF Storage)      |
-----------------------------------
```

---

## 4. User Roles & Access Control

| Role    | Permissions                    |
| ------- | ------------------------------ |
| Admin   | Full system access             |
| Faculty | Upload, edit, delete resources |
| Student | Search and download resources  |

### Access Control Strategy

* Roles stored in Firestore
* Verified using Firebase Auth tokens
* Enforced via backend and Firestore security rules

---

## 5. Data Model

### Users Collection

```json
{
  "uid": "string",
  "email": "string",
  "role": "admin | faculty | student",
  "status": "active | banned",
  "createdAt": "timestamp"
}
```

---

### Resources Collection

```json
{
  "id": "string",
  "title": "string",
  "class": "string",
  "subject": "string",
  "fileUrl": "string",
  "fileSize": "number",
  "uploadedBy": "uid",
  "createdAt": "timestamp"
}
```

---

## 6. Core Workflows

### 6.1 Authentication Flow

1. User logs in via Firebase Authentication
2. JWT token is generated
3. Frontend fetches user role from Firestore
4. User is routed based on role

---

### 6.2 File Upload Flow (Faculty)

```
Client Upload Request
        ↓
Cloud Function Triggered
        ↓
Validate File Type (PDF only)
        ↓
Compress PDF
        ↓
Upload to Cloudinary
        ↓
Store metadata in Firestore
        ↓
Return success response
```

---

### 6.3 Search Flow (Student)

```
User enters query
        ↓
Apply filters (class, subject)
        ↓
Query Firestore (indexed fields)
        ↓
Return paginated results
        ↓
Display results
```

---

### 6.4 Download Flow

```
User clicks download
        ↓
Fetch file URL from Firestore
        ↓
Redirect to Cloudinary CDN
        ↓
File download starts
```

---

## 7. Search Design

### Indexed Fields

* title
* class
* subject

### Query Strategy

* Exact match filters
* Prefix-based search (optional)

### Optimization Techniques

* Composite indexes in Firestore
* Pagination (limit + cursor)
* Debounced input for search

---

## 8. Performance & Scalability

### Target

* Handle ~5000 concurrent users

### Strategies

#### Frontend

* Static Site Generation (SSG)
* CDN caching
* Lazy loading components

#### Backend

* Serverless auto-scaling
* Stateless API design

#### Database

* Firestore auto scaling
* Indexed queries for fast retrieval

#### Storage

* Cloudinary CDN delivery

---

## 9. Rate Limiting & Abuse Prevention

* Limit upload requests per user
* Debounce search queries
* Optional CAPTCHA for uploads

---

## 10. File Handling Strategy

### Constraints

* Only PDF files allowed
* Max file size (e.g., 10MB before compression)

### Compression

* Applied before upload
* Reduces storage usage significantly

---

## 11. Security Design

### Authentication

* Firebase Authentication (JWT-based)

### Authorization

* Role-based access control (RBAC)

### Firestore Security Rules

* Only faculty can upload resources
* Only admin can manage users

### File Validation

* MIME type validation
* File extension check (.pdf)

---

## 12. Failure Handling

| Scenario            | Handling Strategy            |
| ------------------- | ---------------------------- |
| Upload failure      | Retry + error feedback       |
| Compression failure | Reject upload                |
| Storage full        | Block uploads + notify admin |
| Slow queries        | Optimize indexes             |

---

## 13. Monitoring & Logging

* Firebase logs for backend tracking
* Error monitoring tools (optional)
* Basic analytics for usage tracking

---

## 14. Bottlenecks & Tradeoffs

### Bottlenecks

* Limited free storage (~20GB)
* Firestore query limitations
* PDF compression latency

### Tradeoffs

| Decision           | Tradeoff                       |
| ------------------ | ------------------------------ |
| Serverless backend | Less control, more scalability |
| Firestore database | Limited complex querying       |
| Cloudinary storage | External dependency            |

---

## 15. Future Improvements

* Full-text search (Algolia / Meilisearch)
* AI-based recommendations
* Mobile application
* File versioning
* Advanced analytics dashboard

---

## 16. Scaling Beyond MVP

If system grows beyond 5000 users:

* Move to dedicated backend (Node.js + Express)
* Use PostgreSQL for advanced queries
* Use object storage (AWS S3)
* Add caching layer (Redis)

---

## 17. Conclusion

This system design ensures:

* High scalability using serverless architecture
* Efficient storage and delivery of study resources
* Fast and optimized search experience
* Secure role-based access control

It is optimized for **performance, cost-efficiency, and future scalability**.
