import { NextResponse } from "next/server";
import { readContent } from "@/lib/content";
import { getDb } from "@/lib/db";

interface PartItem {
  name: string;
  price: string | null;
}

interface ItemParts {
  slug: string;
  title: string;
  kind: "lesson" | "project";
  order: number;
  parts: PartItem[];
  total: string | null;
}

function cleanCell(value: string): string {
  return value
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .trim();
}

function parseBulletPart(text: string): PartItem | null {
  const dashPrice = text.match(/^(.+?)\s*[—–-]\s*(\$[\d.,]+|~\$[\d.,]+|from .+)$/i);
  const parenPrice = text.match(/^(.+?)\s*\((~?\$[\d.,]+|included in kit|optional.*?)\)$/i);

  if (dashPrice) {
    return { name: dashPrice[1].trim(), price: dashPrice[2].trim() };
  }
  if (parenPrice) {
    return { name: parenPrice[1].trim(), price: parenPrice[2].trim() };
  }
  if (text.length > 0) {
    return { name: text, price: null };
  }

  return null;
}

function parseParts(markdown: string): { parts: PartItem[]; total: string | null } {
  const parts: PartItem[] = [];
  let total: string | null = null;

  // Find the parts section, allowing emoji prefixes, heading variants, and suffix text.
  const sectionMatch = markdown.match(
    /^##\s+(?:[^\w\n]+\s*)?Parts\s+(?:you(?:'|’)ll|youll|you)?\s*need(?:\s*\([^\n]*\)|\s*:)?\s*$\n([\s\S]*?)(?=^##\s+|\n---\s*$|\n$)/im
  );
  if (!sectionMatch) return { parts, total };

  const section = sectionMatch[1];
  const seen = new Set<string>();

  for (const line of section.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for total in bold or plain text, including estimated ranges.
    const totalMatch = trimmed.match(/(?:estimated\s+)?total:?\**\s*[≈~]?\s*(\$[\d.,]+(?:\s*[–-]\s*\$[\d.,]+)?)/i);
    if (totalMatch) {
      total = totalMatch[1];
      continue;
    }

    if (trimmed.startsWith("- ")) {
      const text = trimmed.slice(2).trim();
      const parsed = parseBulletPart(text);
      if (parsed) {
        const key = `${parsed.name.toLowerCase()}::${parsed.price ?? ""}`;
        if (!seen.has(key)) {
          seen.add(key);
          parts.push(parsed);
        }
      }
      continue;
    }

    // Parse markdown table rows such as | Part | Price |
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const cells = trimmed
        .split("|")
        .slice(1, -1)
        .map((cell) => cleanCell(cell));

      if (cells.length < 1) continue;

      const first = cells[0]?.toLowerCase() ?? "";
      if (
        first === "part" ||
        first === "parts" ||
        first.includes("pin") ||
        /^-+$/.test(first.replace(/:/g, ""))
      ) {
        continue;
      }

      const partName = cells[0];
      const priceCell = cells[1] ?? null;

      if (/^total$/i.test(partName)) {
        if (priceCell && /(\$[\d.,]+)/.test(priceCell)) {
          total = priceCell.match(/(\$[\d.,]+)/)?.[1] ?? total;
        }
        continue;
      }

      if (partName) {
        const parsed: PartItem = {
          name: partName,
          price: priceCell && priceCell.length > 0 ? priceCell : null,
        };
        const key = `${parsed.name.toLowerCase()}::${parsed.price ?? ""}`;
        if (!seen.has(key)) {
          seen.add(key);
          parts.push(parsed);
        }
      }
    }
  }

  return { parts, total };
}

export async function GET() {
  const db = getDb();
  const items = db
    .prepare("SELECT slug, title, kind, order_index FROM items ORDER BY kind, order_index")
    .all() as { slug: string; title: string; kind: "lesson" | "project"; order_index: number }[];

  const result: ItemParts[] = [];

  for (const item of items) {
    const content = readContent(item.kind, item.slug);
    const { parts, total } = parseParts(content);
    if (parts.length > 0) {
      result.push({
        slug: item.slug,
        title: item.title,
        kind: item.kind,
        order: item.order_index,
        parts,
        total,
      });
    }
  }

  return NextResponse.json(result);
}
