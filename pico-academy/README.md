# Kush's Pico Academy

A single-player learning platform for mastering the Raspberry Pi Pico 2 and building an autonomous robot — built with Next.js, SQLite, and a local Ollama AI tutor.

## Overview

Pico Academy is a gamified curriculum with **20 lessons** and **20 robot-build projects**, each with:
- Markdown content with code examples
- AI-generated quizzes (via Ollama)
- Badge rewards for completion
- Progress tracking and rank system

## Architecture

```
app/              → Next.js App Router pages & API routes
components/       → React UI components (dashboard, lessons, badges, etc.)
lib/              → Server utilities (db, progress, badges, quiz, rank, etc.)
public/data/      → Static content (lesson markdown, project markdown, quiz pools)
public/badges/    → SVG badge icons (40 unique badges)
data/             → SQLite database (auto-created)
scripts/          → Seed & quiz-pool generation scripts
```

### Tech Stack
- **Framework**: Next.js 15 (App Router, Server Components)
- **Styling**: Tailwind CSS v4
- **Database**: SQLite via better-sqlite3
- **AI**: Ollama (local LLM for quiz generation & AI tutor)
- **Language**: TypeScript

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm
- [Ollama](https://ollama.ai) running locally with `glm-4.7-flash:latest`

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment config
cp .env.example .env

# Seed the database and generate quiz pools
pnpm run seed
pnpm run generate-quizzes

# Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to start learning.

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API endpoint |
| `OLLAMA_MODEL` | `glm-4.7-flash:latest` | Model for quiz & AI features |
| `APP_NAME` | `Kush's Pico Academy` | Display name |
| `LEARNER_NAME` | `Kush` | Learner's first name |
| `DATA_DIR` | `./data` | SQLite database directory |
| `CONTENT_DIR` | `./public/data` | Lesson/project content |
| `UPLOADS_DIR` | `./public/data/uploads` | Upload storage |

## Curriculum

### Lessons (1–20)
Covers GPIO, PWM, ADC, timers, UART, I2C, SPI, PIO, dual-core, motors, servos, steppers, sensors, IMU, Wi-Fi, power management, and system design.

### Projects (1–20)
Build an autonomous robot step-by-step: power module, motor driver, encoders, PID control, ultrasonic sensing, line following, IMU navigation, OLED display, Neopixels, buzzer, Bluetooth, Wi-Fi control, and telemetry.

## Rank System

Progress through ranks as you complete lessons and projects:
- **Spark** → **Tinkerer** → **Builder** → **Engineer** → **Inventor** → **Architect** → **Wizard** → **Sage** → **Legend** → **Grand Roboticist**

## License

Private — built for Kush.
