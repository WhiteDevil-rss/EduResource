# 12 — Testing Strategy

## Version
1.0 — MVP

---

## 1. Testing Philosophy

Testing for EduResource Hub follows the **Testing Pyramid**:

```
         /\
        /  \        E2E Tests (few, critical paths)
       /----\
      /      \      Integration Tests (key workflows)
     /--------\
    /          \    Unit Tests (many, fast, isolated)
   /____________\
```

- **Unit tests** cover pure logic: validators, compression helpers, scoring functions, utility functions
- **Integration tests** cover Cloud Functions end-to-end with Firebase Emulators
- **E2E tests** cover the critical user flows via browser automation

---

## 2. Test Stack

| Layer | Tool |
|-------|------|
| Unit (frontend) | Jest + React Testing Library |
| Unit (functions) | Jest |
| Integration (functions) | Jest + Firebase Emulator Suite |
| E2E | Playwright |
| Coverage reporting | Jest coverage (`--coverage`) |

---

## 3. Unit Tests

### 3.1 Frontend Units

**Location**: `apps/web/src/**/__tests__/` or `*.test.ts(x)` files

| Module | Tests |
|--------|-------|
| `lib/utils/validators.ts` | Valid/invalid email, PDF MIME type, file size limits |
| `lib/utils/formatBytes.ts` | Byte formatting edge cases (0, 1023, 1024, 1 MB, 1 GB) |
| `lib/utils/debounce.ts` | Debounce timing |
| `components/search/SearchBar` | Renders, fires onChange, debounces input |
| `components/resources/ResourceCard` | Renders title, class, subject, download link |
| `contexts/AuthContext` | Provides user, loading state, role |
| Relevance scoring (`scoreResource`) | Exact match, prefix, substring, filter boosts |

**Example: validator test**
```typescript
describe('validatePDF', () => {
  it('accepts valid PDF MIME type', () => {
    expect(validateFileType('application/pdf')).toBe(true);
  });
  it('rejects non-PDF MIME type', () => {
    expect(validateFileType('image/png')).toBe(false);
  });
  it('rejects files over 10MB', () => {
    expect(validateFileSize(10 * 1024 * 1024 + 1)).toBe(false);
  });
  it('accepts files exactly at 10MB', () => {
    expect(validateFileSize(10 * 1024 * 1024)).toBe(true);
  });
});
```

---

### 3.2 Functions Units

**Location**: `firebase-functions/src/**/__tests__/`

| Module | Tests |
|--------|-------|
| `middleware/validatePayload.ts` | Missing required fields, type mismatches |
| `services/pdfCompressor.ts` | Compresses valid PDF, rejects invalid buffer |
| `services/auditLogger.ts` | Constructs correct log document |
| `services/cloudinary.ts` | Upload returns URL, deletion uses correct public_id |

---

## 4. Integration Tests

**Location**: `firebase-functions/src/**/*.integration.test.ts`  
**Environment**: Firebase Emulator Suite (Firestore + Auth + Functions)

### Test Setup

```typescript
// jest.config.integration.ts
export default {
  testMatch: ['**/*.integration.test.ts'],
  globalSetup: './test/setup/startEmulators.ts',
  globalTeardown: './test/setup/stopEmulators.ts',
};
```

### Test Suites

#### Auth Integration

| Test | Expected Result |
|------|----------------|
| New user registration creates Firestore document | `users/{uid}` document exists with role `student` |
| Banned user cannot invoke callable functions | Returns `functions/permission-denied` |

#### Upload Integration

| Test | Expected Result |
|------|----------------|
| Faculty uploads valid PDF | Firestore resource doc created, Cloudinary URL stored |
| Student attempts upload | Returns `functions/permission-denied` |
| File exceeds 10 MB | Returns `functions/invalid-argument` |
| Non-PDF file uploaded | Returns `functions/invalid-argument` |
| Cloudinary failure mid-upload | No Firestore doc created (rollback verified) |

