# JobMan — Claude Orientation

## What This Is

JobMan is a personal job search tracker with a Kanban board UI. Users drag job applications through 6 status columns, track details (salary, fit score, recruiter, notes), log interviews with questions, and view analytics across their pipeline. Auth is Google OAuth; sessions are persisted in SQLite.

## Project Structure

```
jobman/
├── backend/
│   ├── server.ts            # Express app factory + production startup
│   ├── db.ts                # better-sqlite3 setup, schema creation
│   ├── validators.ts        # Request field validators (length, substatus rules)
│   ├── db/                  # DB query modules (one per domain)
│   │   ├── jobs.ts
│   │   ├── interviews.ts
│   │   ├── interviewInsights.ts
│   │   ├── radar.ts
│   │   ├── stats.ts
│   │   └── users.ts
│   └── routes/              # Express routers (one per domain)
│       ├── auth.ts          # Google OAuth + session login/logout
│       ├── jobs.ts
│       ├── interviews.ts
│       ├── interviewInsights.ts
│       ├── radar.ts
│       └── stats.ts
└── frontend/
    └── src/
        ├── App.tsx                  # Auth check, routing, global state
        ├── api.ts                   # Fetch wrappers for all API calls
        ├── types.ts                 # All shared types (Job, Interview, Radar, Stats…)
        ├── constants.ts             # STATUSES, FIT_SCORES, color maps
        ├── theme.ts                 # MUI theme
        ├── jobUtils.ts              # Job helper functions
        ├── logoCache.ts             # Company logo URL cache
        ├── useCompanyLogo.ts        # Hook for logo fetch
        └── components/
            ├── AppShell.tsx         # Nav drawer + top bar
            ├── LoginPage.tsx        # Google OAuth login screen
            ├── JobManagementPage.tsx# Kanban board page
            ├── KanbanBoard.tsx      # DnD context, drag overlay
            ├── KanbanColumn.tsx     # Droppable column
            ├── JobCard.tsx          # Draggable card (drag handle only)
            ├── JobDialog.tsx        # Add/edit/delete form modal
            ├── EndingStatusDialog.tsx # Rejected/offer substatus picker
            ├── InterviewsPage.tsx   # Cross-job interviews list
            ├── InterviewsTab.tsx    # Per-job interview list + add form
            ├── QuestionSubView.tsx  # Interview question log
            ├── InsightsPage.tsx     # Interview analytics page
            ├── StatsPage.tsx        # Pipeline stats/charts page
            ├── RadarPage.tsx        # Company re-application radar
            ├── CompanyLogo.tsx      # Company logo image
            ├── DifficultySelector.tsx
            ├── MarkdownField.tsx    # Markdown textarea editor
            ├── MarkdownSnippet.tsx  # Markdown renderer
            ├── Footer.tsx
            ├── insights/            # Chart components for InsightsPage
            └── stats/               # Chart components for StatsPage
```

## Tech Stack

| Layer        | Technology                                          |
|--------------|-----------------------------------------------------|
| Backend      | Node.js + Express 5, `better-sqlite3`               |
| Auth         | Google OAuth 2.0 via Passport.js + express-session  |
| Session store| better-sqlite3-session-store                        |
| Frontend     | React 19, Vite, Material UI v9, react-router-dom v7 |
| Drag & Drop  | @dnd-kit/core                                       |
| TypeScript   | Strict mode, exactOptionalPropertyTypes             |
| Formatter    | Biome                                               |
| Linter       | Oxlint (Rust-based)                                 |

## Commands

```bash
npm run dev          # Start both backend (:3001) and frontend (:5173)
npm run test         # Run all tests (backend + frontend)
npm run lint         # Oxlint check
npm run lint:fix     # Oxlint autofix
npm run format       # Biome format check
npm run format:fix   # Biome format write
npm run tsc          # Type-check all workspaces
npm run install:all  # Install all dependencies (root + backend + frontend)
npm run deploy:backend   # rsync backend source to EC2 and restart via pm2
npm run deploy:frontend  # Build and sync frontend assets to S3/CloudFront
npm run db:pull      # Download production jobman.db to local
npm run db:push      # Overwrite production jobman.db with local copy (prompts for confirmation)
```

Vite proxies `/api/*` → `http://localhost:3001`.

## API Endpoints

All routes except `/api/auth/*` require an active session (`requireAuth` middleware).

