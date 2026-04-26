import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { buildBadgeDefinitionsFromItems } from "./badges";

let db: Database.Database | null = null;

type Kind = "lesson" | "project";

function extractTitleFromContent(content: string, fallback: string): string {
  const heading = content.match(/^#\s+(.+)$/m);
  if (heading?.[1]) {
    return heading[1].trim();
  }
  return fallback;
}

function extractDescriptionFromContent(content: string, fallback: string): string {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (
      !line.startsWith("#") &&
      !line.startsWith("##") &&
      !line.startsWith("-") &&
      !line.startsWith("|") &&
      !line.startsWith(">") &&
      !line.startsWith("```")
    ) {
      return line.slice(0, 220);
    }
  }

  return fallback;
}

function syncItemsFromContent(dbInstance: Database.Database): void {
  const kinds: Kind[] = ["lesson", "project"];
  const insertItem = dbInstance.prepare(
    `INSERT OR IGNORE INTO items (kind, slug, order_index, title, description, topic, difficulty, estimated_minutes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const kind of kinds) {
    const baseDir = path.join(process.cwd(), "public", "data", `${kind}s`);
    if (!fs.existsSync(baseDir)) continue;

    const entries = fs
      .readdirSync(baseDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith(`${kind}-`))
      .map((entry) => entry.name)
      .sort((left, right) => {
        const leftOrder = Number(left.replace(`${kind}-`, ""));
        const rightOrder = Number(right.replace(`${kind}-`, ""));
        return leftOrder - rightOrder;
      });

    for (const slug of entries) {
      const order = Number(slug.replace(`${kind}-`, ""));
      if (!Number.isFinite(order)) continue;

      const contentFile = path.join(baseDir, slug, "content.md");
      const rawContent = fs.existsSync(contentFile)
        ? fs.readFileSync(contentFile, "utf-8")
        : "";

      const fallbackTitle = `${kind === "lesson" ? "Lesson" : "Project"} ${order}`;
      const title = extractTitleFromContent(rawContent, fallbackTitle);
      const description = extractDescriptionFromContent(
        rawContent,
        `${title} content is available in the lesson page.`
      );

      insertItem.run(
        kind,
        slug,
        order,
        title,
        description,
        "Systems",
        order <= 12 ? "Beginner" : order <= 24 ? "Intermediate" : "Advanced",
        kind === "lesson" ? 45 : 60
      );
    }
  }
}

function syncBadgesFromItems(dbInstance: Database.Database): void {
  const items = dbInstance
    .prepare(
      `SELECT kind, slug, title, order_index
       FROM items
       ORDER BY CASE kind WHEN 'lesson' THEN 0 ELSE 1 END, order_index ASC`
    )
    .all() as { kind: Kind; slug: string; title: string; order_index: number }[];

  const badges = buildBadgeDefinitionsFromItems(
    items.map((item) => ({
      kind: item.kind,
      slug: item.slug,
      title: item.title,
      orderIndex: item.order_index,
    }))
  );

  const insertBadge = dbInstance.prepare(
    `INSERT OR IGNORE INTO badges (slug, item_slug, title, description, icon_path)
     VALUES (?, ?, ?, ?, ?)`
  );

  for (const badge of badges) {
    insertBadge.run(
      badge.slug,
      badge.itemSlug,
      badge.title,
      badge.description,
      badge.iconPath
    );
  }
}

export function getDb(): Database.Database {
  if (db) return db;

  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, "pico-academy.db");
  db = new Database(dbPath);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS learner (
      id            INTEGER PRIMARY KEY CHECK (id = 1),
      display_name  TEXT NOT NULL DEFAULT 'Kush',
      created_at    INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS items (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      kind          TEXT NOT NULL CHECK (kind IN ('lesson','project')),
      slug          TEXT NOT NULL UNIQUE,
      order_index   INTEGER NOT NULL,
      title         TEXT NOT NULL,
      description   TEXT NOT NULL,
      topic         TEXT NOT NULL,
      difficulty    TEXT NOT NULL CHECK (difficulty IN ('Beginner','Intermediate','Advanced')),
      estimated_minutes INTEGER NOT NULL,
      UNIQUE(kind, order_index)
    );

    CREATE TABLE IF NOT EXISTS item_progress (
      item_id       INTEGER PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
      status        TEXT NOT NULL DEFAULT 'not_started'
                      CHECK (status IN ('not_started','in_progress','completed')),
      summary       TEXT,
      best_quiz_score INTEGER,
      last_quiz_score INTEGER,
      completed_at  INTEGER,
      updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS notes (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id       INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      content       TEXT NOT NULL,
      color         TEXT NOT NULL DEFAULT 'yellow',
      created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS comments (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id       INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      author_name   TEXT NOT NULL DEFAULT 'Kush',
      content       TEXT NOT NULL,
      created_at    INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS uploads (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id       INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      category      TEXT NOT NULL CHECK (category IN ('code','doc')),
      original_name TEXT NOT NULL,
      stored_path   TEXT NOT NULL,
      mime_type     TEXT NOT NULL,
      size_bytes    INTEGER NOT NULL,
      created_at    INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id       INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      score         INTEGER NOT NULL,
      passed        INTEGER NOT NULL,
      details_json  TEXT NOT NULL,
      created_at    INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS badges (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      slug          TEXT NOT NULL UNIQUE,
      item_slug     TEXT NOT NULL UNIQUE REFERENCES items(slug),
      title         TEXT NOT NULL,
      description   TEXT NOT NULL,
      icon_path     TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS badge_awards (
      badge_id      INTEGER PRIMARY KEY REFERENCES badges(id),
      awarded_at    INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_notes_item ON notes(item_id);
    CREATE INDEX IF NOT EXISTS idx_comments_item ON comments(item_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_uploads_item ON uploads(item_id);
    CREATE INDEX IF NOT EXISTS idx_quiz_item ON quiz_attempts(item_id, created_at);
  `);

  // Migrate: add bio and avatar_url columns if missing
  const cols = db.prepare("PRAGMA table_info(learner)").all() as { name: string }[];
  const colNames = new Set(cols.map((c) => c.name));
  if (!colNames.has("bio")) {
    db.exec("ALTER TABLE learner ADD COLUMN bio TEXT NOT NULL DEFAULT ''");
  }
  if (!colNames.has("avatar_url")) {
    db.exec("ALTER TABLE learner ADD COLUMN avatar_url TEXT NOT NULL DEFAULT ''");
  }

  // Ensure learner row exists
  db.prepare(
    "INSERT OR IGNORE INTO learner (id, display_name) VALUES (1, 'Kush')"
  ).run();

  syncItemsFromContent(db);
  syncBadgesFromItems(db);

  return db;
}
