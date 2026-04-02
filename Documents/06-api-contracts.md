# 06 — API Contracts

## Version
1.0 — MVP  
Transport: **Firebase HTTPS Callable Cloud Functions**  
Authentication: **Firebase ID Token (Bearer)**

---

## 1. General Conventions

### Request Format (Callable Functions)
```json
{
  "data": { /* function-specific payload */ }
}
```

### Response Format
```json
{
  "data": { /* function-specific response */ }
}
```

### Error Format (Firebase FunctionsError)
```json
{
  "error": {
    "code": "functions/permission-denied",
    "message": "Human-readable error message"
  }
}
```

### Common Error Codes

| Code | Meaning |
|------|---------|
| `functions/unauthenticated` | Missing or invalid auth token |
| `functions/permission-denied` | Authenticated but wrong role |
| `functions/invalid-argument` | Payload validation failed |
| `functions/not-found` | Requested resource does not exist |
| `functions/already-exists` | Conflict (e.g., duplicate) |
| `functions/internal` | Unexpected server error |

---

## 2. Auth Endpoints

> Auth operations (signup, login, logout) are handled directly by the **Firebase Auth SDK** on the frontend. No custom Cloud Functions are required for basic auth.

| Operation | SDK Method |
|-----------|-----------|
| Register | `createUserWithEmailAndPassword(auth, email, password)` |
| Login | `signInWithEmailAndPassword(auth, email, password)` |
| Logout | `signOut(auth)` |
| Get token | `getIdToken(user)` |

After registration, a Cloud Function trigger (`onUserCreate`) writes the initial user document to Firestore.

### Trigger: `onUserCreate`
- **Trigger type**: `functions.auth.user().onCreate()`
- **Behavior**: Creates a `users/{uid}` document with default role `student` and status `active`

---

## 3. Resource Endpoints

### 3.1 `uploadResource`

**Role required**: `faculty`

**Request**
```json
{
  "data": {
    "title": "string (required, max 200 chars)",
    "class": "string (required, max 100 chars)",
    "subject": "string (required, max 100 chars)",
    "fileBase64": "string (required, base64-encoded PDF)",
    "fileSizeBytes": "number (required, original size in bytes)"
  }
}
```

**Validation**
- `fileSizeBytes` must be ≤ 10 485 760 (10 MB)
- `fileBase64` must decode to a valid PDF (MIME check on first bytes)
- All string fields must be non-empty

**Process**
1. Verify token + faculty role
2. Validate payload
3. Decode base64 → Buffer
4. Compress PDF
5. Upload to Cloudinary
6. Write resource document to Firestore

**Response (200)**
```json
{
  "data": {
    "resourceId": "string",
    "fileUrl": "string",
    "fileSize": "number"
  }
}
```

---

### 3.2 `updateResource`

**Role required**: `faculty` (own resources only)

**Request**
```json
{
  "data": {
    "resourceId": "string (required)",
    "title": "string (optional)",
    "class": "string (optional)",
    "subject": "string (optional)"
  }
}
```

**Validation**
- At least one of `title`, `class`, `subject` must be provided
- Caller must be the original uploader

**Response (200)**
```json
{
  "data": {
    "resourceId": "string",
    "updatedAt": "timestamp"
  }
}
```

---

### 3.3 `deleteResource`

**Role required**: `faculty` (own) or `admin` (any)

**Request**
```json
{
  "data": {
    "resourceId": "string (required)"
  }
}
```

**Process**
1. Verify token + role check
2. Fetch resource document → get `cloudinaryPublicId`
3. Delete from Cloudinary
4. Delete from Firestore
5. Write audit log (if admin)

**Response (200)**
```json
{
  "data": {
    "deleted": true,
    "resourceId": "string"
  }
}
```

---

### 3.4 `searchResources`

**Role required**: `student`, `faculty`, or `admin`

**Request**
```json
{
  "data": {
    "query": "string (optional, title prefix search)",
    "class": "string (optional, exact match)",
    "subject": "string (optional, exact match)",
    "cursor": "string (optional, Firestore doc ID for pagination)",
    "limit": "number (optional, default 20, max 50)"
  }
}
```

**Response (200)**
```json
{
  "data": {
    "results": [
      {
        "id": "string",
        "title": "string",
        "class": "string",
        "subject": "string",
        "fileUrl": "string",
        "fileSize": "number",
        "uploaderEmail": "string",
        "createdAt": "timestamp"
      }
    ],
    "nextCursor": "string | null",
    "total": "number (approximate)"
  }
}
```

---

### 3.5 `getFacultyResources`

**Role required**: `faculty`

**Request**
```json
{
  "data": {
    "cursor": "string (optional)",
    "limit": "number (optional, default 20)"
  }
}
```

**Response (200)**
```json
{
  "data": {
    "results": [ /* same shape as searchResources results */ ],
    "nextCursor": "string | null"
  }
}
```

---

## 4. Admin Endpoints

### 4.1 `listUsers`

**Role required**: `admin`

**Request**
```json
{
  "data": {
    "cursor": "string (optional)",
    "limit": "number (optional, default 20)",
    "roleFilter": "admin | faculty | student (optional)",
    "statusFilter": "active | banned (optional)"
  }
}
```

**Response (200)**
```json
{
  "data": {
    "users": [
      {
        "uid": "string",
        "email": "string",
        "role": "string",
        "status": "string",
        "displayName": "string",
        "createdAt": "timestamp"
      }
    ],
    "nextCursor": "string | null"
  }
}
```

---

### 4.2 `updateUserStatus`

**Role required**: `admin`

**Request**
```json
{
  "data": {
    "targetUid": "string (required)",
    "status": "active | banned (required)"
  }
}
```

**Validation**
- Admin cannot update their own status

**Response (200)**
```json
{
  "data": {
    "uid": "string",
    "status": "string",
    "updatedAt": "timestamp"
  }
}
```

---

### 4.3 `updateUserRole`

**Role required**: `admin`

**Request**
```json
{
  "data": {
    "targetUid": "string (required)",
    "role": "admin | faculty | student (required)"
  }
}
```

**Validation**
- Admin cannot change their own role

**Response (200)**
```json
{
  "data": {
    "uid": "string",
    "role": "string",
    "updatedAt": "timestamp"
  }
}
```

---

## 5. Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `uploadResource` | 10 uploads / user / hour |
| `searchResources` | 60 requests / user / minute |
| `deleteResource` | 30 deletes / user / hour |
| Admin endpoints | 100 requests / admin / minute |

Implemented via Firestore counter documents or in-memory rate limiting within Cloud Functions.

---

## 6. Endpoint Summary

| Function | Method | Role |
|----------|--------|------|
| `uploadResource` | HTTPS Callable | faculty |
| `updateResource` | HTTPS Callable | faculty |
| `deleteResource` | HTTPS Callable | faculty, admin |
| `searchResources` | HTTPS Callable | student, faculty, admin |
| `getFacultyResources` | HTTPS Callable | faculty |
| `listUsers` | HTTPS Callable | admin |
| `updateUserStatus` | HTTPS Callable | admin |
| `updateUserRole` | HTTPS Callable | admin |
| `onUserCreate` | Auth Trigger | system |
