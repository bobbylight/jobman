# JobMan

![Build](https://github.com/bobbylight/jobman/actions/workflows/build.yml/badge.svg)
[![codecov](https://codecov.io/gh/bobbylight/jobman/graph/badge.svg)](https://codecov.io/gh/bobbylight/jobman)

JobMan is a 100% vibe-coded app to help you organize your job hunt journey.
I built it to track progress on my most recent job hunt.

This project was a fun attempt to guide Claude to build something with proper engineering discipline,
but as little manual programming as possible. The principles I followed were basically:

1. Use as modern of tech stacks, libraries, and tooling as possible
2. Be reasonably cheap to host on AWS (< $5/month)
3. Write unit tests for everything
4. Be opinionated and strict with linting and formatting
5. Be GitHub ticket-driven to track progress and have an audit trail

I also wanted it to look really good (I'm also not against looking like every other
AI-generated app), but somehow it still came out looking like vanilla MUI :)

There are *several* usability issues in the app, but overall it works, and tracks all the info I wanted for my most recent job search!

<!-- TODO: replace with a real screenshot of the Kanban board -->
![JobMan screenshot](docs/screenshot.png)

## Features

- **Kanban board** — drag job applications through six stages, from `Not started` to `Offer!` or `Rejected/Withdrawn`
- **Job details** — track salary, fit score, recruiter, referrals, tags (remote/hybrid, FAANG, startup, etc.), and free-form notes per job
- **Interview tracking** — log interviews per job, record questions asked, and review them later
- **Interview insights** — aggregated analytics across all logged interview questions and difficulty
- **Pipeline stats** — charts on application volume, conversion rates, and time-in-stage over configurable windows
- **Company radar** — see which companies you've already applied to before re-applying, with notes and policy tracking
- **Google OAuth login** — sign in with your Google account; sessions persisted in SQLite

## Tech stack

| Layer         | Technology                                          |
|---------------|------------------------------------------------------|
| Backend       | Node.js, Express 5, `better-sqlite3`                |
| Auth          | Google OAuth 2.0 via Passport.js + `express-session` |
| Frontend      | React 19, Vite, Material UI v9, react-router-dom v7  |
| Drag & drop   | `@dnd-kit/core`                                       |
| Language      | TypeScript (strict mode)                              |

## Getting started

```bash
git clone https://github.com/bobbylight/jobman.git
cd jobman
npm run install:all
```

Create `backend/.env.development` from `backend/.env.example` and fill in a
[Google OAuth client ID/secret](https://console.cloud.google.com/apis/credentials) and a session secret:

```bash
cp backend/.env.example backend/.env.development
```

Then start both the API and the frontend dev server:

```bash
npm run dev
```

The frontend runs at `http://localhost:5173` and proxies `/api/*` to the backend at `http://localhost:3001`.

## Scripts

```bash
npm run dev          # Start both backend and frontend in dev mode
npm run build        # Build the frontend for production
npm test             # Run all tests (backend + frontend)
npm run lint         # Lint with Oxlint
npm run format       # Check formatting with Biome
npm run tsc          # Type-check all workspaces
```

### Deployment

```bash
npm run deploy:backend   # rsync backend source to EC2 and restart via pm2
npm run deploy:frontend  # Build and sync frontend assets to S3/CloudFront
npm run db:pull          # Download the production database to your local copy
npm run db:push          # Overwrite the production database with your local copy (prompts for confirmation)
```
