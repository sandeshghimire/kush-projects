# Kush's Pico Academy — Full Build Specification

> **Purpose of this document**
> This is a complete, self-contained specification designed to be handed to a single coding LLM (Claude Code, Cursor, or equivalent) so it can generate the entire project in one shot. Every decision has been pre-made. The LLM should follow this spec literally and avoid inventing alternate architectures or features.
>
> **Project name:** Kush's Pico Academy
> **Type:** Personal learning-tracker web application, self-hosted on a home network.
> **Single target user:** Kush (age ~10). His parent is the informal admin but there is no login / no role system.

---

## 1. Product Summary

Kush's Pico Academy is a beautiful, animated, light-themed Next.js web app that guides a 10-year-old through a 40-step learning journey with the **Raspberry Pi Pico 2 / Pico 2 W** using the **official Pico C/C++ SDK**.

The journey is split into two phases:

1. **20 Lessons** — teach every major subsystem of the Pico (GPIO, PWM, ADC, timers, interrupts, UART, I2C, SPI, PIO, multicore, motor control, IMU, WiFi, power) plus foundational C programming concepts. Lessons run in strict order; lesson N unlocks only when lesson N−1 is completed.
2. **20 Sub-Projects** — locked until **all 20 lessons** are complete. Each sub-project is a real, working module of a single end-goal: a **2WD autonomous robot car with WiFi control, OLED display, IMU, line following, and obstacle avoidance**. Finishing all 20 sub-projects = finished robot.

Completion of a lesson or project requires **four steps**:

1. Upload code file(s) (.c, .h, .ino).
2. Write a summary of what he did (stored in DB, viewable later).
3. Pass an AI-generated quiz: **10 questions**, min **7/10 to pass**, sampled randomly from a pre-generated pool. Retakes allowed; every attempt is logged.
4. Tick the "Mark Complete" checkbox (auto-enabled after the above 3).

Each completion awards a **unique badge** (1 per lesson + 1 per project = 40 total). Kush's **rank/title** advances at milestones.

---

## 2. Users & Access

- **No login system.** The site runs on the home LAN and is assumed to be accessed only by Kush and his parent.
- Both can edit lesson/project markdown content via an in-browser editor.
- Comments on each detail page are "public per lesson" — anyone visiting can post. No moderation UI required; comments store an optional display name (defaults to "Kush") but do not authenticate.
- All "user-facing" personalization is hardcoded around the name **Kush**.

---

## 3. Tech Stack (fixed — do not substitute)

| Area | Choice |
|---|---|
| Framework | **Next.js 14+ App Router**, TypeScript |
| Styling | **Tailwind CSS 3+** |
| UI primitives | **shadcn/ui** (Radix + Tailwind) |
| Animation | **Framer Motion** for page/component animations; **canvas-confetti** for celebrations |
| Icons | **lucide-react** |
| Markdown render | **react-markdown** + **remark-gfm** + **rehype-highlight** (GitHub-flavored markdown, code block syntax highlighting) |
| Markdown editor | **@uiw/react-md-editor** (simple in-browser editor — the "simple in-browser markdown editor" the user asked for) |
| Database | **SQLite** via **better-sqlite3** (synchronous, single-file, perfect for self-hosted) |
| Quiz AI | **Local Ollama server** (assumed at `http://localhost:11434`, model configurable via env, default `glm-4.7-flash:latest`) |
| Charts (profile timeline) | **recharts** |
| Deployment | Self-hosted with `next start` on home network. Not Vercel. Filesystem writes to `public/data/` are allowed. |

### Node / package version
- Node 20+
- Package manager: **pnpm** preferred, `npm` acceptable.

---

## 4. Directory Structure

Root of the repo:

