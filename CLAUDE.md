# JobMan — Claude Orientation

## What This Is

JobMan is a personal job search tracker with a Kanban board UI. Users drag job applications through 6 status columns, track details (salary, fit score, recruiter, notes), and search/filter their pipeline.

## Project Structure

```
jobman/
├── backend/
│   ├── server.ts       # Express API (port 3001)
│   └── db.ts           # SQLite setup (node:sqlite built-in)
├── frontend/
│   └── src/
│       ├── App.tsx             # Root: state, search, dialog control
│       ├── api.ts              # Fetch wrappers for all API calls
│       ├── types.ts            # Job, JobFormData, JobStatus, FitScore
│       ├── constants.ts        # STATUSES, FIT_SCORES, color maps
│       └── components/
│           ├── KanbanBoard.tsx # DnD context, drag overlay
│           ├── KanbanColumn.tsx# Droppable column
│           ├── JobCard.tsx     # Draggable card (drag handle only)
│           └── JobDialog.tsx   # Add/edit/delete form modal
├── biome.json          # Formatter (formatting only, linting off)
├── oxlint.json         # Linter (react + typescript plugins)
└── package.json        # Root scripts
```

## Tech Stack

| Layer      | Technology                                  |
|------------|---------------------------------------------|
| Backend    | Node.js + Express, `node:sqlite` (built-in) |
| Frontend   | React 18, Vite, Material UI v5              |
| Drag & Drop| @dnd-kit/core                               |
| TypeScript | Strict mode, exactOptionalPropertyTypes     |
| Formatter  | Biome                                       |
| Linter     | Oxlint (Rust-based)                         |

## Commands

```bash
npm run dev          # Start both backend (:3001) and frontend (:5173)
npm run install:all  # Install all dependencies (root + backend + frontend)
npm run lint         # Oxlint check
npm run format       # Biome format
```

Vite proxies `/api/*` → `http://localhost:3001`.

## API Endpoints

| Method | Path           | Description          |
|--------|----------------|----------------------|
| GET    | /api/jobs      | Fetch all jobs       |
| POST   | /api/jobs      | Create job (201)     |
| PUT    | /api/jobs/:id  | Update job           |
| DELETE | /api/jobs/:id  | Delete job           |

## Key Data Model

```typescript
interface Job {
  id: number;
  company: string;           // required
  role: string;              // required
  link: string;              // required (URL)
  status: JobStatus;         // 6 Kanban columns
  fit_score: FitScore | null;
  salary: string | null;
  date_applied: string | null;
  recruiter: string | null;
  notes: string | null;
  referred_by: string | null; // name of the person who referred you
  favorite: number;          // SQLite 0/1 boolean
  created_at: string;
}
```

**JobStatus values:** `"Not started"` | `"Resume submitted"` | `"Initial interview"` | `"Final round interview"` | `"Offer!"` | `"Rejected/Withdrawn"`

**SQLite boolean note:** `favorite` is stored as 0/1. The API's `toClient()` helper converts it to `true`/`false` before returning JSON.

## Implementation Notes

- **Optimistic updates:** Favorite toggles and status drag-and-drops update UI immediately, reverting on API error with a Snackbar notification.
- **Drag handle:** Only the `DragIndicatorIcon` on each card is draggable — not the full card — to avoid conflicts with the click-to-edit behavior.
- **Search:** Case-insensitive substring match on company or role, applied before passing jobs to KanbanBoard.
- **No tests:** No testing framework is set up.
- **No migrations:** Schema is defined inline in `db.ts` and auto-created on server start.
- **CORS:** Open to all origins (dev convenience).
