# 08 — Search & Scoring Engine Spec

## Version
1.0 — MVP

---

## 1. Overview

The search engine powers the **Student Panel's** resource discovery experience. It must return relevant results in under 1 second for typical queries. This document defines the query strategy, relevance scoring logic, filter behavior, and pagination protocol used in `searchResources`.

---

## 2. Search Input Model

```typescript
interface SearchInput {
  query?: string;        // Free-text title search (optional)
  class?: string;        // Exact match filter (optional)
  subject?: string;      // Exact match filter (optional)
  cursor?: string;       // Firestore doc ID for cursor-based pagination
  limit?: number;        // Default: 20, Max: 50
  sortBy?: 'relevance' | 'newest' | 'oldest';  // Default: 'newest'
}
```

---

## 3. Query Strategy (MVP — Firestore Native)

Firestore does not support full-text search natively. The MVP uses a **prefix-range query** on the `title` field, combined with optional equality filters on `class` and `subject`.

### 3.1 Title Prefix Search

```typescript
// Prefix match: find all titles starting with `query`
const end = query.slice(0, -1) + String.fromCharCode(query.charCodeAt(query.length - 1) + 1);

firestore.collection('resources')
  .where('title', '>=', query)
  .where('title', '<=', end)
```

**Limitation**: Case-sensitive. Normalize both stored titles and queries to lowercase at write and read time.

### 3.2 Filter-Only Search (no text query)

When no `query` is provided, the search returns all resources matching the active filters, ordered by `createdAt` descending.

```typescript
let q = firestore.collection('resources').orderBy('createdAt', 'desc');
if (class) q = q.where('class', '==', class);
if (subject) q = q.where('subject', '==', subject);
```

### 3.3 Combined Query (text + filters)

Firestore requires a composite index for multi-field queries. The following combination is supported:

| text query | class filter | subject filter | Index required |
|------------|-------------|----------------|----------------|
| ✅ | ❌ | ❌ | `title` (single) |
| ❌ | ✅ | ❌ | `class + createdAt` (composite) |
| ❌ | ❌ | ✅ | `subject + createdAt` (composite) |
| ❌ | ✅ | ✅ | `class + subject + createdAt` (composite) |
| ✅ | ✅ | ❌ | `title + class` (composite) |
| ✅ | ❌ | ✅ | `title + subject` (composite) |
| ✅ | ✅ | ✅ | `title + class + subject` (composite) |

All required composite indexes are defined in `firestore/firestore.indexes.json`.

---

## 4. Relevance Scoring (Post-MVP / Client-Side Boost)

For MVP, results are ordered by `createdAt` descending (newest first).

A lightweight relevance boost can be applied **client-side** when a `query` is present:

### 4.1 Scoring Rules

| Signal | Score Boost |
|--------|------------|
| Exact title match (case-insensitive) | +100 |
| Title starts with query | +50 |
| Title contains query (substring) | +25 |
| Subject matches active filter | +10 |
| Class matches active filter | +10 |
| Recency (within 30 days) | +5 |

### 4.2 Scoring Implementation

```typescript
function scoreResource(resource: Resource, query: string, filters: Filters): number {
  let score = 0;
  const q = query.toLowerCase();
  const title = resource.title.toLowerCase();

  if (title === q) score += 100;
  else if (title.startsWith(q)) score += 50;
  else if (title.includes(q)) score += 25;

  if (filters.subject && resource.subject === filters.subject) score += 10;
  if (filters.class && resource.class === filters.class) score += 10;

  const ageMs = Date.now() - resource.createdAt.getTime();
  if (ageMs < 30 * 24 * 60 * 60 * 1000) score += 5;

  return score;
}
```

Results are sorted by `score` descending before rendering.

---

## 5. Pagination Protocol

Cursor-based pagination is used to avoid offset inefficiency at scale.

### 5.1 First Page Request

```json
{
  "data": {
    "query": "calculus",
    "class": "12th Grade",
    "limit": 20
  }
}
```

### 5.2 First Page Response

```json
{
  "data": {
    "results": [ /* 20 items */ ],
    "nextCursor": "doc_id_of_last_item",
    "hasMore": true
  }
}
```

### 5.3 Next Page Request

```json
{
  "data": {
    "query": "calculus",
    "class": "12th Grade",
    "limit": 20,
    "cursor": "doc_id_of_last_item"
  }
}
```

### 5.4 Server Implementation

```typescript
let q = buildBaseQuery(params);
if (cursor) {
  const cursorDoc = await firestore.collection('resources').doc(cursor).get();
  q = q.startAfter(cursorDoc);
}
q = q.limit(limit + 1); // fetch one extra to detect hasMore

const docs = await q.get();
const hasMore = docs.size > limit;
const results = docs.docs.slice(0, limit).map(d => ({ id: d.id, ...d.data() }));
const nextCursor = hasMore ? results[results.length - 1].id : null;
```

---

## 6. Input Normalization

All text comparisons are normalized to avoid case mismatch issues.

| Operation | Normalization |
|-----------|--------------|
| Store title | Stored as-is + store `titleLower` field |
| Query input | `.toLowerCase().trim()` |
| Class/Subject | Stored as canonical values; UI uses dropdowns |

### Extra field in Firestore resource document:
```json
{
  "titleLower": "string"  // lowercase version of title for prefix queries
}
```

---

## 7. Debounce Strategy (Frontend)

Search queries are debounced to avoid excessive Cloud Function calls.

```typescript
const DEBOUNCE_MS = 300;

useEffect(() => {
  const handler = setTimeout(() => {
    if (query.trim().length >= 2) {
      triggerSearch(query, filters);
    }
  }, DEBOUNCE_MS);
  return () => clearTimeout(handler);
}, [query, filters]);
```

- Minimum query length: **2 characters**
- Debounce window: **300 ms**

---

## 8. Future: Full-Text Search (Post-MVP)

When Firestore's prefix search becomes insufficient:

| Option | Notes |
|--------|-------|
| **Algolia** | Managed, instant search, generous free tier |
| **Meilisearch** | Self-hosted, fast, typo-tolerant |
| **Typesense** | Open source, strong relevance tuning |

Migration path: sync Firestore writes to the search index via a Cloud Function trigger on `onCreate` / `onUpdate` / `onDelete` in the `resources` collection.