```
pico-academy/
├── app/                                # Next.js App Router
│   ├── layout.tsx                      # Root layout (top nav, fonts, globals)
│   ├── page.tsx                        # Dashboard (/)
│   ├── globals.css                     # Tailwind + custom CSS variables
│   ├── lessons/
│   │   ├── page.tsx                    # Lessons list
│   │   └── [slug]/
│   │       ├── page.tsx                # Lesson detail
│   │       ├── edit/page.tsx           # Edit markdown
│   │       └── quiz/page.tsx           # Take quiz
│   ├── projects/
│   │   ├── page.tsx                    # Projects list (locked until all lessons done)
│   │   └── [slug]/
│   │       ├── page.tsx                # Project detail
│   │       ├── edit/page.tsx
│   │       └── quiz/page.tsx
│   ├── badges/page.tsx                 # 40-badge grid
│   ├── profile/page.tsx                # Rank + stats + timeline
│   └── api/                            # Route handlers
│       ├── progress/route.ts           # GET overall progress
│       ├── lessons/
│       │   ├── route.ts                # GET list of lessons with status
│       │   └── [slug]/
│       │       ├── route.ts            # GET lesson, PATCH metadata/content
│       │       ├── notes/route.ts      # CRUD sticky notes
│       │       ├── comments/route.ts   # CRUD comments
│       │       ├── uploads/route.ts    # Upload/list code + documents
│       │       ├── summary/route.ts    # Submit/fetch summary
│       │       ├── quiz/route.ts       # Fetch 10 random quiz qs + submit answers
│       │       ├── quiz/generate/route.ts  # Admin: regenerate quiz pool via Ollama
│       │       └── complete/route.ts   # Mark complete (validates prerequisites)
│       ├── projects/[slug]/...         # Mirror of lessons above
│       ├── badges/route.ts             # GET all badges with earned status
│       └── ollama/health/route.ts      # GET Ollama availability
├── components/
│   ├── ui/                             # shadcn components (button, card, dialog, input, ...)
│   ├── layout/
│   │   ├── TopNav.tsx
│   │   └── PageContainer.tsx
│   ├── dashboard/
│   │   ├── Greeting.tsx                # "Hello Kush, today is Monday..."
│   │   ├── ProgressRings.tsx           # animated dual ring (lessons / projects)
│   │   ├── NextUpCard.tsx
│   │   ├── RankCard.tsx
│   │   ├── RecentActivity.tsx
│   │   └── FactOfTheDay.tsx            # small robotics trivia
│   ├── lessons/
│   │   ├── LessonCard.tsx
│   │   ├── LessonList.tsx
│   │   ├── LessonHeader.tsx
│   │   ├── MarkdownRenderer.tsx
│   │   ├── MarkdownEditor.tsx
│   │   ├── CompletionChecklist.tsx     # 4-step gate UI
│   │   ├── StickyNotes.tsx
│   │   ├── CommentsThread.tsx
│   │   ├── UploadsPanel.tsx            # code + document upload/list
│   │   ├── SummaryForm.tsx
│   │   └── QuizRunner.tsx
│   ├── badges/
│   │   ├── BadgeGrid.tsx
│   │   └── BadgeTile.tsx
│   ├── profile/
│   │   ├── RankHeader.tsx
│   │   ├── StatsStrip.tsx
│   │   └── TimelineChart.tsx
│   ├── animations/
│   │   ├── ConfettiBurst.tsx
│   │   ├── CountUp.tsx
│   │   └── ProgressRing.tsx
│   └── common/
│       ├── LockOverlay.tsx             # shown on locked lesson/project cards
│       └── EmptyState.tsx
├── lib/
│   ├── db.ts                           # better-sqlite3 singleton + migrations
│   ├── content.ts                      # read/write markdown files in public/data
│   ├── curriculum.ts                   # static metadata for 20 lessons + 20 projects
│   ├── progress.ts                     # compute unlock state, percentages, rank
│   ├── rank.ts                         # rank thresholds + titles
│   ├── badges.ts                       # badge registry (40 entries)
│   ├── ollama.ts                       # client for local Ollama (generate quiz)
│   ├── quiz.ts                         # quiz pool read/write, random sampling, grading
│   ├── uploads.ts                      # file save paths, allowed extensions
│   ├── slug.ts                         # slug helpers
│   └── date.ts                         # "Monday, April 19th" formatting
├── public/
│   ├── data/
│   │   ├── lessons/
│   │   │   ├── lesson-1/
│   │   │   │   ├── content.md
│   │   │   │   └── assets/             # images referenced by the markdown
│   │   │   ├── lesson-2/ ...
│   │   │   └── lesson-20/
│   │   ├── projects/
│   │   │   ├── project-1/
│   │   │   │   ├── content.md
│   │   │   │   └── assets/
│   │   │   ├── project-2/ ...
│   │   │   └── project-20/
│   │   ├── quiz-pools/                 # AI-generated quiz banks
│   │   │   ├── lesson-1.json
│   │   │   └── ... (one per lesson and project)
│   │   └── uploads/                    # runtime-uploaded files (code, PDFs, images)
│   │       ├── lesson-1/
│   │       │   ├── code/
│   │       │   └── docs/
│   │       └── project-1/...
│   ├── badges/                         # SVG badge artwork, 40 files, kebab-case
│   └── favicon.ico
├── data/
│   └── pico-academy.db                 # SQLite database file (created at runtime)
├── scripts/
│   ├── seed.ts                         # writes all 40 markdown files + DB seed
│   └── generate-quiz-pools.ts          # loops lessons/projects, calls Ollama
├── .env.example
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

### Why `public/data/uploads/` is writable at runtime
The user requested `public/data/...` for content. Because this app is **self-hosted with `next start` on a home server**, Node has full write access to `public/`. This is only a problem on serverless hosts (Vercel) — not here. The LLM generating the project must not warn about this; it is an accepted constraint.

---

## 5. Data Model (SQLite)

Use **better-sqlite3**. The DB file lives at `data/pico-academy.db`. On boot, `lib/db.ts` ensures directory exists and runs idempotent `CREATE TABLE IF NOT EXISTS` migrations.

### Tables

```sql
-- Single row table describing the site-wide learner (Kush). Created once on first boot.
CREATE TABLE IF NOT EXISTS learner (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  display_name  TEXT NOT NULL DEFAULT 'Kush',
  created_at    INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Static catalogue seeded from lib/curriculum.ts (so we can index/join in SQL).
-- kind IN ('lesson','project'); order_index 1..20 within each kind.
CREATE TABLE IF NOT EXISTS items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  kind          TEXT NOT NULL CHECK (kind IN ('lesson','project')),
  slug          TEXT NOT NULL UNIQUE,           -- e.g., 'lesson-1', 'project-7'
  order_index   INTEGER NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  topic         TEXT NOT NULL,                  -- e.g., 'GPIO', 'I2C', 'Motor Control'
  difficulty    TEXT NOT NULL CHECK (difficulty IN ('Beginner','Intermediate','Advanced')),
  estimated_minutes INTEGER NOT NULL,
  UNIQUE(kind, order_index)
);

