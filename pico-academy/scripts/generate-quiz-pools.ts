import fs from "fs";
import path from "path";
import { allItems } from "../lib/curriculum";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL || "glm-4.7-flash:latest";
const MAX_RETRIES = 2;
const force = process.argv.includes("--force");
const root = process.cwd();

interface QuizQuestion {
    id: string;
    type: "mc" | "tf";
    prompt: string;
    choices?: string[];
    answer: number | boolean;
    explanation: string;
}

function poolPath(slug: string): string {
    return path.join(root, "public", "data", "quiz-pools", `${slug}.json`);
}

function contentPath(item: { kind: string; slug: string }): string {
    return path.join(root, "public", "data", `${item.kind}s`, item.slug, "content.md");
}

async function generateForItem(item: (typeof allItems)[0]): Promise<void> {
    const dest = poolPath(item.slug);

    if (!force && fs.existsSync(dest)) {
        console.log(`⏭  ${item.slug} — pool exists, skipping`);
        return;
    }

    const contentFile = contentPath(item);
    let content = "";
    if (fs.existsSync(contentFile)) {
        content = fs.readFileSync(contentFile, "utf-8");
    }

    const prompt = `You are generating a quiz for a 10-year-old student learning the Raspberry Pi Pico 2 and the C/C++ SDK.

Lesson title: ${item.title}
Topic: ${item.topic}
Difficulty: ${item.difficulty}

Lesson content (markdown):
---
${content}
---

Produce EXACTLY 30 quiz questions as JSON with this shape:
{
  "questions": [
    { "id": "q01", "type": "mc", "prompt": "...", "choices": ["A","B","C","D"], "answer": 0, "explanation": "..." },
    { "id": "q02", "type": "tf", "prompt": "...", "answer": true, "explanation": "..." }
  ]
}

Rules:
- Mix of "mc" (multiple choice, exactly 4 choices, \`answer\` is the zero-based index of the correct choice) and "tf" (true/false, \`answer\` is a boolean). Aim for ~70% mc and ~30% tf.
- Language simple enough for a 10-year-old, but technically correct.
- Prefer questions that test understanding, not trivia.
- All questions must be answerable from the lesson content above.
- Do NOT include any text before or after the JSON.`;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`🔄 ${item.slug} — attempt ${attempt}/${MAX_RETRIES}...`);

            const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: MODEL,
                    prompt,
                    stream: false,
                    options: { temperature: 0.7, num_predict: 4096 },
                }),
            });

            if (!response.ok) {
                throw new Error(`Ollama returned ${response.status}: ${await response.text()}`);
            }

            const data = (await response.json()) as { response: string };
            const text = data.response.trim();

            let questions: QuizQuestion[];
            const objMatch = text.match(/\{[\s\S]*"questions"[\s\S]*\}/);
            if (objMatch) {
                const parsed = JSON.parse(objMatch[0]) as { questions: QuizQuestion[] };
                questions = parsed.questions;
            } else {
                const arrMatch = text.match(/\[[\s\S]*\]/);
                if (!arrMatch) {
                    throw new Error("No JSON found in response");
                }
                questions = JSON.parse(arrMatch[0]);
            }

            if (!Array.isArray(questions) || questions.length === 0) {
                throw new Error("Parsed result is not a non-empty array");
            }

            // Validate structure
            for (const q of questions) {
                if (
                    typeof q.id !== "string" ||
                    typeof q.prompt !== "string" ||
                    typeof q.explanation !== "string"
                ) {
                    throw new Error("Invalid question structure detected");
                }
                if (q.type === "mc") {
                    if (!Array.isArray(q.choices) || q.choices.length !== 4 || typeof q.answer !== "number" || q.answer < 0 || q.answer > 3) {
                        throw new Error("Invalid MC question structure detected");
                    }
                } else if (q.type === "tf") {
                    if (typeof q.answer !== "boolean") {
                        throw new Error("Invalid TF question structure detected");
                    }
                }
            }

            const pool = {
                slug: item.slug,
                generatedAt: new Date().toISOString(),
                model: MODEL,
                questions,
            };

            const dir = path.dirname(dest);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(dest, JSON.stringify(pool, null, 2), "utf-8");
            console.log(`✅ ${item.slug} — ${questions.length} questions saved`);
            return;
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`❌ ${item.slug} attempt ${attempt} failed: ${msg}`);
            if (attempt === MAX_RETRIES) {
                console.error(`   Giving up on ${item.slug}`);
            }
        }
    }
}

async function main() {
    console.log(`Generating quiz pools for ${allItems.length} items...`);
    console.log(`Model: ${MODEL} | Force: ${force}`);
    console.log();

    let done = 0;
    for (const item of allItems) {
        await generateForItem(item);
        done++;
        console.log(`   Progress: ${done}/${allItems.length}`);
    }

    console.log("\nDone!");
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
