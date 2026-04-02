# 02 — User Stories & Acceptance Criteria

## Version
1.0 — MVP

---

## 1. Authentication

### US-AUTH-01 — Register
**As a** new visitor,  
**I want to** create an account with my email and password,  
**So that** I can access the platform.

**Acceptance Criteria**
- [ ] Registration form requires: email, password, role selection (student / faculty)
- [ ] Email must be unique; duplicate triggers a clear error message
- [ ] Password minimum 8 characters
- [ ] On success, user is redirected to the appropriate panel
- [ ] On failure, a descriptive inline error is shown

---

### US-AUTH-02 — Login
**As a** registered user,  
**I want to** log in with my credentials,  
**So that** I can access my role-specific panel.

**Acceptance Criteria**
- [ ] Login form accepts email + password
- [ ] Invalid credentials show a non-specific error ("Email or password is incorrect")
- [ ] Banned users see a "Your account has been suspended" message
- [ ] Successful login redirects based on role (admin / faculty / student)
- [ ] JWT session persists across page refreshes

---

### US-AUTH-03 — Logout
**As a** logged-in user,  
**I want to** log out,  
**So that** my session is terminated securely.

**Acceptance Criteria**
- [ ] Logout button is accessible from all panels
- [ ] Session token is invalidated on logout
- [ ] User is redirected to the landing page

---

## 2. Admin

### US-ADMIN-01 — View Users
**As an** admin,  
**I want to** view all registered users,  
**So that** I can monitor platform membership.

**Acceptance Criteria**
- [ ] Paginated list shows: email, role, status, created date
- [ ] Minimum 20 records per page
- [ ] Loading state shown while fetching

---

### US-ADMIN-02 — Ban/Unban User
**As an** admin,  
**I want to** ban or unban a user account,  
**So that** I can enforce platform policies.

**Acceptance Criteria**
- [ ] Each user row has a Ban / Unban toggle
- [ ] Banned users cannot log in
- [ ] Status change reflects immediately in the list
- [ ] Admin cannot ban their own account

---

### US-ADMIN-03 — Delete Resource
**As an** admin,  
**I want to** delete any resource,  
**So that** I can remove inappropriate or incorrect content.

**Acceptance Criteria**
- [ ] Delete action requires a confirmation dialog
- [ ] Resource is removed from Firestore and Cloudinary
- [ ] Deleted resource no longer appears in student search

---

### US-ADMIN-04 — Assign Role
**As an** admin,  
**I want to** change a user's role,  
**So that** I can promote a student to faculty or vice versa.

**Acceptance Criteria**
- [ ] Role dropdown available on each user row
- [ ] Change takes effect on the user's next login
- [ ] Audit trail entry created in Firestore

---

## 3. Faculty

### US-FAC-01 — Upload Resource
**As a** faculty member,  
**I want to** upload a PDF with metadata,  
**So that** students can find and download it.

**Acceptance Criteria**
- [ ] Upload form requires: title, class, subject, PDF file
- [ ] Only `.pdf` MIME type accepted; other types show an error
- [ ] File size limit enforced at 10 MB pre-compression
- [ ] Progress indicator shown during upload
- [ ] On success, resource appears in faculty's upload list

---

### US-FAC-02 — Auto Compression
**As a** faculty member,  
**I want** my PDF to be automatically compressed before storage,  
**So that** storage usage remains low.

**Acceptance Criteria**
- [ ] Compression is transparent to the user
- [ ] Compressed file is stored; original is discarded
- [ ] If compression fails, upload is rejected with an error message
- [ ] Compressed file is still renderable and downloadable

---

### US-FAC-03 — Edit Resource Metadata
**As a** faculty member,  
**I want to** edit the title, class, or subject of my uploads,  
**So that** I can correct mistakes.

**Acceptance Criteria**
- [ ] Edit form pre-fills current metadata values
- [ ] Only title, class, and subject are editable (file cannot be replaced)
- [ ] Changes are persisted in Firestore immediately
- [ ] Updated metadata appears in student search results

---

### US-FAC-04 — Delete Own Resource
**As a** faculty member,  
**I want to** delete my own uploads,  
**So that** I can remove outdated materials.

**Acceptance Criteria**
- [ ] Delete requires a confirmation dialog
- [ ] Both Cloudinary file and Firestore record are deleted
- [ ] Resource no longer appears in student search

---

## 4. Student

### US-STU-01 — Search Resources
**As a** student,  
**I want to** search resources by title,  
**So that** I can find specific study materials quickly.

**Acceptance Criteria**
- [ ] Search input triggers query on debounce (≥ 300 ms)
- [ ] Results returned in < 1 second for typical queries
- [ ] Displays: title, class, subject, upload date
- [ ] Empty state shown when no results found

---

### US-STU-02 — Filter Resources
**As a** student,  
**I want to** filter results by class and subject,  
**So that** I can narrow down relevant resources.

**Acceptance Criteria**
- [ ] Class and subject dropdowns are populated from available values
- [ ] Filters can be combined with keyword search
- [ ] Clearing a filter restores the full result set
- [ ] Active filters are visually indicated

---

### US-STU-03 — Download Resource
**As a** student,  
**I want to** download a PDF,  
**So that** I can study offline.

**Acceptance Criteria**
- [ ] Download button is visible on each result card
- [ ] Clicking triggers a direct download from Cloudinary CDN
- [ ] Download does not require additional authentication steps
- [ ] File is a valid, readable PDF