-- Progress per item. Row created lazily on first interaction.
CREATE TABLE IF NOT EXISTS item_progress (
  item_id       INTEGER PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'not_started'
                  CHECK (status IN ('not_started','in_progress','completed')),
  summary       TEXT,                           -- written summary
  best_quiz_score INTEGER,                      -- 0..10
  last_quiz_score INTEGER,
  completed_at  INTEGER,
  updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Sticky notes on a detail page (free-form, user's private notes).
CREATE TABLE IF NOT EXISTS notes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id       INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  color         TEXT NOT NULL DEFAULT 'yellow', -- for visual variety; enum: yellow|pink|blue|green|purple
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Public comments per item.
CREATE TABLE IF NOT EXISTS comments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id       INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  author_name   TEXT NOT NULL DEFAULT 'Kush',
  content       TEXT NOT NULL,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Uploaded files index. Actual bytes stored on disk (see section 11).
CREATE TABLE IF NOT EXISTS uploads (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id       INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  category      TEXT NOT NULL CHECK (category IN ('code','doc')),
  original_name TEXT NOT NULL,
  stored_path   TEXT NOT NULL,                  -- relative to /public
  mime_type     TEXT NOT NULL,
  size_bytes    INTEGER NOT NULL,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Every quiz attempt is logged.
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id       INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  score         INTEGER NOT NULL,               -- 0..10
  passed        INTEGER NOT NULL,               -- 0 or 1
  details_json  TEXT NOT NULL,                  -- array of {q, selected, correct, right}
  created_at    INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Badges catalogue (seeded from lib/badges.ts), one row per badge.
CREATE TABLE IF NOT EXISTS badges (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  slug          TEXT NOT NULL UNIQUE,           -- e.g., 'lesson-1', 'project-3'
  item_slug     TEXT NOT NULL UNIQUE REFERENCES items(slug),
  title         TEXT NOT NULL,                  -- fun name, e.g., "First Spark"
  description   TEXT NOT NULL,
  icon_path     TEXT NOT NULL                   -- '/badges/first-spark.svg'
);

CREATE TABLE IF NOT EXISTS badge_awards (
  badge_id      INTEGER PRIMARY KEY REFERENCES badges(id),
  awarded_at    INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_notes_item ON notes(item_id);
CREATE INDEX IF NOT EXISTS idx_comments_item ON comments(item_id, created_at);
CREATE INDEX IF NOT EXISTS idx_uploads_item ON uploads(item_id);
CREATE INDEX IF NOT EXISTS idx_quiz_item ON quiz_attempts(item_id, created_at);
```

### Seeding
`scripts/seed.ts` runs on first boot (or `pnpm seed`) and:
1. Ensures `learner` row exists.
2. Upserts 40 `items` rows using `lib/curriculum.ts`.
3. Upserts 40 `badges` rows using `lib/badges.ts`.
4. Writes `public/data/lessons/lesson-N/content.md` and `public/data/projects/project-N/content.md` for any missing file using the full markdown bodies in **Section 15**.

Seeding is **idempotent** — never overwrites existing markdown or DB rows.

---

## 6. Content Model

### Metadata
Metadata (title, description, topic, difficulty, estimated_minutes) is stored in **SQLite** (`items` table), sourced from `lib/curriculum.ts`. **No YAML frontmatter** in the markdown files — the markdown file contains only the body.

### Markdown body
- GitHub-flavored markdown.
- Code fences with language hints (```c, ```cpp, ```bash).
- Image references like `![Diagram](./assets/wiring.png)` resolved relative to the lesson folder.
- Rendered by `MarkdownRenderer` with `remark-gfm` + `rehype-highlight`.
- No Mermaid, no LaTeX, no embedded video (per answer to spec).

### Editing
`/lessons/[slug]/edit` and `/projects/[slug]/edit`:
- Load markdown body + metadata.
- Simple markdown editor (`@uiw/react-md-editor`) for body.
- Basic inputs for metadata (title, description, topic, difficulty, minutes).
- Save button → `PATCH /api/lessons/[slug]` → writes both the DB row and `content.md`.

---

## 7. Unlock Logic (precise)

Function: `computeUnlockState(items, progress)` in `lib/progress.ts`.

Rules:
- **Lesson 1** is always unlocked.
- **Lesson N (2..20)** is unlocked iff Lesson N−1 `status === 'completed'`.
- **All 20 projects are locked** until every lesson is `completed`.
- Once all lessons are complete, **Project 1** unlocks.
- **Project N (2..20)** is unlocked iff Project N−1 `status === 'completed'`.
- A locked item's detail page returns 403 (UI shows a `LockOverlay` and a "Complete Lesson X to unlock" hint).

---

## 8. Completion Logic

Completing a lesson or project requires **all four** of the following to be true, enforced server-side at `POST /api/{kind}/[slug]/complete`:

1. At least one code upload (category `'code'`, extension in `.c|.h|.hpp|.cpp|.ino`).
2. `summary` is non-empty (min 40 characters).
3. A `quiz_attempts` row exists for this item with `passed = 1`.
4. The item is currently unlocked.

On success:
- `item_progress.status` → `'completed'`, `completed_at = now()`.
- Insert `badge_awards` row (idempotent — uses `INSERT OR IGNORE`).
- Return a payload including `{ newlyEarnedBadge: {...} | null, newRank: {...} | null }`.
- The client triggers a confetti burst + a full-screen celebration modal showing the badge and, if the rank advanced, the new title.

---

## 9. Rank / Title System

Defined in `lib/rank.ts`. Rank is derived purely from the **count of completed items** (lessons + projects).

| Completed items | Rank title |
|---|---|
| 0 | Cadet |
| 1–3 | Spark Scout |
| 4–7 | Circuit Explorer |
| 8–12 | Signal Seeker |
| 13–17 | Junior Engineer |
| 18–22 | Engineer |
| 23–27 | Robotics Specialist |
| 28–32 | Senior Engineer |
| 33–37 | Master Roboticist |
| 38–40 | Grand Roboticist |

`getRank(completedCount) → { title, min, max, nextTitle, itemsToNext }`

Display: Dashboard and Profile both show current rank, and when crossing a threshold, the completion modal calls out the promotion.

---

## 10. Pages — Detailed Specifications

All pages are **desktop-first** (min-width 1280 design target), but render acceptably down to 1024. A polished tablet/mobile breakpoint is a nice-to-have but not required.

### 10.1 `/` Dashboard

Hero area, then three-column grid below.

**Hero (full-width card):**
- Big friendly greeting: `Good {morning|afternoon|evening}, Kush` (time-of-day based).
- Second line: `Today is Monday, April 19th 2026` — formatted via `lib/date.ts` using `Intl.DateTimeFormat`.
- Third line: a rotating encouraging tagline (seeded list of ~10 lines, chosen by day-of-year so it's stable within a day). Examples: *"Let's build something awesome."* / *"Every master engineer started with one LED."* / *"Your robot is waiting."*
- Right side of hero: current **rank badge** + title.

**Row 1 (3 columns):**
1. `ProgressRings` — two concentric animated rings (Framer Motion), one for lessons (X / 20), one for projects (X / 20), with the percentage count-up animated on mount.
2. `NextUpCard` — the next unlocked, not-started item. Big "Continue" button → link to detail page. Shows title, topic badge, estimated time.
3. `RankCard` — current rank + progress bar to next rank + "N more to reach {nextTitle}".

**Row 2:**
- `RecentActivity` — last 5 events (completed X, earned badge Y, started Z) read from `item_progress` + `badge_awards` + `quiz_attempts` joined, ordered by `max(updated_at, created_at)`.
- `FactOfTheDay` — tiny card with a robotics/electronics fun fact. Static seed list of ~40 facts in `lib/curriculum.ts` (e.g., *"The first microcontroller, the TMS1000, was released in 1974."*). Index by day-of-year.

### 10.2 `/lessons` Lessons list

- Page header: title "Lessons", subtitle "20 steps to mastering the Pico", and an overall progress bar `X / 20 complete`.
- Grid of 20 `LessonCard`s, 2 columns at desktop.
- Cards render in order. Locked cards show `LockOverlay` with "Complete Lesson N−1 to unlock" and are **not clickable**.
- Each card shows: order badge (`01`), title, topic chip, difficulty chip, estimated minutes, description (2 lines max, truncated), status pill (Not started / In progress / Completed with a check), and a "Start" or "Continue" button.

### 10.3 `/lessons/[slug]` Lesson detail

Two-column layout at desktop (main + sidebar), single column below.

**Main column:**
- `LessonHeader` — order, title, topic, difficulty, estimated minutes, status pill, "Edit" link (top right).
- `MarkdownRenderer` — rendered body.
- `CompletionChecklist` — 4 checkboxes reflecting actual server state:
  - [ ] Upload code (link opens UploadsPanel filter=code)
  - [ ] Write summary (expands to `SummaryForm`)
  - [ ] Pass quiz (shows best score or "Not taken", button → `/lessons/[slug]/quiz`)
  - [ ] Mark complete (disabled until the first three are satisfied; on click POSTs `/complete`)
- `UploadsPanel` — two tabs (Code / Documents), drag-and-drop or file picker, lists uploaded files with original name, size, and date. Delete button per row. Code files shown as file reference only (no inline syntax highlight viewer).

**Sidebar:**
- `StickyNotes` — vertical stack of sticky-note components. "Add note" button creates a new note inline; each note supports edit / delete / color change.
- `CommentsThread` — newest-first list, with a simple input `{name?} → {content}` and Post button.

### 10.4 `/lessons/[slug]/edit`

- Metadata form (title, description, topic dropdown, difficulty dropdown, estimated minutes number input).
- Markdown editor (full width, min 500px tall).
- Save / Cancel. Save calls `PATCH /api/lessons/[slug]`, on success redirects to detail page.

### 10.5 `/lessons/[slug]/quiz`

- Shuffled set of **10** questions drawn from the lesson's quiz pool (see Section 12). If pool has < 10, show an admin-visible warning banner with "Generate pool" button that calls `POST /api/lessons/[slug]/quiz/generate`.
- Question UI: one at a time, progress indicator (3 / 10), radio buttons for MC, True/False toggle for T/F. Next button disabled until answered. No back.
- On finish: submit answers → `POST /api/lessons/[slug]/quiz` → server grades, logs attempt, returns score + per-question correctness.
- Result screen:
  - If `score >= 7` → confetti, big "Passed!", show per-question review, Continue button back to detail.
  - If `score < 7` → gentle "Keep going!", review, **Retake** button (fresh random sample).

### 10.6 `/projects` Projects list

- Identical UX to Lessons list, but **entire page is gated** by "all lessons complete".
- If gated: show a centered `LockOverlay` with a robot illustration (SVG inline), a progress bar for lessons, and text *"Finish the remaining N lessons to unlock the Robot Build."*

### 10.7 `/projects/[slug]` Project detail

Identical to lesson detail, with two additions in the sidebar:
- A small "**Robot progress**" mini-widget — a 20-dot chain visualizing which sub-modules are complete. (Just 20 circles in a row, filled or empty, with the current one pulsing.)

### 10.8 `/badges`

- Grid of 40 tiles, 5 per row at desktop.
- Earned tiles: full-color SVG, title, earned-on date, subtle hover tilt.
- Unearned tiles: grayscale + lock icon overlay, title shown muted, description replaced with "Complete {item title} to earn".
- Top of page: summary "X / 40 earned".

### 10.9 `/profile`

- `RankHeader` — big current rank title, avatar-style SVG badge for the rank, progress-to-next.
- `StatsStrip` — 4 stat cards:
  - Lessons completed: X / 20
  - Projects completed: X / 20
  - Badges earned: X / 40
  - Quiz average: avg of best_quiz_score across completed items
- `TimelineChart` — recharts line chart of cumulative completions over time (x = date, y = count), based on `completed_at` across items.
- Below chart: "Completion history" list, each entry: date, item kind+title, badge earned, final quiz score.

---

## 11. API Routes — exact contracts

All handlers live under `app/api/`. All use Next.js Route Handlers (TypeScript). All return JSON.

### Conventions
- Dates are returned as ISO 8601 strings.
- Errors: `{ error: string }` with appropriate status code (400, 403, 404, 500).
- No auth layer. A simple `X-Editor: 1` header (or just the route working) is fine.

### 11.1 `GET /api/progress`
Returns overall counts and the rank object.
```ts
{
  lessons: { total: 20, completed: number, inProgress: number },
  projects: { total: 20, completed: number, inProgress: number, unlocked: boolean },
  badges:   { total: 40, earned: number },
  rank: { title: string, completedCount: number, nextTitle: string|null, itemsToNext: number|null }
}
```

### 11.2 `GET /api/lessons`  and `GET /api/projects`
Returns array sorted by `order_index`:
```ts
Array<{
  slug: string, order: number, title: string, description: string,
  topic: string, difficulty: 'Beginner'|'Intermediate'|'Advanced', estimatedMinutes: number,
  status: 'not_started'|'in_progress'|'completed',
  locked: boolean,
  lockReason: string | null,
  bestQuizScore: number | null,
  completedAt: string | null
}>
```

### 11.3 `GET /api/lessons/[slug]` (and projects)
Returns metadata + body:
```ts
{ ...itemFields, content: string, notes: Note[], comments: Comment[], uploads: Upload[], summary: string|null, quizAttempts: Attempt[], quizPoolSize: number }
```
Returns 403 with `{ error: 'locked', lockReason }` if locked.

### 11.4 `PATCH /api/lessons/[slug]`
Body: `{ title?, description?, topic?, difficulty?, estimatedMinutes?, content? }`. Updates DB metadata and writes `content.md` atomically (write to `content.md.tmp` then rename).

### 11.5 Notes
- `POST /api/lessons/[slug]/notes` `{ content, color? }` → 201 + created note
- `PATCH /api/lessons/[slug]/notes` `{ id, content?, color? }`
- `DELETE /api/lessons/[slug]/notes?id=...`
- `GET /api/lessons/[slug]/notes` (usually inlined in the main GET)

### 11.6 Comments
- `POST /api/lessons/[slug]/comments` `{ content, authorName? }`
- `DELETE /api/lessons/[slug]/comments?id=...`

### 11.7 Uploads
- `POST /api/lessons/[slug]/uploads` — multipart form: fields `category=code|doc`, `file=<File>`.
  - Allowed: `category=code` → extensions `.c .h .hpp .cpp .ino`; `category=doc` → `.png .jpg .jpeg .gif .pdf`.
  - Server writes to `public/data/uploads/{slug}/{category}/{timestamp}-{original}`.
  - Max 10 MB per file.
- `DELETE /api/lessons/[slug]/uploads?id=...` — deletes DB row + disk file.

### 11.8 Summary
- `PUT /api/lessons/[slug]/summary` `{ summary: string }` — stores on `item_progress`. Transitions status to `in_progress` if currently `not_started`.

### 11.9 Quiz
- `GET /api/lessons/[slug]/quiz` — returns 10 randomly sampled questions from pool:
  ```ts
  { items: Array<{ id: string, type: 'mc'|'tf', prompt: string, choices?: string[] }> }
  ```
  (Correct answers are **not** sent to client.)
- `POST /api/lessons/[slug]/quiz` — body `{ answers: Array<{ id, selected: number|boolean }> }`. Server looks up full pool, grades, inserts `quiz_attempts`, returns `{ score, passed, review: Array<{ id, correct: number|boolean, right: boolean }> }`.
- `POST /api/lessons/[slug]/quiz/generate` — triggers Ollama generation and overwrites `public/data/quiz-pools/{slug}.json` with a pool of **30 questions** (so each attempt samples 10/30). Streams status back as plain text chunks.

### 11.10 Complete
- `POST /api/lessons/[slug]/complete` — validates all four gates; on success updates progress, inserts badge_award, returns:
  ```ts
  { ok: true, badge: { slug, title, description, iconPath }, rank: { title, previousTitle: string|null, promoted: boolean } }
  ```

### 11.11 Badges
- `GET /api/badges` — returns all 40 badges with `earned: boolean` and `awardedAt: string|null`.

### 11.12 Ollama health
- `GET /api/ollama/health` — pings the local Ollama server; returns `{ ok, model, latencyMs }` or `{ ok: false, error }`.

---

## 12. Quiz System (Ollama)

### Pool format
`public/data/quiz-pools/{slug}.json`:
```json
{
  "slug": "lesson-1",
  "generatedAt": "2026-04-19T12:00:00Z",
  "model": "glm-4.7-flash:latest",
  "questions": [
    { "id": "q01", "type": "mc", "prompt": "Which language is used with the Pico SDK?", "choices": ["Python","C/C++","Rust","JavaScript"], "answer": 1, "explanation": "The Pico SDK is a C/C++ SDK from Raspberry Pi." },
    { "id": "q02", "type": "tf", "prompt": "The Pico 2 has a built-in Wi-Fi radio.", "answer": false, "explanation": "Only the Pico 2 W has Wi-Fi." }
    /* ... 30 total ... */
  ]
}
```

### Generation prompt (literal)
`lib/ollama.ts` calls `POST http://localhost:11434/api/generate` with:
- `model`: from `process.env.OLLAMA_MODEL || 'glm-4.7-flash:latest'`
- `stream`: false
- `format`: `"json"` (if using a JSON-capable model) OR parse JSON out of the text otherwise.
- `prompt`: literal template:

```
You are generating a quiz for a 10-year-old student learning the Raspberry Pi Pico 2 and the C/C++ SDK.

Lesson title: {title}
Topic: {topic}
Difficulty: {difficulty}

Lesson content (markdown):
---
{content}
---

Produce EXACTLY 30 quiz questions as JSON with this shape:
{
  "questions": [
    { "id": "q01", "type": "mc", "prompt": "...", "choices": ["A","B","C","D"], "answer": 0, "explanation": "..." },
    { "id": "q02", "type": "tf", "prompt": "...", "answer": true, "explanation": "..." }
  ]
}

Rules:
- Mix of "mc" (multiple choice, exactly 4 choices, `answer` is the zero-based index of the correct choice) and "tf" (true/false, `answer` is a boolean). Aim for ~70% mc and ~30% tf.
- Language simple enough for a 10-year-old, but technically correct.
- Prefer questions that test understanding, not trivia.
- All questions must be answerable from the lesson content above.
- Do NOT include any text before or after the JSON.
```

Retry logic: up to 2 attempts, parse-fail falls through to an error surfaced on `/quiz/generate`.

### Seeding quiz pools
`scripts/generate-quiz-pools.ts` iterates all 40 items and calls the generate endpoint. Idempotent — skips items whose pool file already exists unless `--force` is passed.

### Grading
Server-side only. Server re-reads the pool file, matches by `id`, counts correct, stores attempt JSON.

---

## 13. Design System

### Color tokens (CSS variables in `globals.css`)

Light theme only. Calm blues and purples. Use Tailwind `@layer base`:

```css
:root {
  --bg: 248 250 252;              /* slate-50 */
  --surface: 255 255 255;
  --surface-muted: 241 245 249;   /* slate-100 */
  --border: 226 232 240;          /* slate-200 */
  --text: 15 23 42;               /* slate-900 */
  --text-muted: 71 85 105;        /* slate-600 */

  --primary: 99 102 241;          /* indigo-500 */
  --primary-600: 79 70 229;       /* indigo-600 */
  --primary-50: 238 242 255;

  --accent: 168 85 247;           /* purple-500 */
  --accent-600: 147 51 234;

  --success: 34 197 94;           /* green-500 */
  --warning: 234 179 8;           /* yellow-500 */
  --danger: 239 68 68;            /* red-500 */

  --ring: 99 102 241;

  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --shadow-card: 0 1px 2px rgb(15 23 42 / 0.04), 0 8px 24px rgb(15 23 42 / 0.06);
}
```

Tailwind is extended to reference these via `colors: { primary: 'rgb(var(--primary) / <alpha-value>)', ... }`.

### Typography
- Font: `Inter` via `next/font/google`, variable weight. Headings use `font-semibold` or `font-bold`, body `font-normal`.
- Optional display font for big numbers: `Space Grotesk`.
- Base size 16px, scale 1.25.

### Components
- Cards: `rounded-[--radius-lg] bg-surface border border-border shadow-card p-6`.
- Buttons: shadcn default; primary uses gradient from `primary → accent` on hover.
- Pills/chips: `rounded-full px-3 py-1 text-xs font-medium`, colored by topic category (see palette in `lib/curriculum.ts`).

### Topic colors (used in chips / accents)
- GPIO → slate
- PWM → indigo
- ADC → cyan
- Timers/Interrupts → amber
- UART → teal
- I2C → purple
- SPI → pink
- PIO → fuchsia
- Multicore → emerald
- Motor Control → orange
- IMU → rose
- WiFi → sky
- Power → yellow
- Systems/Integration → violet

---

## 14. Animations & Interactions

- **Framer Motion** for all page transitions (`AnimatePresence` wrapping `app/layout.tsx`'s children via a client component).
- **Dashboard progress rings** animate from 0 to their value over 900ms ease-out on mount.
- **Count-up** numbers (`CountUp` component) animate from 0 to target on view-enter.
- **Card hover**: subtle lift `translateY(-2px)` + shadow boost, 150ms.
- **Completion celebration** (`ConfettiBurst`): triggered on `POST /complete` success and on quiz pass. Use `canvas-confetti` with two bursts (primary + accent colors).
- **Rank promotion**: full-screen modal with scale-in animation, auto-dismiss after 5s unless interacted.
- **Quiz correct answer**: brief green flash on the selected choice before advancing; wrong answer → red shake (Framer `animate={{ x: [0, -6, 6, -4, 4, 0] }}`).
- Reduced-motion respected via `prefers-reduced-motion` media query — disables non-essential animations.

---

## 15. Curriculum — Full Seed Content

All 20 lessons and 20 projects. The LLM must materialize each as `public/data/{kind}s/{kind}-N/content.md` with the markdown body shown. Metadata goes into `lib/curriculum.ts`.

### 15.A `lib/curriculum.ts` data

```ts
export type Difficulty = 'Beginner'|'Intermediate'|'Advanced';

export interface CurriculumItem {
  kind: 'lesson'|'project';
  order: number;
  slug: string;
  title: string;
  description: string;
  topic: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  parts?: Array<{ name: string; approxUSD: number; notes?: string }>;
}
```

#### Lessons (20)

| # | slug | title | topic | difficulty | min | parts (with approx USD) |
|---|---|---|---|---|---|---|
| 1 | lesson-1 | Meet the Pico 2 & Your First Blink | Setup | Beginner | 25 | Pico 2 W ($7), micro-USB or USB-C cable ($3), breadboard ($5), jumper wires ($5), LED ($0.25), 330Ω resistor ($0.10) |
| 2 | lesson-2 | Digital Outputs — Controlling LEDs | GPIO | Beginner | 25 | 3× LED ($1), 3× 330Ω ($0.30) |
| 3 | lesson-3 | Digital Inputs — Buttons and Debouncing | GPIO | Beginner | 30 | 2× push button ($1), 2× 10kΩ resistor ($0.20) |
| 4 | lesson-4 | PWM — Dimming LEDs and Making Tones | PWM | Beginner | 35 | Passive buzzer ($2), RGB LED ($0.50) |
| 5 | lesson-5 | ADC — Reading Analog Sensors | ADC | Beginner | 40 | 10kΩ potentiometer ($1), LDR ($0.50), TMP36 ($1.50) |
| 6 | lesson-6 | Timers, Interrupts & Non-Blocking Code | Timers/Interrupts | Intermediate | 45 | (none extra) |
| 7 | lesson-7 | UART / Serial — Printing and Debugging | UART | Beginner | 35 | (none extra) |
| 8 | lesson-8 | I2C — Talking to an OLED Display | I2C | Intermediate | 60 | SSD1306 OLED 128×64 ($6) |
| 9 | lesson-9 | SPI — Fast Serial Communication | SPI | Intermediate | 45 | microSD module ($3) — optional |
| 10 | lesson-10 | C Projects, Headers & CMake | Systems | Intermediate | 50 | (none extra) |
| 11 | lesson-11 | PIO — The Pico's Superpower | PIO | Advanced | 70 | WS2812 Neopixel strip 8 LEDs ($4) |
| 12 | lesson-12 | Multicore — Two CPUs, One Robot | Multicore | Advanced | 50 | (none extra) |
| 13 | lesson-13 | Driving DC Motors with an H-Bridge | Motor Control | Intermediate | 60 | TB6612FNG driver ($3), 2× TT gear motor + wheel ($4), AA battery holder ($2), 4× AA batteries ($3) |
| 14 | lesson-14 | Servo Motors — Precise Angles | Motor Control | Intermediate | 35 | SG90 servo ($3) |
| 15 | lesson-15 | Stepper Motors — Stepping One Click at a Time | Motor Control | Advanced | 45 | 28BYJ-48 stepper + ULN2003 driver ($4) |
| 16 | lesson-16 | Distance Sensors — Seeing the World | Sensors | Intermediate | 50 | HC-SR04 ultrasonic ($3), IR sensor module ($1.50) |
| 17 | lesson-17 | The IMU — Accelerometer & Gyro | IMU | Advanced | 60 | MPU6050 ($3) |
| 18 | lesson-18 | Wi‑Fi on the Pico 2 W | WiFi | Advanced | 70 | (none extra) |
| 19 | lesson-19 | Power, Batteries & Sleep Modes | Power | Intermediate | 40 | 7.4V Li-ion pack or 6×AA holder ($6), MP1584 buck converter ($2) |
| 20 | lesson-20 | Putting It All Together — Architecture of a Robot | Systems | Advanced | 60 | (none extra) |

#### Projects (20) — each is a real sub-module of the final robot

| # | slug | title | topic | difficulty | min | key parts |
|---|---|---|---|---|---|---|
| 1 | project-1 | Build the Power Module | Power | Intermediate | 60 | battery pack, switch, buck converter, power LED |
| 2 | project-2 | Mount the Brain: Pico on the Chassis | Systems | Beginner | 45 | 2WD chassis kit ($15), M3 standoffs ($3), perfboard ($2) |
| 3 | project-3 | Wire Up the Motor Driver Board | Motor Control | Intermediate | 60 | TB6612FNG, screw terminals |
| 4 | project-4 | First Drive! Forward, Back, and Turn | Motor Control | Intermediate | 50 | (uses project-3) |
| 5 | project-5 | Wheel Encoders — Counting Rotations | Sensors | Intermediate | 60 | 2× slotted encoder wheels + TCRT/IR module ($3) |
| 6 | project-6 | Closed-Loop Speed Control | Motor Control | Advanced | 75 | (uses project-5) |
| 7 | project-7 | Front Ultrasonic Eye | Sensors | Intermediate | 45 | HC-SR04 + mount |
| 8 | project-8 | Autonomous Obstacle Avoidance | Systems | Advanced | 75 | (uses 4, 7) |
| 9 | project-9 | IR Line Sensor Array | Sensors | Intermediate | 60 | 3× TCRT5000 modules ($3) |
| 10 | project-10 | Line Follower Mode | Systems | Advanced | 75 | (uses 4, 9) |
| 11 | project-11 | Install the IMU | IMU | Intermediate | 45 | MPU6050 |
| 12 | project-12 | Drive Straight & Turn Exact Degrees | Systems | Advanced | 75 | (uses 4, 11) |
| 13 | project-13 | OLED Status Display | I2C | Intermediate | 45 | SSD1306 (shared with lesson-8) |
| 14 | project-14 | RGB Status Bar (Neopixels + PIO) | PIO | Advanced | 60 | WS2812 strip |
| 15 | project-15 | Buzzer & Sound Effects | PWM | Beginner | 30 | buzzer |
| 16 | project-16 | Mode Button & State Machine | GPIO | Intermediate | 45 | push button |
| 17 | project-17 | UART Remote Control (Bluetooth HC-05) | UART | Intermediate | 60 | HC-05 module ($5) |
| 18 | project-18 | Wi-Fi Web Joystick Control | WiFi | Advanced | 90 | (Pico 2 W built-in) |
| 19 | project-19 | Telemetry Dashboard | WiFi | Advanced | 75 | (software only) |
| 20 | project-20 | Missions! Full Autonomy & Integration | Systems | Advanced | 120 | (uses everything) |

### 15.B Markdown body template

Each of the 40 markdown files follows this structure (the LLM generating this project may expand with technically-correct detail; what follows is the **minimum** content for each):

```md
# {Title}

## What you'll learn
- (3–5 bullet points of concrete learning outcomes)

## Parts you'll need
- (parts list as a bullet list with approx cost)

## Background
(2–4 short paragraphs explaining the concept in friendly language for a 10-year-old. Use analogies. For projects, explain how this module fits the final robot.)

## Wiring
(ASCII table or a numbered list of pin-to-pin connections. Include Pico 2 GPIO numbers.)

## The code
```c
// Minimal working example using the Pico C/C++ SDK.
// Must compile against pico-sdk on a Pico 2 / Pico 2 W.
#include "pico/stdlib.h"

int main() {
    stdio_init_all();
    // ...
}
```

## Try it
(2–4 "try this" variations: change a constant, add an LED, measure what happens.)

## Challenge
(One slightly harder extension to attempt before marking complete.)

## Summary
(One paragraph restating the key idea.)
```

Project markdown additionally includes a final section:

```md
## How this fits the robot
(One paragraph explaining what role this module plays in the final car and which prior projects it builds on.)
```

### 15.C Sketch of content for a few items (to anchor style)

The full LLM build may regenerate bodies; the following are **authoritative outlines** the generated content must cover:

**Lesson 1 — Meet the Pico 2 & Your First Blink**
Background: what a microcontroller is vs a computer; why the Pico 2 is special; install Pico C/C++ SDK (link to Raspberry Pi's docs, summarise steps for macOS/Windows/Linux); build system = CMake; what BOOTSEL mode is; drag-and-drop .uf2; on-board LED is GPIO 25 on Pico, LED_PIN via `PICO_DEFAULT_LED_PIN` — use the macro. Code uses `gpio_init`, `gpio_set_dir`, `gpio_put`, `sleep_ms` in a loop. Try-it: change delay, blink an external LED on GPIO 15. Challenge: blink two LEDs alternating.

**Lesson 8 — I2C & OLED**
Background: I2C two-wire bus (SDA/SCL), addressing, why pull-ups; SSD1306 at address 0x3C. Wiring table: SDA→GP4, SCL→GP5, VCC→3V3(OUT), GND→GND. Code: initialise `i2c0` at 400 kHz, use a minimal SSD1306 driver (either include as a header file or copy the official pimoroni/CircuitPython-derived routines). Try-it: print Kush's name. Challenge: show a bouncing dot.

**Lesson 13 — DC Motors with H-Bridge**
Background: why you can't drive a motor from a GPIO pin; H-bridge concept; TB6612FNG pinout; PWMB pins; VM vs VCC; current considerations. Wiring: PWMA→GP16, AIN1→GP17, AIN2→GP18, STBY→GP22, motor terminals. Code: `pwm_set_gpio_level` for speed, digital highs for direction. Try-it: ramp up/down. Challenge: bi-directional speed function taking signed int.

**Lesson 18 — Wi-Fi on Pico 2 W**
Background: CYW43 chip; `pico_cyw43_arch_lwip_threadsafe_background`; connecting to router; running a tiny HTTP server with lwIP httpd or a raw TCP accept loop. Wiring: none. Code: reads SSID/PWD from `wifi_config.h`; serves a page with "Hello from Kush's Pico". Try-it: toggle onboard LED from the browser. Challenge: JSON endpoint returning uptime.

**Project 4 — First Drive!**
Background: combining H-bridge + two motors + battery. Safety: lift the robot on a stand before first test. Wiring: left motor on channel A, right motor on channel B. Code: helper functions `drive(left_pwm, right_pwm)` and `stop()`. Try-it: 1-second square drive pattern. Challenge: `turn_in_place(degrees)` with a crude time-based estimate. How this fits: gives the robot its legs — every future mode depends on these helpers.

**Project 18 — Wi-Fi Web Joystick**
Background: Pico 2 W hosts a tiny HTML page with an on-screen joystick (pure JS, no dependencies). Browser sends `/drive?l=0.5&r=-0.5` which maps to motor PWM. Implementation: static HTML served from a string literal. How this fits: the first time Kush drives the robot from his phone/laptop.

(The LLM generating this project must produce similarly concrete content for all 40, covering every wiring pin, every code file, and every parts list.)

---

## 16. Badges

Defined in `lib/badges.ts`. Each of the 40 items gets exactly one badge.

- Lesson badges use cool science-y names: *First Spark* (L1), *Light Conductor* (L2), *Button Master* (L3), *Pulse Tamer* (L4), *Signal Listener* (L5), *Time Keeper* (L6), *Serial Whisperer* (L7), *Two-Wire Talker* (L8), *Speed Chip* (L9), *Code Architect* (L10), *PIO Wizard* (L11), *Dual Core Hero* (L12), *Motor Commander* (L13), *Angle Ace* (L14), *Stepper Sage* (L15), *Distance Detective* (L16), *Balance Brain* (L17), *Wireless Voyager* (L18), *Power Keeper* (L19), *System Thinker* (L20).
- Project badges use robot-build names: *Power Plant* (P1), *Brain Onboard* (P2), *Driver Installed* (P3), *First Roll* (P4), *Encoder Eyes* (P5), *Smooth Operator* (P6), *Sonar Snout* (P7), *Obstacle Dodger* (P8), *Line Spotter* (P9), *Track Runner* (P10), *Inner Compass* (P11), *True Heading* (P12), *Screen On* (P13), *Rainbow Rider* (P14), *Sound Effects* (P15), *Mode Switch* (P16), *Radio Hands* (P17), *Pocket Pilot* (P18), *Mission Monitor* (P19), *Grand Roboticist* (P20).
- Each badge has an SVG file in `public/badges/{slug}.svg`. The LLM should create simple, distinct flat-style SVGs (≈128×128 viewBox) using the primary/accent palette. It's acceptable to use a shared template SVG with varied icon glyphs (lucide-react glyphs exported to SVG) and a shared outer ring so all 40 feel like a collection.

---

## 17. Environment Variables

`.env.example`:

```
# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=glm-4.7-flash:latest

# App
APP_NAME="Kush's Pico Academy"
LEARNER_NAME=Kush

# Paths (advanced; leave default)
DATA_DIR=./data
CONTENT_DIR=./public/data
UPLOADS_DIR=./public/data/uploads
```

---

## 18. Setup & Running

Document in `README.md`:

```bash
# 1. Install deps
pnpm install

# 2. Copy env
cp .env.example .env

# 3. Start Ollama separately (assumed)
#    ollama pull glm-4.7-flash:latest
#    ollama serve

# 4. Seed content + DB
pnpm seed

# 5. (Optional) Generate quiz pools
pnpm quiz:generate

# 6. Dev
pnpm dev

# 7. Production on home network
pnpm build
pnpm start -- -H 0.0.0.0 -p 3000
```

Access from any device on the LAN at `http://<home-server-ip>:3000`.

---

## 19. Package scripts

`package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "seed": "tsx scripts/seed.ts",
    "quiz:generate": "tsx scripts/generate-quiz-pools.ts",
    "quiz:regen": "tsx scripts/generate-quiz-pools.ts --force"
  }
}
```

Dependencies (minimum):
`next react react-dom typescript tailwindcss postcss autoprefixer clsx tailwind-merge framer-motion lucide-react canvas-confetti better-sqlite3 react-markdown remark-gfm rehype-highlight @uiw/react-md-editor recharts zod tsx`
DevDeps: `@types/node @types/react @types/better-sqlite3 eslint eslint-config-next`.

---

## 20. Acceptance Criteria (the build is "done" when all are true)

1. Running `pnpm install && pnpm seed && pnpm dev` on a clean machine (Node 20+, Ollama optional) starts the app at `http://localhost:3000` with **no console errors**.
2. **Dashboard** shows "Good {period}, Kush", today's date formatted like `Monday, April 19th 2026`, two animated progress rings (lessons 0/20, projects 0/20), a "Next up: Lesson 1 — Meet the Pico 2 & Your First Blink" card, a rank of **Cadet**, 5 recent-activity placeholders, and a fact of the day.
3. **/lessons** lists all 20 lesson cards in order. Only Lesson 1 is clickable; lessons 2–20 show a lock overlay with the correct prerequisite text.
4. **/lessons/lesson-1** renders the seeded markdown with code block syntax highlighting, shows sticky notes (empty initially) with add/edit/delete working, comments (empty) with post/delete working, uploads tabs for Code and Documents both working with correct extension validation, a completion checklist of 4 steps, a working summary form, and a working link to `/lessons/lesson-1/quiz`.
5. **Editing**: navigating to `/lessons/lesson-1/edit`, changing the title and body, and saving, persists on reload and updates both the DB and `public/data/lessons/lesson-1/content.md`.
6. **Quiz**: with Ollama running, `POST /api/lessons/lesson-1/quiz/generate` writes a 30-question pool; `/lessons/lesson-1/quiz` presents 10 randomly sampled questions, grades them, logs an attempt; scoring ≥ 7 sets "Pass quiz" step to satisfied.
7. **Complete**: once code is uploaded, summary is saved, and quiz is passed, clicking Mark Complete triggers a confetti burst, shows the "First Spark" badge, and (since Kush crosses 1 completed) promotes him to **Spark Scout**. Status persists across reload.
8. **Projects**: `/projects` remains gated until all 20 lessons are completed. (Verify by temporarily flipping completion flags.)
9. **Badges page** shows 40 tiles with correct earned/unearned state and earned-on dates; hovering an earned tile tilts it.
10. **Profile page** shows current rank, four stat cards with correct numbers, a recharts line chart of cumulative completions, and a history list.
11. **Locked states** return HTTP 403 from the relevant API routes and never let the UI submit data for locked items.
12. **Animations** are smooth, and `prefers-reduced-motion` disables them.
13. **Design**: passes a visual smell test — looks modern, light-themed, blue+purple accented, uses the defined palette, has consistent card style and typography.
14. **No login prompts, no role checks, no external network calls** other than to the configured Ollama server.

---

## 21. What the LLM should NOT do

- Do **not** add authentication, OAuth, NextAuth, or a roles system.
- Do **not** switch databases (no Postgres, no Prisma — better-sqlite3 only).
- Do **not** use Mermaid, KaTeX, or video embeds in markdown.
- Do **not** add dark mode toggle (light theme only per spec).
- Do **not** host anywhere but the home network (no Vercel-specific code paths, no edge runtime).
- Do **not** add a mascot character or illustrated brand character. Clean modern only.
- Do **not** invent extra pages beyond those in Section 4.
- Do **not** use frontmatter in markdown — metadata lives in SQLite.
- Do **not** skip seeding the 40 markdown files; they must exist after `pnpm seed`.

---

## 22. Suggested implementation order (for the generating LLM)

1. Scaffold Next.js + Tailwind + shadcn + the listed deps. Configure CSS variables.
2. Implement `lib/db.ts`, `lib/curriculum.ts`, `lib/badges.ts`, `lib/rank.ts`, `lib/progress.ts`, `lib/content.ts`, `lib/date.ts`, `lib/slug.ts`, `lib/ollama.ts`, `lib/quiz.ts`, `lib/uploads.ts`.
3. Implement `scripts/seed.ts` — make sure running it produces all 40 markdown files and all DB rows.
4. Build `app/layout.tsx` with `TopNav` (Dashboard / Lessons / Projects / Badges / Profile).
5. Build API routes in the order: `progress` → `lessons` list → `lessons/[slug]` → notes → comments → uploads → summary → quiz (get/post) → complete → badges → projects (mirror) → `ollama/health` → quiz generate.
6. Build pages in the order: Dashboard → Lessons list → Lesson detail → Lesson edit → Quiz → Projects mirror → Badges → Profile.
7. Wire up animations and confetti last.
8. Run `scripts/generate-quiz-pools.ts` against a running Ollama to fill quiz pools.
9. Manually walk through the **Acceptance Criteria** (Section 20) and fix any misses.

---

*End of specification. The generating LLM has everything it needs. No decisions are left to make — only code to write.*