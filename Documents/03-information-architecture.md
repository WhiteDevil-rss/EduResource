# 03 — Information Architecture

## Version
1.0 — MVP

---

## 1. Site Map

```
/  (Landing Page)
├── /login
├── /register
│
├── /admin                        [Admin only]
│   ├── /admin/users              — User management table
│   └── /admin/resources          — All resources table
│
├── /faculty                      [Faculty only]
│   ├── /faculty/upload           — Upload new resource
│   └── /faculty/resources        — Manage own uploads
│       └── /faculty/resources/[id]/edit
│
└── /student                      [Student only]
    └── /student/search           — Search & download resources
```

---

## 2. Page Inventory

### 2.1 Public Pages

| Route | Page Name | Description |
|-------|-----------|-------------|
| `/` | Landing Page | Product intro, CTA buttons |
| `/login` | Login | Email + password login form |
| `/register` | Register | Registration form with role selector |

### 2.2 Admin Pages

| Route | Page Name | Description |
|-------|-----------|-------------|
| `/admin` | Admin Dashboard | Overview stats, navigation |
| `/admin/users` | User Management | Paginated user list, ban/unban, role change |
| `/admin/resources` | Resource Management | Paginated resource list, delete action |

### 2.3 Faculty Pages

| Route | Page Name | Description |
|-------|-----------|-------------|
| `/faculty` | Faculty Dashboard | Upload summary, quick actions |
| `/faculty/upload` | Upload Resource | File picker + metadata form |
| `/faculty/resources` | My Resources | Own uploads list, edit/delete actions |
| `/faculty/resources/[id]/edit` | Edit Resource | Metadata edit form |

### 2.4 Student Pages

| Route | Page Name | Description |
|-------|-----------|-------------|
| `/student` | Student Dashboard | Search shortcut, recent resources |
| `/student/search` | Search | Search bar, class/subject filters, paginated results |

---

## 3. Navigation Structure

### Global Header (authenticated)
- Platform logo / name → home panel
- User email / avatar
- Logout button

### Admin Sidebar
- Users
- Resources

### Faculty Sidebar
- Upload Resource
- My Resources

### Student Sidebar
- Search Resources

---

## 4. Role-Based Routing

| Condition | Destination |
|-----------|-------------|
| Unauthenticated user visits any protected route | Redirect → `/login` |
| Admin logs in | Redirect → `/admin` |
| Faculty logs in | Redirect → `/faculty` |
| Student logs in | Redirect → `/student` |
| Banned user attempts login | Stay on `/login` with error message |
| User visits route outside their role | Redirect → own home panel |

---

## 5. Component Hierarchy (High Level)

```
<App>
├── <PublicLayout>
│   ├── <LandingPage />
│   ├── <LoginPage />
│   └── <RegisterPage />
│
├── <AdminLayout>         (sidebar + header)
│   ├── <UsersPage />
│   └── <ResourcesPage />
│
├── <FacultyLayout>       (sidebar + header)
│   ├── <UploadPage />
│   └── <MyResourcesPage />
│       └── <EditResourcePage />
│
└── <StudentLayout>       (sidebar + header)
    └── <SearchPage />
```

---

## 6. Key UI Patterns

| Pattern | Usage |
|---------|-------|
| Paginated table | User list (admin), resource list (admin, faculty) |
| Search + filter bar | Student search page |
| Upload form with progress | Faculty upload page |
| Confirmation dialog | Delete / ban actions |
| Role-based redirect | Post-login routing |
| Debounced input | Search query input |
| Inline form errors | Login, register, upload |
| Empty state illustration | No search results, no uploads yet |

---

## 7. Data Flow Summary

```
Student Search Page
  └─ Input (debounced) ──► Cloud Function: searchResources
                                └─ Firestore query (indexed)
                                      └─ Paginated results ──► Resource Cards
                                                                    └─ Download → Cloudinary CDN

Faculty Upload Page
  └─ File + Metadata ──► Cloud Function: uploadResource
                              └─ Validate PDF
                                    └─ Compress
                                          └─ Store in Cloudinary
                                                └─ Save metadata in Firestore

Admin Users Page
  └─ Load users ──► Cloud Function: listUsers
  └─ Ban action ──► Cloud Function: updateUserStatus
  └─ Role change ──► Cloud Function: updateUserRole
```