#### Search Integration

| Test | Expected Result |
|------|----------------|
| Prefix search returns matching titles | Results contain prefix-matched items |
| Class filter returns correct subset | All results have matching class |
| Combined filter returns intersection | All results match class AND subject |
| Cursor pagination returns correct page | Second page does not overlap first |
| Empty query returns all results | Results up to `limit` returned |

#### Admin Integration

| Test | Expected Result |
|------|----------------|
| Admin bans user | `users/{uid}.status` = `banned`, auditLog entry created |
| Admin unbans user | `users/{uid}.status` = `active`, auditLog entry created |
| Admin changes role | `users/{uid}.role` updated, auditLog entry created |
| Admin deletes resource | Firestore + Cloudinary records removed |
| Admin cannot ban self | Returns `functions/invalid-argument` |

---

## 5. E2E Tests

**Location**: `apps/web/e2e/`  
**Tool**: Playwright  
**Environment**: Against a dedicated staging Firebase project (or emulators)

### Critical Paths

| Flow | Steps |
|------|-------|
| **Student Registration & Search** | Visit `/register` → Fill form → Submit → Redirected to `/student` → Enter search query → See results → Click download |
| **Faculty Upload** | Login as faculty → Navigate to Upload → Fill form + attach PDF → Submit → See resource in My Resources list |
| **Admin Ban User** | Login as admin → Navigate to Users → Click Ban on a user → Confirm dialog → User status shows "Banned" |
| **Auth Guard** | Visit `/admin` without login → Redirected to `/login` |
| **Role Guard** | Login as student → Manually visit `/admin` → Redirected to `/student` |

### Example Playwright Test

```typescript
test('student can search and see results', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'student@test.com');
  await page.fill('[data-testid="password"]', 'password123');
  await page.click('[data-testid="login-btn"]');

  await page.waitForURL('/student');
  await page.goto('/student/search');

  await page.fill('[data-testid="search-input"]', 'calculus');
  await page.waitForSelector('[data-testid="resource-card"]');

  const cards = page.locator('[data-testid="resource-card"]');
  await expect(cards).toHaveCountGreaterThan(0);
});
```

---

## 6. Test Data Strategy

### Seed Data

A seed script creates test users and resources in the Firestore emulator before integration and E2E tests run.

**Seed accounts:**

| Email | Role | Status |
|-------|------|--------|
| `admin@test.com` | admin | active |
| `faculty@test.com` | faculty | active |
| `student@test.com` | student | active |
| `banned@test.com` | student | banned |

**Seed resources:**

10 pre-seeded resource documents across 3 classes and 4 subjects for search testing.

---

## 7. Coverage Targets

| Layer | Target |
|-------|--------|
| Unit (functions) | ≥ 80 % line coverage |
| Unit (frontend utils) | ≥ 80 % line coverage |
| Integration | All critical Cloud Functions covered |
| E2E | All 5 critical user paths covered |

---

## 8. Test Commands

```bash
# Run all unit tests
npm run test

# Run unit tests with coverage
npm run test -- --coverage

# Run integration tests (requires emulators)
npm run test:integration --workspace=functions

# Run E2E tests (requires running dev server)
npm run test:e2e --workspace=apps/web

# Run Playwright UI mode (interactive)
npx playwright test --ui
```

---

## 9. Testing in CI

| Pipeline stage | Tests run |
|---------------|-----------|
| PR to `develop` | Unit tests + linting |
| PR to `main` | Unit + integration tests |
| Merge to `main` | Unit + integration + E2E (against staging) |
| Nightly | Full suite including load check |

---

## 10. Known Limitations (MVP)

| Limitation | Plan |
|-----------|------|
| Cloudinary calls are mocked in integration tests | Use Cloudinary staging account in E2E |
| No visual regression testing | Add Percy / Chromatic post-MVP |
| No performance / load testing | Add k6 load test script in v1.1 |
