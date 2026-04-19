# Kush's Pico Academy — Verification Checklist

> **How to use this document**
> After the LLM finishes generating the project, walk through every checkbox below in order. Each item is **independently testable** and has a **How to verify** step and an **Expected result**. Tick `[x]` when pass, leave `[ ]` when fail, and write the failure reason next to it.
>
> A build is considered complete only when **every** checkbox passes. Partial credit is not acceptable — each item maps to something explicit in `PICO_ACADEMY_SPEC.md`.
>
> Sections are ordered so you can verify incrementally while the LLM is still generating (structure → DB → API → pages → polish).
>
> **Legend:**
> - 🏗️ = Structural (file/folder exists)
> - ⚙️ = Functional (behavior works)
> - 🎨 = Visual (looks correct)
> - 🔒 = Constraint (something must NOT exist)

---

## Section 0 — Quick smoke test (do this first)

- [ ] ⚙️ `pnpm install` completes without errors on a clean clone.
- [ ] ⚙️ `pnpm seed` completes without errors.
- [ ] ⚙️ `pnpm dev` starts the server on port 3000.
- [ ] ⚙️ Opening `http://localhost:3000` shows the Dashboard with no console errors in the browser DevTools.
- [ ] ⚙️ `pnpm build` completes successfully (no TypeScript errors).
- [ ] ⚙️ `pnpm start` launches a production build that serves the site.
- [ ] ⚙️ Binding to `0.0.0.0` works: `pnpm start -- -H 0.0.0.0 -p 3000` makes the site reachable from another device on the LAN.

---

## Section 1 — Project scaffolding and dependencies

### 1.1 File structure (must match spec Section 4)

- [ ] 🏗️ `app/layout.tsx` exists.
- [ ] 🏗️ `app/page.tsx` exists.
- [ ] 🏗️ `app/globals.css` exists.
- [ ] 🏗️ `app/lessons/page.tsx` exists.
- [ ] 🏗️ `app/lessons/[slug]/page.tsx` exists.
- [ ] 🏗️ `app/lessons/[slug]/edit/page.tsx` exists.
- [ ] 🏗️ `app/lessons/[slug]/quiz/page.tsx` exists.
- [ ] 🏗️ `app/projects/page.tsx` exists.
- [ ] 🏗️ `app/projects/[slug]/page.tsx` exists.
- [ ] 🏗️ `app/projects/[slug]/edit/page.tsx` exists.
- [ ] 🏗️ `app/projects/[slug]/quiz/page.tsx` exists.
- [ ] 🏗️ `app/badges/page.tsx` exists.
- [ ] 🏗️ `app/profile/page.tsx` exists.
- [ ] 🏗️ `app/api/progress/route.ts` exists.
- [ ] 🏗️ `app/api/lessons/route.ts` exists.
- [ ] 🏗️ `app/api/lessons/[slug]/route.ts` exists.
- [ ] 🏗️ `app/api/lessons/[slug]/notes/route.ts` exists.
- [ ] 🏗️ `app/api/lessons/[slug]/comments/route.ts` exists.
- [ ] 🏗️ `app/api/lessons/[slug]/uploads/route.ts` exists.
- [ ] 🏗️ `app/api/lessons/[slug]/summary/route.ts` exists.
- [ ] 🏗️ `app/api/lessons/[slug]/quiz/route.ts` exists.
- [ ] 🏗️ `app/api/lessons/[slug]/quiz/generate/route.ts` exists.
- [ ] 🏗️ `app/api/lessons/[slug]/complete/route.ts` exists.
- [ ] 🏗️ Same 9 API routes exist under `app/api/projects/[slug]/...` (mirror of lessons).
- [ ] 🏗️ `app/api/badges/route.ts` exists.
- [ ] 🏗️ `app/api/ollama/health/route.ts` exists.
- [ ] 🏗️ `components/ui/` folder contains shadcn primitives actually used by the app (button, card, dialog, input, label, textarea, select, progress at minimum).
- [ ] 🏗️ `components/layout/TopNav.tsx` and `PageContainer.tsx` exist.
- [ ] 🏗️ `components/dashboard/` has `Greeting.tsx`, `ProgressRings.tsx`, `NextUpCard.tsx`, `RankCard.tsx`, `RecentActivity.tsx`, `FactOfTheDay.tsx`.
- [ ] 🏗️ `components/lessons/` has `LessonCard.tsx`, `LessonList.tsx`, `LessonHeader.tsx`, `MarkdownRenderer.tsx`, `MarkdownEditor.tsx`, `CompletionChecklist.tsx`, `StickyNotes.tsx`, `CommentsThread.tsx`, `UploadsPanel.tsx`, `SummaryForm.tsx`, `QuizRunner.tsx`.
- [ ] 🏗️ `components/badges/BadgeGrid.tsx` and `BadgeTile.tsx` exist.
- [ ] 🏗️ `components/profile/RankHeader.tsx`, `StatsStrip.tsx`, `TimelineChart.tsx` exist.
- [ ] 🏗️ `components/animations/ConfettiBurst.tsx`, `CountUp.tsx`, `ProgressRing.tsx` exist.
- [ ] 🏗️ `components/common/LockOverlay.tsx` and `EmptyState.tsx` exist.
- [ ] 🏗️ `lib/` contains: `db.ts`, `content.ts`, `curriculum.ts`, `progress.ts`, `rank.ts`, `badges.ts`, `ollama.ts`, `quiz.ts`, `uploads.ts`, `slug.ts`, `date.ts`.
- [ ] 🏗️ `public/data/lessons/lesson-1/` through `lesson-20/` exist, each containing `content.md` and an `assets/` folder (can be empty).
- [ ] 🏗️ `public/data/projects/project-1/` through `project-20/` exist, each containing `content.md` and an `assets/` folder.
- [ ] 🏗️ `public/data/quiz-pools/` folder exists (empty is fine until quiz generation is run).
- [ ] 🏗️ `public/data/uploads/` folder exists.
- [ ] 🏗️ `public/badges/` contains **exactly 40 SVG files**, one per badge slug (`lesson-1.svg` … `lesson-20.svg`, `project-1.svg` … `project-20.svg`).
- [ ] 🏗️ `data/` directory exists (SQLite file `pico-academy.db` may or may not exist pre-seed, but should exist after `pnpm seed`).
- [ ] 🏗️ `scripts/seed.ts` and `scripts/generate-quiz-pools.ts` exist.
- [ ] 🏗️ `.env.example`, `next.config.mjs`, `tailwind.config.ts`, `tsconfig.json`, `package.json`, `README.md` all exist.

