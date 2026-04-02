# Product Requirements Document

## Product Name
EduResource Hub

---

## Objective
Provide a centralized platform for students to access study resources uploaded by faculty.

---

## Users

### Admin
- Manage users
- Control platform

### Faculty
- Upload/manage study resources

### Student
- Search and download resources

---

## Features

### Landing Page
- Introduction
- Login/Register

---

### Admin Panel
- View users
- Ban/unban users
- Delete resources

---

### Faculty Panel
- Upload PDFs only
- Auto compression
- Manage uploads

---

### Student Panel
- Search by:
  - Name
  - Class
  - Subject
- Apply filters
- Download resources

---

## Functional Requirements

| Feature | Requirement |
|--------|------------|
| Auth | Secure login system |
| Upload | PDF only |
| Compression | Required before storage |
| Search | Fast (<1s) |
| Concurrency | 5000 users |

---

## Constraints
- Free storage (~20GB)
- Minimal infrastructure cost

---

## Success Metrics
- Fast search response
- High upload success rate
- Low storage usage
- Active users growth