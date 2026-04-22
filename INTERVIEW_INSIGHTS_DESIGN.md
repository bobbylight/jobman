# Interview Insights Page — Engineering Design

## Context

JobMan already tracks rich per-interview metadata (`interview_type`, `interview_vibe`, `interview_result`,
`interview_feeling`) and a separate `interview_questions` table with per-question `question_type`,
`question_text`, `question_notes`, and `difficulty`. None of this data surfaces anywhere beyond the
calendar view today.

This page mines that data for patterns: which interview types you pass vs. fail, whether your gut-feel
is a reliable predictor of outcome, what question difficulties you're seeing, and which types of
questions you struggle with. It lives at `/insights` alongside `/calendar` and `/stats`.

---

## Existing Data Model (relevant fields)

### `interviews` table
| Column | Type | Values |
|---|---|---|
| `interview_stage` | text | `phone_screen`, `onsite` |
| `interview_type` | text | `behavioral`, `coding`, `system_design`, `leadership`, `past_experience`, `culture_fit` |
| `interview_vibe` | text | `casual`, `intense` |
| `interview_result` | text | `passed`, `failed` |
| `interview_feeling` | text | `aced`, `pretty_good`, `meh`, `struggled`, `flunked` |
| `interview_dttm` | text | ISO timestamp |

### `interview_questions` table
| Column | Type | Notes |
|---|---|---|
| `question_type` | text | `behavioral`, `technical`, `system_design`, `coding`, `culture_fit` |
| `question_text` | text | The actual question |
| `question_notes` | text? | User's prep/answer notes |
| `difficulty` | integer | 1–5 scale |
| `interview_id` | integer | FK → interviews |

---

## Backend

### New endpoint: `GET /api/interview-insights?window=all|90|30`

Reuses the `StatsWindow` type and the same `window` query-param convention as `/api/stats`.

#### Response shape

```typescript
interface InterviewInsightsResponse {
  // ── Summary cards ──────────────────────────────────────────────────────
  totalInterviews: number;          // all interviews in window
  passRate: number | null;          // passed / (passed+failed); null if no results recorded
  totalQuestions: number;           // questions linked to interviews in window
  avgDifficulty: number | null;     // avg difficulty of those questions; null if none

  // ── Stage breakdown ────────────────────────────────────────────────────
  byStage: {
    stage: string;                  // "phone_screen" | "onsite"
    count: number;
    passed: number;
    failed: number;
  }[];

  // ── Interview type breakdown ───────────────────────────────────────────
  byType: {
    type: string;                   // InterviewType values
    count: number;
    passed: number;
    failed: number;
  }[];

  // ── Feeling calibration ────────────────────────────────────────────────
  // Ordered: aced → pretty_good → meh → struggled → flunked
  feelingVsResult: {
    feeling: string;
    passed: number;
    failed: number;
    noResult: number;               // interviews with no result recorded
  }[];

  // ── Vibe vs result ─────────────────────────────────────────────────────
  vibeVsResult: {
    vibe: string;                   // "casual" | "intense"
    count: number;
    passed: number;
    failed: number;
  }[];

  // ── Question insights ──────────────────────────────────────────────────
  questionsByType: {
    type: string;                   // QuestionType values
    count: number;
    avgDifficulty: number;
    passRate: number | null;        // pass rate of parent interview
  }[];

  difficultyDistribution: {
    difficulty: number;             // 1–5
    count: number;
    passed: number;                 // parent interview passed
    failed: number;                 // parent interview failed
  }[];

  // Recent question bank (last 50)
  recentQuestions: {
    id: number;
    question_text: string;
    question_type: string;
    question_notes: string | null;
    difficulty: number;
    interview_result: string | null;
    company: string;
    role: string;
    interview_dttm: string;
  }[];
}
```

#### Implementation files

- `backend/routes/interviewInsights.ts` — route handler, registers at `/api/interview-insights`
- `backend/db/interviewInsights.ts` — SQL queries

#### Key SQL patterns

```sql
-- byType: count + pass/fail breakdown
SELECT interview_type AS type,
       COUNT(*) AS count,
       SUM(CASE WHEN interview_result = 'passed' THEN 1 ELSE 0 END) AS passed,
       SUM(CASE WHEN interview_result = 'failed' THEN 1 ELSE 0 END) AS failed
FROM interviews i
JOIN jobs j ON j.id = i.job_id
WHERE j.user_id = ? AND i.interview_type IS NOT NULL
  AND [date_filter on i.interview_dttm]
GROUP BY interview_type;

-- difficultyDistribution: join questions → interviews for result
SELECT q.difficulty,
       COUNT(*) AS count,
       SUM(CASE WHEN i.interview_result = 'passed' THEN 1 ELSE 0 END) AS passed,
       SUM(CASE WHEN i.interview_result = 'failed' THEN 1 ELSE 0 END) AS failed
FROM interview_questions q
JOIN interviews i ON q.interview_id = i.id
JOIN jobs j ON j.id = i.job_id
WHERE j.user_id = ?
  AND [date_filter on i.interview_dttm]
GROUP BY q.difficulty ORDER BY q.difficulty;
```

Window filtering: same approach as `stats.ts` — map `window` to a date cutoff on `i.interview_dttm`.

---

## Frontend

### Route & Nav

| | Value |
|---|---|
| Path | `/insights` |
| Nav label | `Insights` (using `PsychologyOutlinedIcon`) |
| Component | `frontend/src/components/InsightsPage.tsx` |

Add to `App.tsx` route list and `AppShell.tsx` `NAV_ITEMS`.

### API client (`frontend/src/api.ts`)

```typescript
getInterviewInsights: (window: StatsWindow = "all") =>
  request<InterviewInsightsResponse>(`/interview-insights?window=${window}`)
```

