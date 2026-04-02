# 01 — Product Requirements Document

## Product Name
**EduResource Hub**

## Version
1.0 — MVP

## Last Updated
2026-03-22

---

## 1. Purpose

EduResource Hub is a centralized web platform that enables faculty to publish academic study materials and students to discover, filter, and download those resources. An admin layer provides governance over users and content.

---

## 2. Goals

| Goal | Description |
|------|-------------|
| Centralized resource access | One place for all class/subject materials |
| Reliable uploads | Faculty can upload, edit, and delete PDFs |
| Fast search | Students find resources in under 1 second |
| Scale | Support up to 5 000 concurrent users |
| Cost efficiency | Operate within free-tier infrastructure limits |

---

## 3. Out of Scope (MVP)

- AI-based content recommendations
- Push notifications
- Mobile native application
- Advanced analytics dashboard
- File versioning

---

## 4. User Roles

### 4.1 Admin
- Single or multiple admin accounts managed manually
- Full read/write access to user records and resource metadata
- Can ban/unban users and delete any resource

### 4.2 Faculty
- Self-register or admin-assigned role
- Upload, edit, and delete own resources
- Cannot manage other users

### 4.3 Student
- Self-register
- Search, filter, and download resources
- Cannot upload or modify resources

---

## 5. Functional Requirements

### 5.1 Authentication
| ID | Requirement |
|----|-------------|
| AUTH-01 | Users can register with email and password |
| AUTH-02 | Users can log in and log out |
| AUTH-03 | Role is assigned at registration or by admin |
| AUTH-04 | Session persists via JWT token |
| AUTH-05 | Unauthenticated users can only view the landing page |

### 5.2 Admin Panel
| ID | Requirement |
|----|-------------|
| ADMIN-01 | View a paginated list of all users |
| ADMIN-02 | Ban or unban a user account |
| ADMIN-03 | Delete any resource from the platform |
| ADMIN-04 | Assign or change a user's role |

### 5.3 Faculty Panel
| ID | Requirement |
|----|-------------|
| FAC-01 | Upload PDF files only (MIME + extension validated) |
| FAC-02 | Provide metadata: title, class, subject |
| FAC-03 | PDF is automatically compressed before storage |
| FAC-04 | Edit metadata of own uploads |
| FAC-05 | Delete own uploads |
| FAC-06 | View a list of own uploads |

### 5.4 Student Panel
| ID | Requirement |
|----|-------------|
| STU-01 | Search resources by title (prefix / keyword) |
| STU-02 | Filter results by class |
| STU-03 | Filter results by subject |
| STU-04 | Results are paginated |
| STU-05 | Download a resource (direct CDN link) |

### 5.5 Landing Page
| ID | Requirement |
|----|-------------|
| LAND-01 | Display product introduction and value proposition |
| LAND-02 | Provide links to Login and Register |

---

## 6. Non-Functional Requirements

| Attribute | Target |
|-----------|--------|
| Concurrency | 5 000 simultaneous users |
| Search latency | < 1 second for typical queries |
| Upload success rate | ≥ 99 % under normal conditions |
| Storage budget | ≤ 20 GB (Cloudinary free tier) |
| Availability | ≥ 99.5 % (Vercel + Firebase SLA) |
| Security | JWT auth, RBAC, MIME validation |

---

## 7. Constraints

- Infrastructure must remain within free tiers (Vercel, Firebase Spark, Cloudinary free)
- Only PDF format accepted for uploads
- Maximum file size before compression: 10 MB

---

## 8. Success Metrics

| Metric | Definition |
|--------|-----------|
| Search response time | P95 < 1 s |
| Upload success rate | > 99 % of valid requests |
| Storage utilization | < 80 % of 20 GB budget |
| Monthly active users | Growing month-over-month |
| Bounce rate on search | Decreasing over time |