| Method | Path                               | Description                        |
|--------|------------------------------------|------------------------------------|
| GET    | /api/auth/me                       | Current user or 401                |
| GET    | /api/auth/google                   | Initiate Google OAuth              |
| GET    | /api/auth/google/callback          | OAuth callback                     |
| POST   | /api/auth/logout                   | Destroy session                    |
| GET    | /api/jobs                          | List jobs (`?view=summary` or `full`) |
| GET    | /api/jobs/:id                      | Fetch single job (full view)       |
| POST   | /api/jobs                          | Create job (201)                   |
| PUT    | /api/jobs/:id                      | Update job                         |
| DELETE | /api/jobs/:id                      | Delete job                         |
| GET    | /api/jobs/:jobId/interviews        | List interviews for a job          |
| POST   | /api/jobs/:jobId/interviews        | Add interview                      |
| PUT    | /api/jobs/:jobId/interviews/:id    | Update interview                   |
| DELETE | /api/jobs/:jobId/interviews/:id    | Delete interview                   |
| GET    | /api/interviews                    | Cross-job interview search         |
| GET    | /api/interview-insights            | Aggregated interview analytics     |
| GET    | /api/stats                         | Pipeline stats (`?window=all`, `90`, or `30`) |
| GET    | /api/radar                         | Company re-application radar       |
| PATCH  | /api/radar/:id                     | Update radar entry (notes, policy) |

## Key Data Model

```typescript
interface Job {
  id: number;
  company: string;              // required
  role: string;                 // required
  link: string;                 // required (URL)
  status: JobStatus;            // 6 Kanban columns
  ending_substatus: EndingSubstatus | null;
  fit_score: FitScore | null;
  salary: string | null;
  date_applied: string | null;
  date_phone_screen: string | null;
  date_last_onsite: string | null;
  date_offer_extended: string | null;
  recruiter: string | null;
  notes?: string | null;        // absent in summary view
  job_description?: string | null; // absent in summary view
  referred_by: string | null;
  tags: JobTag[];
  favorite: boolean;
  created_at: string;
  updated_at: string;
}
```

**JobStatus values:** `"Not started"` | `"Applied"` | `"Phone screen"` | `"Interviewing"` | `"Offer!"` | `"Rejected/Withdrawn"`

**EndingSubstatus:** `"Withdrawn"` | `"Rejected"` | `"Ghosted"` | `"No response"` | `"Job closed"` | `"Not a good fit"` | `"Offer accepted"` | `"Offer declined"`

**JobTag values:** `"remote"` | `"hybrid"` | `"in-office"` | `"high-pay"` | `"faang"` | `"faang-adjacent"` | `"startup"`

## Implementation Notes

- **Auth:** Google OAuth 2.0. Sessions stored in SQLite via better-sqlite3-session-store. All non-auth API routes require `req.session.userId`. CORS is restricted to `FRONTEND_URL` env var (default: `http://localhost:5173`).
- **Optimistic updates:** Favorite toggles and status drag-and-drops update UI immediately, reverting on API error with a Snackbar notification.
- **Drag handle:** Only the `DragIndicatorIcon` on each card is draggable — not the full card — to avoid conflicts with the click-to-edit behavior.
- **Search:** Case-insensitive substring match on company or role, applied before passing jobs to KanbanBoard.
- **Job summary vs full view:** `GET /api/jobs` returns a summary view by default (omits `notes` and `job_description`). Pass `?view=full` or fetch `GET /api/jobs/:id` for the complete record.
- **Schema:** Defined inline in `db.ts` using `CREATE TABLE IF NOT EXISTS`. No migration files.
- **Environment:** Backend reads `.env.development` (or `.env.production`). Required vars: `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`.

## Frontend Unit Test Conventions

- One `.spec.tsx` / `.spec.ts` file per component/module
- Always import Vitest globals explicitly (`describe`, `it`, `expect`, `vi`, `beforeEach`)
- Mock `@dnd-kit/core` and `@dnd-kit/utilities` at the module level — never wrap renders in `<DndContext>`
- `SCREAMING_SNAKE_CASE` for shared fixtures and props (`BASE_JOB`, `DEFAULT_PROPS`, `MOCK_USER`)
- `makeJob(overrides)` factory pattern for per-test job variants; always include all required `Job` fields
- `beforeEach(() => vi.clearAllMocks())` in every top-level `describe`
- `fireEvent` for interactions; MUI `Select` needs a `changeSelect` helper using `mouseDown` + `click`
- Wrap `fireEvent` calls that kick off async state updates (e.g. API calls resolved via `.then(() => setState(...))`) in `await act(async () => { ... })` so the promise chain settles inside the act boundary and doesn't trigger "not wrapped in act" warnings
- For tests that render a component with async data-fetching but only assert the immediate (pre-load) state, mock the fetch as a never-resolving promise (`vi.fn().mockReturnValue(new Promise(() => {}))`) so no state update fires after the synchronous assertion
- Never put a disabled MUI button (or `ToggleButton`) as the direct child of a `Tooltip` — wrap it in a `<span>` instead (e.g. `<Tooltip><span><Button disabled /></span></Tooltip>`). Disabled elements don't fire mouse events, so MUI logs a warning and the tooltip won't work; the `span` absorbs the events. This applies to any element that may be conditionally disabled.