---

## Page Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Interview Insights                          [30d] [90d] [All time]          │
└──────────────────────────────────────────────────────────────────────────────┘

Row 1 — Summary stat cards (4 × StatCard)
┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ Interviews    │ │ Pass Rate     │ │ Questions     │ │ Avg Difficulty│
│     42        │ │    61%        │ │    117        │ │    3.2 / 5    │
└───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘

Row 2 — Interview type performance
┌──────────────────────────────────────┐ ┌──────────────────────────────────┐
│ Interview Types (donut)              │ │ Pass Rate by Type (horiz bars)   │
│                                      │ │                                  │
│  coding 38%   behavioral 24%  …      │ │  Behavioral  ████████  80%  n=8  │
│                                      │ │  Coding      ████░░░░  50%  n=10 │
│                                      │ │  System Des. ███░░░░░  43%  n=7  │
└──────────────────────────────────────┘ └──────────────────────────────────┘

Row 3 — Feeling calibration (the "oh neat" chart, full width)
┌──────────────────────────────────────────────────────────────────────────────┐
│ How Well Does Your Gut Predict Outcome?                                      │
│ "You're well-calibrated — trust your gut."                                   │
│                                                                              │
│  (100% stacked horizontal bar per feeling)                                   │
│  Aced:       ████████████████████  85% pass (n=13)                          │
│  Pretty Good:████████████████░░░░  68% pass (n=9)                           │
│  Meh:        ████████████░░░░░░░░  50% pass (n=12)                          │
│  Struggled:  █████░░░░░░░░░░░░░░░  28% pass (n=7)                           │
│  Flunked:    ██░░░░░░░░░░░░░░░░░░  15% pass (n=4)                           │
└──────────────────────────────────────────────────────────────────────────────┘

Row 4 — Question insights
┌──────────────────────────────────────┐ ┌──────────────────────────────────┐
│ Questions by Type                    │ │ Difficulty Distribution           │
│ (horiz bar: count, avg difficulty    │ │ (stacked bar 1–5: pass=green,     │
│  as secondary label)                 │ │  fail=red, no result=gray)        │
│                                      │ │                                   │
│  Behavioral  ████  32  avg 2.1       │ │  1 ████                           │
│  Coding      ████  28  avg 3.8       │ │  2 ████████                       │
│  System Des. ███   22  avg 4.1       │ │  3 ████████████                   │
│  Technical   ██    18  avg 3.2       │ │  4 ████████                       │
│  Culture Fit █      8  avg 1.5       │ │  5 ████                           │
└──────────────────────────────────────┘ └──────────────────────────────────┘

Row 5 — Question bank (full width)
┌──────────────────────────────────────────────────────────────────────────────┐
│ Question Bank                                        [filter by type: All ▾] │
│                                                                              │
│ Diff │ Type          │ Question                         │ Company  │ Result  │
│ ★★★★☆ │ Coding       │ Design a rate limiter…           │ Stripe   │ ✓      │
│ ★★★☆☆ │ Behavioral   │ Tell me about a time…            │ Airbnb   │ ✓      │
│ ★★★★★ │ System Design│ Design YouTube…                  │ Google   │ ✗      │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Calibration score algorithm

Compute Pearson correlation between feeling rank (aced=5 → flunked=1) and pass rate per bucket.
Requires ≥ 5 interviews with both feeling and result recorded.

| Correlation | Label |
|---|---|
| ≥ 0.7 | "You're well-calibrated — trust your gut." |
| 0.4–0.69 | "Reasonably calibrated." |
| < 0.4 | "Your gut feeling and results don't quite line up." |

---

## New Component Files

| File | Chart | Patterns from |
|---|---|---|
| `InsightsPage.tsx` | page shell | `StatsPage.tsx` |
| `insights/TypeDonutChart.tsx` | Recharts PieChart | `StatusDonutChart.tsx` |
| `insights/PassRateByTypeChart.tsx` | Recharts horizontal BarChart | `AvgDaysChart.tsx` |
| `insights/FeelingCalibrationChart.tsx` | 100% stacked horizontal BarChart | `PipelineOverTimeChart.tsx` |
| `insights/QuestionsByTypeChart.tsx` | Recharts horizontal BarChart | `AvgDaysChart.tsx` |
| `insights/DifficultyDistributionChart.tsx` | Recharts stacked BarChart | `InterviewsPerWeekChart.tsx` |
| `insights/QuestionBankTable.tsx` | MUI Table | `TopCompaniesTable.tsx` |

### Color palette

- Pass: `#66bb6a` (reuses Offer! green)
- Fail: `#ef5350` (reuses Rejected red)
- No result: `#90a4ae` (gray)
- Interview types: behavioral `#66bb6a`, coding `#42a5f5`, system_design `#ab47bc`, leadership `#ff7043`, past_experience `#26c6da`, culture_fit `#ec407a`
- Question types: behavioral `#66bb6a`, coding `#42a5f5`, system_design `#ab47bc`, technical `#ff7043`, culture_fit `#ec407a`

---

## Implementation Order

1. `backend/db/interviewInsights.ts` — SQL queries
2. `backend/routes/interviewInsights.ts` — route handler
3. Register route in `backend/server.ts`
4. Add `InterviewInsightsResponse` to `frontend/src/types.ts`
5. Add `getInterviewInsights` to `frontend/src/api.ts`
6. Build chart components (simplest → most complex)
7. Build `InsightsPage.tsx`
8. Add route to `App.tsx`, nav item to `AppShell.tsx`

---

## Verification

```bash
npm run dev
curl "http://localhost:3001/api/interview-insights?window=all"
# Navigate to http://localhost:5173/insights
npm run lint && npm run format
```
