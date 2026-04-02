# 05 — Database Schema

## Version
1.0 — MVP  
Database: **Firebase Firestore (NoSQL)**

---

## 1. Collections Overview

| Collection | Purpose |
|------------|---------|
| `users` | Stores user profile, role, and status |
| `resources` | Stores resource metadata (PDF info, owner) |
| `auditLogs` | Tracks admin actions (ban, role change, delete) |

---

## 2. Collection: `users`

### Document ID
`uid` — Firebase Auth UID (string)

### Schema

```json
{
  "uid": "string",               // Firebase Auth UID (same as doc ID)
  "email": "string",             // User email address
  "role": "admin | faculty | student",
  "status": "active | banned",
  "displayName": "string",       // Optional full name
  "createdAt": "timestamp",      // Firestore server timestamp
  "updatedAt": "timestamp"       // Last profile change
}
```

### Field Constraints

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| uid | string | ✅ | Matches Firebase Auth UID |
| email | string | ✅ | Unique; enforced by Firebase Auth |
| role | string | ✅ | Enum: admin, faculty, student |
| status | string | ✅ | Enum: active, banned |
| displayName | string | ❌ | Optional |
| createdAt | timestamp | ✅ | Set on document creation |
| updatedAt | timestamp | ✅ | Updated on any change |

### Indexes

| Type | Field(s) |
|------|---------|
| Single | `role` |
| Single | `status` |
| Composite | `role` + `createdAt` (for admin listing) |

---

## 3. Collection: `resources`

### Document ID
Auto-generated Firestore document ID

### Schema

```json
{
  "id": "string",                // Auto-generated document ID
  "title": "string",             // Resource title
  "class": "string",             // e.g., "10th Grade", "B.Tech Sem 3"
  "subject": "string",           // e.g., "Mathematics", "Data Structures"
  "fileUrl": "string",           // Cloudinary CDN URL (compressed PDF)
  "cloudinaryPublicId": "string",// Cloudinary public_id for deletion
  "fileSize": "number",          // Size in bytes (post-compression)
  "originalFileSize": "number",  // Size in bytes (pre-compression)
  "uploadedBy": "string",        // UID of faculty who uploaded
  "uploaderEmail": "string",     // Denormalized for display
  "createdAt": "timestamp",      // Upload timestamp
  "updatedAt": "timestamp"       // Last metadata edit timestamp
}
```

### Field Constraints

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string | ✅ | Auto-set from doc ID |
| title | string | ✅ | Max 200 characters |
| class | string | ✅ | Max 100 characters |
| subject | string | ✅ | Max 100 characters |
| fileUrl | string | ✅ | Valid HTTPS URL |
| cloudinaryPublicId | string | ✅ | Used for deletion via Cloudinary API |
| fileSize | number | ✅ | In bytes |
| originalFileSize | number | ✅ | In bytes |
| uploadedBy | string | ✅ | References `users.uid` |
| uploaderEmail | string | ✅ | Denormalized for list views |
| createdAt | timestamp | ✅ | Server timestamp |
| updatedAt | timestamp | ✅ | Server timestamp |

### Indexes

| Type | Field(s) | Purpose |
|------|---------|---------|
| Single | `title` | Title search |
| Single | `class` | Class filter |
| Single | `subject` | Subject filter |
| Single | `uploadedBy` | Faculty's own resources |
| Composite | `class` + `subject` + `createdAt` | Combined filter + sort |
| Composite | `uploadedBy` + `createdAt` | Faculty uploads list |

---

## 4. Collection: `auditLogs`

### Document ID
Auto-generated Firestore document ID

### Schema

```json
{
  "id": "string",                // Auto-generated
  "action": "string",            // e.g., "BAN_USER", "CHANGE_ROLE", "DELETE_RESOURCE"
  "performedBy": "string",       // Admin UID
  "targetId": "string",          // UID of affected user or resource ID
  "targetType": "user | resource",
  "details": {
    "previousValue": "any",      // e.g., previous role or status
    "newValue": "any"            // e.g., new role or status
  },
  "createdAt": "timestamp"
}
```

### Supported Action Values

| Action | Target Type | Description |
|--------|-------------|-------------|
| `BAN_USER` | user | Admin banned a user |
| `UNBAN_USER` | user | Admin unbanned a user |
| `CHANGE_ROLE` | user | Admin changed a user's role |
| `DELETE_RESOURCE` | resource | Admin deleted a resource |

---

## 5. Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function getRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }

    function isAdmin() {
      return isAuthenticated() && getRole() == 'admin';
    }

    function isFaculty() {
      return isAuthenticated() && getRole() == 'faculty';
    }

    function isStudent() {
      return isAuthenticated() && getRole() == 'student';
    }

    // Users collection
    match /users/{uid} {
      allow read: if isAdmin() || request.auth.uid == uid;
      allow write: if isAdmin();
      allow create: if request.auth.uid == uid; // self-registration
    }

    // Resources collection
    match /resources/{resourceId} {
      allow read: if isAuthenticated();
      allow create: if isFaculty();
      allow update: if isFaculty() && resource.data.uploadedBy == request.auth.uid;
      allow delete: if isAdmin()
                    || (isFaculty() && resource.data.uploadedBy == request.auth.uid);
    }

    // Audit logs: admin read only, server write only
    match /auditLogs/{logId} {
      allow read: if isAdmin();
      allow write: if false; // only Cloud Functions write here
    }
  }
}
```

---

## 6. Data Relationships

```
users (1) ──────────────────── (many) resources
  uid                                uploadedBy (FK → users.uid)

users (1) ──────────────────── (many) auditLogs [as performer]
  uid                                performedBy (FK → users.uid)

resources (1) ─────────────── (many) auditLogs [as target]
  id                                 targetId (FK → resources.id)
```

---

## 7. Query Patterns

| Use Case | Query |
|----------|-------|
| Student searches by title | `where('title', '>=', q).where('title', '<=', q + '\uf8ff')` |
| Student filters by class | `where('class', '==', selectedClass)` |
| Student filters by subject | `where('subject', '==', selectedSubject)` |
| Student combined filter | `where('class', '==', c).where('subject', '==', s).orderBy('createdAt', 'desc')` |
| Faculty views own resources | `where('uploadedBy', '==', uid).orderBy('createdAt', 'desc')` |
| Admin views all users | `collection('users').orderBy('createdAt', 'desc').limit(20)` |
| Pagination | `.startAfter(lastDoc).limit(20)` |
