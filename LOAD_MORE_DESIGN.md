# Load More — Engineering Design

## Context

The Interviews page (`/interviews`) shows all interviews in the user's selected date range in a single request. For users with many scheduled interviews, or who want to browse beyond their default "this week and next week" window, a **Load More** pattern makes exploration natural without requiring manual date edits.

---

## API Design

### Extend `GET /api/interviews`

The existing endpoint already supports `?from` and `?to` date range params. Two new **cursor pagination** params are added:

| Param   | Type            | Meaning                                                   |
|---------|-----------------|-----------------------------------------------------------|
| `after` | ISO 8601 string | Return interviews with `interview_dttm` **strictly after** this value |
| `limit` | integer 1–50    | Cap the number of results returned. Defaults to 10.       |

These are independent of `from`/`to`. Two call modes:

| Mode         | Params used           | Semantics                              |
|--------------|-----------------------|----------------------------------------|
| Initial load | `from`, `to`          | Date-range query — unchanged behavior  |
| Load More    | `after`, `limit`      | Cursor page — next N after last shown  |

### Why `after` instead of reusing `from`

`from` is an **inclusive** lower bound (`>=`). A cursor must be **exclusive** (`>`) so the last visible row isn't repeated. Changing `from`'s semantics would be a silent breaking change. A separate `after` param avoids any ambiguity.

### Response shape

Same flat `EnrichedInterview[]` as today — no wrapper object. The client detects "no more results" by checking `response.length < PAGE_SIZE`. If `response.length === 0`, there are definitively no more interviews.

### Error responses

| Condition                      | Status | Error message               |
|-------------------------------|--------|-----------------------------|
| `after` is not a valid date   | 400    | `"Invalid 'after' date"`    |
| `limit` is not 1–50           | 400    | `"Invalid 'limit' value"`   |

---

## Backend Implementation

### `backend/db/interviews.ts`

New exported function alongside the existing `listEnrichedInterviews`:

```typescript
export function listEnrichedInterviewsAfter(
  db: Database.Database,
  userId: number,
  after: string,   // exclusive lower bound on interview_dttm
  limit: number,
): EnrichedInterviewRow[]
```

SQL:
```sql
SELECT i.id, i.job_id, i.interview_type, i.interview_dttm,
       i.interview_interviewers, i.interview_vibe, i.interview_notes,
       j.company, j.role, j.link
FROM interviews i
JOIN jobs j ON j.id = i.job_id
WHERE j.user_id = ? AND i.interview_dttm > ?
ORDER BY i.interview_dttm ASC
LIMIT ?
```

### `backend/routes/interviews.ts`

`createInterviewSearchRouter`'s `GET /` handler branches on whether `after` is present:

- If `after` is provided → validate, parse `limit` (default 10, max 50), call `listEnrichedInterviewsAfter`
- Otherwise → existing `from`/`to` logic unchanged

`PAGE_SIZE = 10` is defined as a constant at the top of the file.

---

## Frontend Implementation

### `frontend/src/api.ts`

New method `loadMoreInterviews(after, limit?)` separate from `searchInterviews`:

```typescript
loadMoreInterviews: (after: string, limit = 10) =>
  request<EnrichedInterview[]>(
    `/interviews?${new URLSearchParams({ after, limit: String(limit) })}`
  ),
```

### `frontend/src/components/InterviewsPage.tsx`

New state: `loadingMore`, `reachedEnd`, `snack` (Snackbar).

**Load More button** appears at the bottom of the list when interviews exist and `reachedEnd` is false. While loading it shows a spinner. Once `reachedEnd` is true it shows disabled text "End of scheduled interviews."

**Snackbar toasts:**
- Success: `"Loaded N new interview(s)"`
- No more: `"No more interviews scheduled"` (info severity)
- Error: `"Failed to load more interviews"` (error severity)

**Filter change resets** `reachedEnd` to false so Load More reappears for the new range.

---

## Out of Scope

- Backward cursor (Load Previous)
- Infinite scroll / intersection observer
- Server-sent events or polling for new interviews
- Persisting pagination state across page navigations