### 1.2 Dependencies (check `package.json`)

- [ ] 🏗️ `next` version is 14 or higher.
- [ ] 🏗️ `react` and `react-dom` present.
- [ ] 🏗️ `typescript`, `@types/node`, `@types/react` present.
- [ ] 🏗️ `tailwindcss`, `postcss`, `autoprefixer` present.
- [ ] 🏗️ `framer-motion` present.
- [ ] 🏗️ `canvas-confetti` present.
- [ ] 🏗️ `better-sqlite3` + `@types/better-sqlite3` present.
- [ ] 🏗️ `react-markdown`, `remark-gfm`, `rehype-highlight` present.
- [ ] 🏗️ `@uiw/react-md-editor` present.
- [ ] 🏗️ `recharts` present.
- [ ] 🏗️ `lucide-react` present.
- [ ] 🏗️ `clsx` + `tailwind-merge` present.
- [ ] 🏗️ `zod` present.
- [ ] 🏗️ `tsx` present (for running scripts).
- [ ] 🏗️ `package.json` has scripts: `dev`, `build`, `start`, `lint`, `seed`, `quiz:generate`, `quiz:regen`.

### 1.3 Environment

- [ ] 🏗️ `.env.example` contains `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `APP_NAME`, `LEARNER_NAME`, `DATA_DIR`, `CONTENT_DIR`, `UPLOADS_DIR`.
- [ ] ⚙️ With `.env` missing, the app still runs with sensible defaults (except Ollama-dependent endpoints, which can fail gracefully).

### 1.4 Forbidden technology (spec Section 21)

- [ ] 🔒 No `next-auth`, `@auth/`, `clerk`, `iron-session`, or any auth package in `package.json`.
- [ ] 🔒 No `prisma`, `drizzle-orm`, `typeorm`, `mongoose`, or `pg` in `package.json`.
- [ ] 🔒 No `mermaid`, `katex`, `react-katex`, or video-embed packages.
- [ ] 🔒 No dark-mode toggle code (`next-themes` is acceptable if only light is used, but no toggle UI).
- [ ] 🔒 No Vercel-specific APIs (`@vercel/*`, `edge` runtime directives in route handlers).
- [ ] 🔒 No YAML frontmatter parser usage on lesson/project markdown (grep for `gray-matter`, `front-matter` — neither should be imported).

---

## Section 2 — Database (SQLite)

### 2.1 Schema (inspect `data/pico-academy.db` after `pnpm seed`)

Use `sqlite3 data/pico-academy.db ".schema"` to dump schema, or equivalent.

- [ ] 🏗️ Table `learner` exists with columns `id`, `display_name`, `created_at`; has a CHECK `id = 1`.
- [ ] 🏗️ Table `items` exists with exactly these columns: `id`, `kind`, `slug`, `order_index`, `title`, `description`, `topic`, `difficulty`, `estimated_minutes`.
- [ ] 🏗️ `items.kind` has CHECK constraint `('lesson','project')`.
- [ ] 🏗️ `items.difficulty` has CHECK constraint `('Beginner','Intermediate','Advanced')`.
- [ ] 🏗️ `items` has UNIQUE(kind, order_index) and UNIQUE slug.
- [ ] 🏗️ Table `item_progress` exists with `item_id` PK, `status`, `summary`, `best_quiz_score`, `last_quiz_score`, `completed_at`, `updated_at`.
- [ ] 🏗️ `item_progress.status` CHECK constraint `('not_started','in_progress','completed')`.
- [ ] 🏗️ Table `notes` exists with `id`, `item_id`, `content`, `color`, `created_at`, `updated_at`.
- [ ] 🏗️ Table `comments` exists with `id`, `item_id`, `author_name`, `content`, `created_at`.
- [ ] 🏗️ Table `uploads` exists with `id`, `item_id`, `category`, `original_name`, `stored_path`, `mime_type`, `size_bytes`, `created_at`.
- [ ] 🏗️ `uploads.category` CHECK constraint `('code','doc')`.
- [ ] 🏗️ Table `quiz_attempts` exists with `id`, `item_id`, `score`, `passed`, `details_json`, `created_at`.
- [ ] 🏗️ Table `badges` exists with `id`, `slug`, `item_slug`, `title`, `description`, `icon_path`.
- [ ] 🏗️ Table `badge_awards` exists with `badge_id` PK, `awarded_at`.
- [ ] 🏗️ Indexes exist: `idx_notes_item`, `idx_comments_item`, `idx_uploads_item`, `idx_quiz_item`.
- [ ] 🏗️ All foreign keys use `ON DELETE CASCADE`.

### 2.2 Seeded data

Run `sqlite3 data/pico-academy.db "SELECT kind, COUNT(*) FROM items GROUP BY kind;"`

- [ ] ⚙️ Exactly **20 rows** where `kind='lesson'`.
- [ ] ⚙️ Exactly **20 rows** where `kind='project'`.
- [ ] ⚙️ `items.order_index` covers 1..20 for lessons and 1..20 for projects (no gaps, no dups).
- [ ] ⚙️ Each item's `slug` matches the spec table exactly (`lesson-1`, `lesson-2`, … `project-20`).
- [ ] ⚙️ Each item's `title` matches spec Section 15.A.
- [ ] ⚙️ Each item's `difficulty` is one of Beginner/Intermediate/Advanced and matches spec table.
- [ ] ⚙️ Each item's `estimated_minutes` matches spec table.
- [ ] ⚙️ `badges` table has exactly **40 rows**, one per item slug.
- [ ] ⚙️ Badge titles match spec Section 16 (e.g., `First Spark`, `Light Conductor`, …, `Grand Roboticist`).
- [ ] ⚙️ `learner` table contains exactly 1 row with `display_name = 'Kush'`.
- [ ] ⚙️ No `item_progress` rows exist on a fresh seed (they're created lazily).
- [ ] ⚙️ No `badge_awards` rows exist on a fresh seed.

### 2.3 Idempotency

- [ ] ⚙️ Running `pnpm seed` a second time does not error.
- [ ] ⚙️ Running `pnpm seed` a second time does NOT overwrite an existing `public/data/lessons/lesson-1/content.md` if you've modified it. (Test: edit content.md, save, re-run seed, confirm your edit survived.)
- [ ] ⚙️ Running `pnpm seed` a second time does NOT duplicate rows in any table.

---

## Section 3 — Static content (40 markdown files)

For **each** of `lesson-1` … `lesson-20` and `project-1` … `project-20`, verify the file at `public/data/{kind}s/{kind}-N/content.md`:

- [ ] 🏗️ File exists and is non-empty.
- [ ] 🏗️ File contains an H1 heading matching the item's title.
- [ ] 🏗️ File contains a `## What you'll learn` section with 3–5 bullet points.
- [ ] 🏗️ File contains a `## Parts you'll need` section with a bullet list (or "None extra" if applicable).
- [ ] 🏗️ File contains a `## Background` section with at least 2 paragraphs.
- [ ] 🏗️ File contains a `## Wiring` section (or "No wiring needed for this lesson").
- [ ] 🏗️ File contains a `## The code` section with a fenced code block using ```c or ```cpp.
- [ ] 🏗️ The code block references Pico SDK functions (grep for `pico/stdlib.h` or similar real SDK headers).
- [ ] 🏗️ File contains `## Try it` and `## Challenge` sections.
- [ ] 🏗️ File contains a `## Summary` section (final paragraph).
- [ ] 🏗️ **Project files only**: additionally contain `## How this fits the robot`.
- [ ] 🔒 No YAML frontmatter (no `---` block at top with title/date/etc.).

Spot-check items (verify correctness of technical content):

- [ ] 🎨 `lesson-1/content.md` mentions BOOTSEL mode, `PICO_DEFAULT_LED_PIN`, and `sleep_ms`.
- [ ] 🎨 `lesson-8/content.md` mentions SSD1306, address `0x3C`, and `i2c0` at 400 kHz.
- [ ] 🎨 `lesson-13/content.md` mentions TB6612FNG (or a similar real H-bridge), PWMA/AIN1/AIN2/STBY pins.
- [ ] 🎨 `lesson-18/content.md` mentions `pico_cyw43_arch` (the CYW43 Wi-Fi arch) and at least one lwIP concept.
- [ ] 🎨 `project-4/content.md` references `drive(left, right)` and `stop()` helper functions.
- [ ] 🎨 `project-18/content.md` describes a `/drive?l=...&r=...` endpoint.

---

## Section 4 — API routes (functional tests)

Use `curl` or a browser DevTools Network tab. Start from a fresh seeded DB.

### 4.1 `GET /api/progress`

- [ ] ⚙️ Returns 200 with JSON shape `{ lessons:{total,completed,inProgress}, projects:{total,completed,inProgress,unlocked}, badges:{total,earned}, rank:{title, completedCount, nextTitle, itemsToNext} }`.
- [ ] ⚙️ On fresh DB: `lessons.total=20`, `lessons.completed=0`, `projects.total=20`, `projects.unlocked=false`, `badges.earned=0`, `rank.title='Cadet'`.

### 4.2 `GET /api/lessons`

- [ ] ⚙️ Returns 200, array of length 20.
- [ ] ⚙️ Items sorted by `order` ascending (1..20).
- [ ] ⚙️ Item 1 has `locked: false, lockReason: null`.
- [ ] ⚙️ Items 2..20 have `locked: true`, `lockReason` mentioning Lesson 1 (or the correct previous).
- [ ] ⚙️ Each item has fields: `slug, order, title, description, topic, difficulty, estimatedMinutes, status, locked, lockReason, bestQuizScore, completedAt`.

### 4.3 `GET /api/projects`

- [ ] ⚙️ Returns 200, array of length 20.
- [ ] ⚙️ **All 20 items** have `locked: true` with `lockReason` mentioning "Finish all lessons" (until all lessons are completed).

### 4.4 `GET /api/lessons/lesson-1`

- [ ] ⚙️ Returns 200 with item metadata + `content` (full markdown string).
- [ ] ⚙️ Includes arrays: `notes: []`, `comments: []`, `uploads: []`, `quizAttempts: []`.
- [ ] ⚙️ Includes `summary: null` and `quizPoolSize: <number>` (0 if not generated yet).
- [ ] ⚙️ `GET /api/lessons/lesson-5` returns **403** with `{ error: 'locked', lockReason }` on fresh DB.
- [ ] ⚙️ `GET /api/lessons/does-not-exist` returns **404**.

### 4.5 `PATCH /api/lessons/lesson-1`

- [ ] ⚙️ Sending `{ content: "# Changed" }` updates both the DB-backed GET response AND the file at `public/data/lessons/lesson-1/content.md`.
- [ ] ⚙️ Sending `{ title: "New title" }` updates `items.title` in the DB.
- [ ] ⚙️ File write is atomic (temp file then rename — no partial writes). Verify by reading code.
- [ ] ⚙️ PATCH with invalid difficulty (`"Expert"`) returns 400.

### 4.6 Notes CRUD

- [ ] ⚙️ `POST /api/lessons/lesson-1/notes` with `{ content: "test" }` → 201 returning note row with `id`.
- [ ] ⚙️ GET on lesson returns the new note in the `notes` array.
- [ ] ⚙️ `PATCH /api/lessons/lesson-1/notes` with `{ id, content: "edited" }` → 200, content updated.
- [ ] ⚙️ `PATCH` with `{ id, color: "pink" }` updates color.
- [ ] ⚙️ `DELETE /api/lessons/lesson-1/notes?id=<id>` → 200, subsequent GET shows the note gone.
- [ ] ⚙️ POSTing a note with `color: "orange"` (not in enum) returns 400 or silently falls back to default — spec says enum: yellow/pink/blue/green/purple.

### 4.7 Comments CRUD

- [ ] ⚙️ `POST /api/lessons/lesson-1/comments` with `{ content: "nice!" }` → 201; author defaults to "Kush".
- [ ] ⚙️ POST with `{ content: "hi", authorName: "Dad" }` uses "Dad".
- [ ] ⚙️ GET returns comments newest-first.
- [ ] ⚙️ `DELETE /api/lessons/lesson-1/comments?id=<id>` removes the comment.

### 4.8 Uploads

- [ ] ⚙️ `POST /api/lessons/lesson-1/uploads` with `category=code` and a `.c` file works → 201.
- [ ] ⚙️ The file is saved at `public/data/uploads/lesson-1/code/<timestamp>-<name>`.
- [ ] ⚙️ Uploading a `.exe` with `category=code` returns 400.
- [ ] ⚙️ Uploading a `.png` with `category=doc` works.
- [ ] ⚙️ Uploading a `.png` with `category=code` returns 400.
- [ ] ⚙️ Uploading a file > 10 MB returns 400.
- [ ] ⚙️ `DELETE` removes both the DB row and the file on disk.

### 4.9 Summary

- [ ] ⚙️ `PUT /api/lessons/lesson-1/summary` with `{ summary: "I blinked an LED..." }` → 200.
- [ ] ⚙️ Summary under 40 characters returns 400 (or returns 200 but the completion gate still considers it insufficient — spec requires min 40 chars for completion).
- [ ] ⚙️ After PUT, GET shows `summary` populated and `item_progress.status = 'in_progress'`.

### 4.10 Quiz pool generation

- [ ] ⚙️ With Ollama running (or a mock), `POST /api/lessons/lesson-1/quiz/generate` returns 200 and writes `public/data/quiz-pools/lesson-1.json`.
- [ ] ⚙️ The resulting JSON has shape `{ slug, generatedAt, model, questions: [...] }`.
- [ ] ⚙️ `questions` array has length **exactly 30**.
- [ ] ⚙️ Each question has `id`, `type ∈ {'mc','tf'}`, `prompt`, `answer`, `explanation`.
- [ ] ⚙️ MC questions have a `choices` array of length 4 and `answer` is an integer 0..3.
- [ ] ⚙️ TF questions have `answer` as boolean, no `choices`.
- [ ] ⚙️ Without Ollama, the endpoint returns a 500/502 with a helpful error message (not a silent hang).

### 4.11 Quiz take / grade

- [ ] ⚙️ `GET /api/lessons/lesson-1/quiz` returns exactly **10** questions sampled from the pool (assuming a pool exists).
- [ ] ⚙️ The response does NOT include the `answer` or `explanation` fields for any question.
- [ ] ⚙️ `POST /api/lessons/lesson-1/quiz` with `{ answers: [...] }` returns `{ score, passed, review }`.
- [ ] ⚙️ `passed === (score >= 7)`.
- [ ] ⚙️ `review` contains per-question correctness.
- [ ] ⚙️ The attempt is persisted in `quiz_attempts`.
- [ ] ⚙️ `item_progress.best_quiz_score` only updates if the new score is higher.
- [ ] ⚙️ `item_progress.last_quiz_score` always updates.

### 4.12 Complete

- [ ] ⚙️ `POST /api/lessons/lesson-1/complete` BEFORE completing the 3 gates returns 400 with a list of missing requirements.
- [ ] ⚙️ With all 3 gates satisfied, returns 200 with `{ ok: true, badge: {...}, rank: { title, previousTitle, promoted } }`.
- [ ] ⚙️ After success, `item_progress.status = 'completed'` and `completed_at` is set.
- [ ] ⚙️ A row is inserted into `badge_awards` for the matching badge.
- [ ] ⚙️ Calling `/complete` a second time is idempotent (does not duplicate badge_awards, does not re-promote).
- [ ] ⚙️ Completing `lesson-1` causes `lesson-2` to become unlocked in `/api/lessons`.
- [ ] ⚙️ Completing a locked item returns 403.

### 4.13 Badges

- [ ] ⚙️ `GET /api/badges` returns an array of 40, each with `{ slug, itemSlug, title, description, iconPath, earned, awardedAt }`.
- [ ] ⚙️ `iconPath` resolves (fetching `/badges/<slug>.svg` returns the SVG, 200 OK).
- [ ] ⚙️ `earned` is `true` only for completed items.

### 4.14 Ollama health

- [ ] ⚙️ `GET /api/ollama/health` returns `{ ok: true, model, latencyMs }` when Ollama is running.
- [ ] ⚙️ Returns `{ ok: false, error }` with a clear error when Ollama is unreachable.

### 4.15 Projects mirror

- [ ] ⚙️ All of the above project endpoints (`/api/projects/project-1/...`) exist and behave identically.
- [ ] ⚙️ Project endpoints return 403 on fresh DB (all projects locked).
- [ ] ⚙️ After all 20 lessons are marked completed, `/api/projects/project-1` returns 200 and `project-2` still 403.

---

## Section 5 — Dashboard page (`/`)

### 5.1 Greeting

- [ ] 🎨 Displays "Good morning, Kush" / "Good afternoon, Kush" / "Good evening, Kush" based on the local time.
- [ ] 🎨 Displays today's date formatted like "Monday, April 19th 2026" (ordinal suffix, full weekday and month).
- [ ] 🎨 Shows a rotating tagline that is stable within a day (refreshing twice on the same day shows the same tagline).
- [ ] 🎨 Shows the current rank title and rank badge icon on the right side of the hero.

### 5.2 Progress rings

- [ ] 🎨 Two concentric animated rings render for lessons and projects.
- [ ] 🎨 On page load, percentages animate from 0 to actual value over ~900ms.
- [ ] 🎨 The numbers (e.g., "7 / 20") use a count-up animation.
- [ ] ⚙️ Values match `/api/progress` exactly.

### 5.3 Next up card

- [ ] ⚙️ Shows the first unlocked, not-started item's title, topic chip, and estimated time.
- [ ] ⚙️ "Continue" button navigates to the corresponding detail page.
- [ ] ⚙️ When nothing is unlocked beyond current completions, gracefully shows "All caught up!" or equivalent.

### 5.4 Rank card

- [ ] 🎨 Shows current rank title (e.g., "Cadet") and a progress bar toward next rank.
- [ ] 🎨 Shows "N more to reach {next}" text.

### 5.5 Recent activity

- [ ] ⚙️ Shows the 5 most recent events across completions, badge awards, and quiz attempts.
- [ ] ⚙️ On a fresh DB, shows an empty state (not an error).

### 5.6 Fact of the day

- [ ] ⚙️ Shows a fact from a static seed list of ~40 facts.
- [ ] ⚙️ Fact is stable within a day (same on reload).

---

## Section 6 — Lessons list (`/lessons`)

- [ ] 🎨 Page header shows "Lessons", subtitle "20 steps to mastering the Pico", and an overall progress bar `X / 20 complete`.
- [ ] 🎨 Renders 20 cards in a 2-column grid at desktop widths.
- [ ] 🎨 Cards ordered 1 → 20.
- [ ] 🎨 Each card shows: order number (e.g., "01"), title, topic chip (colored per topic palette), difficulty chip, estimated minutes, truncated description, status pill, and a Start/Continue button.
- [ ] ⚙️ Locked cards display a `LockOverlay` with "Complete Lesson N−1 to unlock" and are not clickable.
- [ ] ⚙️ Clicking an unlocked card navigates to `/lessons/lesson-N`.
- [ ] 🎨 Status pill visually differs between Not started / In progress / Completed.

---

## Section 7 — Lesson detail (`/lessons/[slug]`)

### 7.1 Layout

- [ ] 🎨 Two-column layout at desktop (main content + sidebar).
- [ ] 🎨 Collapses to single column below ~1024px.

### 7.2 Header

- [ ] 🎨 Shows order number, title, topic chip, difficulty chip, estimated minutes, status pill.
- [ ] 🎨 An Edit link/button is visible in the top right, linking to `/lessons/[slug]/edit`.

### 7.3 Markdown renderer

- [ ] 🎨 Renders the full markdown body with GFM features (tables, task lists work).
- [ ] 🎨 Code blocks are syntax highlighted (test with a `c` block — keywords should be colored).
- [ ] 🎨 Images referenced with relative paths `./assets/foo.png` resolve correctly.

### 7.4 Completion checklist

- [ ] 🎨 Displays 4 steps: Upload code, Write summary, Pass quiz, Mark complete.
- [ ] ⚙️ Checkboxes reflect actual server-side state:
  - [ ] Step 1 ticks when at least one `category=code` upload exists.
  - [ ] Step 2 ticks when summary ≥ 40 chars.
  - [ ] Step 3 ticks when a `quiz_attempts` row with `passed=1` exists.
  - [ ] Step 4 button is disabled until steps 1–3 are satisfied.
- [ ] ⚙️ Clicking "Mark Complete" calls `/api/.../complete` and on success triggers confetti + celebration modal + updates the status pill.

### 7.5 Uploads panel

- [ ] 🎨 Two tabs: Code and Documents.
- [ ] ⚙️ Drag-and-drop file upload works.
- [ ] ⚙️ File picker upload works.
- [ ] 🎨 Lists uploaded files with original name, size, upload date.
- [ ] ⚙️ Each row has a Delete button that removes from DB + disk after confirming.
- [ ] 🎨 Code files are shown as file reference only (filename + size), NOT as an inline syntax-highlighted viewer.
- [ ] ⚙️ Extension validation is enforced client-side (rejects `.exe` upload via UI) AND server-side (per Section 4.8).

### 7.6 Summary form

- [ ] 🎨 Textarea for summary, with a character count.
- [ ] 🎨 Save button disabled below 40 chars.
- [ ] ⚙️ Save persists and refreshing the page shows the saved summary.

### 7.7 Sidebar — Sticky notes

- [ ] 🎨 Vertical stack of sticky-note elements, each with the chosen color.
- [ ] ⚙️ "Add note" creates a new note inline.
- [ ] ⚙️ Each note is editable in place (click → text area).
- [ ] ⚙️ Each note has a color picker (5 colors: yellow, pink, blue, green, purple).
- [ ] ⚙️ Each note has a delete button with confirmation.
- [ ] ⚙️ Changes persist across reload.

### 7.8 Sidebar — Comments

- [ ] 🎨 Newest-first list.
- [ ] 🎨 Input field + optional name + Post button.
- [ ] ⚙️ Posting works without a name (defaults to "Kush").
- [ ] ⚙️ Delete button removes comment and requires confirmation.

### 7.9 Locked state

- [ ] ⚙️ Visiting `/lessons/lesson-5` on fresh DB returns a 403-style page with a `LockOverlay` and clear "Complete Lesson 4 to unlock" text.
- [ ] ⚙️ The detail UI (notes, comments, uploads) is not accessible on locked items.

---

## Section 8 — Edit page (`/lessons/[slug]/edit`)

- [ ] 🎨 Form fields for: title, description (textarea), topic (dropdown of spec topics), difficulty (dropdown), estimated minutes (number input).
- [ ] 🎨 Markdown editor is `@uiw/react-md-editor` (a simple editor — NOT a fancy WYSIWYG, NOT split-pane-mandatory).
- [ ] 🎨 Editor is at least 500px tall by default.
- [ ] ⚙️ Save persists both the DB metadata and the `content.md` file.
- [ ] ⚙️ Cancel returns to the detail page without saving.
- [ ] ⚙️ After save, the lesson detail page reflects changes on reload.
- [ ] ⚙️ Invalid input (e.g., empty title, negative minutes) surfaces a visible error.

---

## Section 9 — Quiz page (`/lessons/[slug]/quiz`)

- [ ] 🎨 Presents exactly one question at a time.
- [ ] 🎨 Shows "Question X of 10" progress indicator.
- [ ] 🎨 Renders radio buttons for MC, a True/False toggle for TF.
- [ ] ⚙️ Next button is disabled until an answer is selected.
- [ ] ⚙️ No back button between questions.
- [ ] ⚙️ Brief green flash on selected correct-looking choice before advance — spec says "green flash + red shake" happen on **result screen** review. (Verify whichever interpretation the LLM built matches the spec: the flash/shake happens during the per-question review on the result screen, not live during the quiz, since correctness isn't sent with the questions.)
- [ ] ⚙️ After Q10, the app POSTs answers and displays the result screen.
- [ ] 🎨 If `score ≥ 7`: confetti burst, "Passed!" heading, per-question review with correctness, Continue button returning to detail page.
- [ ] 🎨 If `score < 7`: no confetti, "Keep going!" heading, review, Retake button that starts a fresh random sample.
- [ ] ⚙️ Retake samples fresh 10 from the pool of 30 (confirm by observing varied question IDs across attempts).
- [ ] ⚙️ If the pool has < 10 questions, an admin-visible warning appears with a "Generate pool" button that triggers the generate endpoint.

---

## Section 10 — Projects

### 10.1 Projects list (`/projects`)

- [ ] ⚙️ On fresh DB: entire page is gated, showing a centered `LockOverlay` with a robot SVG, progress bar for lessons, and "Finish the remaining N lessons to unlock the Robot Build".
- [ ] ⚙️ After all 20 lessons are completed: shows 20 project cards, with Project 1 unlocked and 2–20 locked.

### 10.2 Project detail (`/projects/[slug]`)

- [ ] 🎨 Identical layout to lesson detail.
- [ ] 🎨 Sidebar additionally includes a "Robot progress" mini-widget: 20 circles in a row, filled for completed projects, empty for not-started, current project pulsing.
- [ ] ⚙️ All four gates work identically to lessons.

### 10.3 Project quiz and edit

- [ ] ⚙️ `/projects/[slug]/quiz` mirrors lesson quiz behavior.
- [ ] ⚙️ `/projects/[slug]/edit` mirrors lesson edit behavior.

---

## Section 11 — Badges (`/badges`)

- [ ] 🎨 Grid of 40 tiles, 5 per row at desktop.
- [ ] 🎨 Earned tiles: full color, title, earned date, hover tilt animation.
- [ ] 🎨 Unearned tiles: grayscale, lock icon overlay, muted title, description replaced with "Complete {item title} to earn".
- [ ] 🎨 Page top shows "X / 40 earned" summary.
- [ ] ⚙️ Earned state matches DB reality (complete a lesson → reload → tile becomes earned).

---

## Section 12 — Profile (`/profile`)

- [ ] 🎨 `RankHeader` shows big rank title, SVG rank badge, and progress-to-next.
- [ ] 🎨 `StatsStrip` shows 4 cards with correct numbers:
  - Lessons completed X / 20
  - Projects completed X / 20
  - Badges earned X / 40
  - Quiz average (mean of `best_quiz_score` across completed items)
- [ ] 🎨 `TimelineChart` renders a recharts line chart with x=date, y=cumulative completions.
- [ ] 🎨 Completion history list below chart shows: date, kind+title, badge, final quiz score.
- [ ] ⚙️ On fresh DB: chart shows empty state, history shows "Nothing yet" rather than erroring.

---

## Section 13 — Navigation

- [ ] 🎨 Top nav bar is visible on every page.
- [ ] 🎨 Nav has exactly 5 entries: Dashboard, Lessons, Projects, Badges, Profile.
- [ ] 🎨 Active page is visually indicated (underline, color, etc.).
- [ ] 🎨 No sidebar nav (per spec answer: top nav only).
- [ ] 🎨 Clicking the site logo/name returns to Dashboard.
- [ ] 🔒 No login/logout button, no avatar dropdown with account settings, no theme toggle.

---

## Section 14 — Design system

### 14.1 Color palette (inspect `globals.css`)

- [ ] 🎨 CSS variables defined on `:root`: `--bg`, `--surface`, `--surface-muted`, `--border`, `--text`, `--text-muted`, `--primary`, `--primary-600`, `--primary-50`, `--accent`, `--accent-600`, `--success`, `--warning`, `--danger`, `--ring`.
- [ ] 🎨 Radii variables: `--radius-sm`, `--radius-md`, `--radius-lg`.
- [ ] 🎨 Shadow variable: `--shadow-card`.
- [ ] 🎨 Tailwind config extends colors to reference these via `rgb(var(--...) / <alpha-value>)`.
- [ ] 🎨 Visual check: primary hue is indigo, accent hue is purple, background is near-white (slate-50). Warm sunset / green / teal palettes are NOT used.

### 14.2 Typography

- [ ] 🎨 Body font is `Inter` (loaded via `next/font/google`).
- [ ] 🎨 Display font `Space Grotesk` is optionally used for large numbers (rings, stats).
- [ ] 🎨 Base font size is 16px with a consistent type scale.

### 14.3 Components

- [ ] 🎨 Cards consistently use the card treatment (rounded-lg, border, shadow-card, generous padding).
- [ ] 🎨 Primary buttons have a primary→accent hover gradient.
- [ ] 🎨 Topic chips use the color mapping from spec Section 13 (GPIO=slate, PWM=indigo, I2C=purple, etc.). Spot-check 3 of them.

---

## Section 15 — Animations

- [ ] 🎨 Page transitions are smooth (Framer Motion AnimatePresence).
- [ ] 🎨 Progress rings animate on mount.
- [ ] 🎨 Count-up numbers animate on view-enter (Dashboard stats, Profile stats).
- [ ] 🎨 Card hover lifts slightly and adds a soft shadow.
- [ ] 🎨 `ConfettiBurst` fires on completion success and on quiz pass (score ≥ 7). Two color bursts (primary + accent).
- [ ] 🎨 Rank promotion triggers a full-screen modal with scale-in animation and auto-dismiss after 5 seconds.
- [ ] 🎨 Quiz review: correct answers flash green; wrong answers shake (red).
- [ ] ⚙️ Toggling `prefers-reduced-motion: reduce` in OS/browser disables non-essential animations (no confetti, no shake, instant transitions).

---

## Section 16 — Quiz AI (Ollama) integration

- [ ] 🏗️ `lib/ollama.ts` calls `POST {OLLAMA_BASE_URL}/api/generate`.
- [ ] 🏗️ The prompt matches (semantically) the literal prompt in spec Section 12.
- [ ] ⚙️ `format: "json"` is requested where supported.
- [ ] ⚙️ Response is validated (with Zod or similar) to match the question shape before writing to disk.
- [ ] ⚙️ MC questions must have exactly 4 choices; validator rejects otherwise.
- [ ] ⚙️ TF questions must have `answer` as boolean.
- [ ] ⚙️ Retry logic: on parse failure, retries up to 2 times.
- [ ] ⚙️ `scripts/generate-quiz-pools.ts` iterates all 40 items.
- [ ] ⚙️ Script skips items whose pool already exists; `--force` regenerates all.
- [ ] ⚙️ Pool files land at `public/data/quiz-pools/{slug}.json`.

---

## Section 17 — File uploads (disk behavior)

- [ ] 🏗️ Uploaded code files land under `public/data/uploads/{slug}/code/`.
- [ ] 🏗️ Uploaded docs land under `public/data/uploads/{slug}/docs/`.
- [ ] 🏗️ Filenames are timestamp-prefixed to avoid collisions.
- [ ] ⚙️ Max file size 10 MB enforced server-side.
- [ ] ⚙️ Allowed code extensions: `.c .h .hpp .cpp .ino` only.
- [ ] ⚙️ Allowed doc extensions: `.png .jpg .jpeg .gif .pdf` only.
- [ ] ⚙️ Mime type and size are stored alongside.
- [ ] ⚙️ Deleting an upload removes the file on disk AND the DB row.

---

## Section 18 — Unlock & completion logic (end-to-end)

### 18.1 Unlock

- [ ] ⚙️ Fresh DB: only Lesson 1 is unlocked.
- [ ] ⚙️ After completing Lesson 1: Lesson 2 unlocks; Lessons 3–20 remain locked.
- [ ] ⚙️ Repeat up to Lesson 19 → Lesson 20 unlocks.
- [ ] ⚙️ All 20 lessons complete → Projects page unlocks, Project 1 is unlocked, Projects 2–20 locked.
- [ ] ⚙️ Completing Project 1 → Project 2 unlocks, etc.

### 18.2 Completion gating

- [ ] ⚙️ Trying to complete without a code upload fails with a helpful message.
- [ ] ⚙️ Trying to complete without a summary fails.
- [ ] ⚙️ Trying to complete without a passing quiz fails.
- [ ] ⚙️ Trying to complete a locked item fails with 403.

### 18.3 Badges & rank

- [ ] ⚙️ Completing an item inserts exactly one `badge_awards` row (idempotent on retries).
- [ ] ⚙️ Rank title advances at the correct thresholds per spec Section 9 (0, 1, 4, 8, 13, 18, 23, 28, 33, 38).
- [ ] ⚙️ Rank promotion modal fires only when the rank actually changes.

---

## Section 19 — README & operator experience

- [ ] 🏗️ `README.md` exists and includes all commands from spec Section 18.
- [ ] 🏗️ `README.md` mentions the Ollama prerequisite and `ollama pull glm-4.7-flash:latest` step.
- [ ] 🏗️ `README.md` explains how to reach the site from other LAN devices.
- [ ] 🏗️ `README.md` explains where content is stored (`public/data/`).
- [ ] 🏗️ `README.md` includes troubleshooting for common issues (port in use, Ollama not running, better-sqlite3 build failures).

---

## Section 20 — Spec constraint audit (the "Do NOT" list)

- [ ] 🔒 `grep -ri "next-auth\|nextauth\|@clerk\|iron-session" .` returns no matches in source.
- [ ] 🔒 `grep -ri "prisma\|drizzle\|typeorm\|mongoose" .` returns no matches.
- [ ] 🔒 `grep -ri "mermaid\|katex" .` returns no matches.
- [ ] 🔒 No dark-mode toggle is present in the UI.
- [ ] 🔒 `grep -ri "runtime.*edge\|export const runtime = 'edge'" app/` returns no matches.
- [ ] 🔒 No mascot character or consistent illustrated brand character appears on any page.
- [ ] 🔒 Navigation has exactly the 5 pages listed — no extra top-level routes leaked.
- [ ] 🔒 Markdown files do NOT contain YAML frontmatter (grep for `^---` at top of any `content.md`).
- [ ] 🔒 Only 20 lessons and 20 projects exist — not 19, not 21.

---

## Section 21 — End-to-end scripted walkthrough

Run this as a single coherent session to confirm the full system hangs together.

1. [ ] ⚙️ Fresh clone → `pnpm install && pnpm seed && pnpm dev`.
2. [ ] ⚙️ Open `/` → see "Cadet" rank, 0/20 lessons, 0/20 projects, 0/40 badges.
3. [ ] ⚙️ Click "Continue" on Next Up → lands on Lesson 1.
4. [ ] ⚙️ Add a sticky note → reload → note persists.
5. [ ] ⚙️ Add a comment → reload → comment persists.
6. [ ] ⚙️ Upload a `.c` file → reload → file listed.
7. [ ] ⚙️ Write a summary ≥ 40 chars → save → persists.
8. [ ] ⚙️ (With Ollama running) generate quiz pool → take quiz → score ≥ 7.
9. [ ] ⚙️ Mark complete → confetti + rank promotion modal (`Cadet → Spark Scout`) + badge earned.
10. [ ] ⚙️ Return to `/lessons` → Lesson 1 shows completed, Lesson 2 now unlocked.
11. [ ] ⚙️ Visit `/badges` → "First Spark" tile is colored, the other 39 are grayscale.
12. [ ] ⚙️ Visit `/profile` → Rank "Spark Scout", 1/20 lessons, 1/40 badges, timeline shows 1 data point.
13. [ ] ⚙️ Visit `/projects` → gated screen with "19 lessons remaining".
14. [ ] ⚙️ Edit Lesson 1 title → save → Dashboard "Next up" doesn't include lesson 1 (already done) but title change reflects in Lessons list.
15. [ ] ⚙️ (Manually flip `item_progress.status='completed'` for lessons 2–20 in SQLite as a shortcut.) Visit `/projects` → now unlocked, Project 1 available.
16. [ ] ⚙️ Stop the server, reopen → all state persists from DB.
17. [ ] ⚙️ Access the site from another device on the LAN → works identically.

---

## Section 22 — Final sign-off

- [ ] ✅ Every checkbox above is ticked.
- [ ] ✅ No errors in browser console during Section 21 walkthrough.
- [ ] ✅ No errors in server logs during Section 21 walkthrough.
- [ ] ✅ Visual quality matches the "modern, light, blue+purple, fun" brief (make a subjective call — if it looks generic or unpolished, send it back).
- [ ] ✅ The app is something a 10-year-old would be excited to log into every day.

---

*If any box above fails, feed the failing item back to the generating LLM with the exact checklist id (e.g., "Section 4.11 / item 3 failed: quiz response was leaking `answer` field") for a targeted fix.*