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

function parseParts(markdown: string): { parts: PartItem[]; total: string | null } {
  const parts: PartItem[] = [];
  let total: string | null = null;

  // Find the "## Parts you'll need" section
  const sectionMatch = markdown.match(
    /## Parts you(?:'|')ll need\s*\n([\s\S]*?)(?=\n## |\n---|\n$)/i
  );
  if (!sectionMatch) return { parts, total };

  const section = sectionMatch[1];

  for (const line of section.split("\n")) {
    const trimmed = line.trim();

    // Check for total line
    const totalMatch = trimmed.match(/\*\*Total:\s*[≈~]?\s*(\$[\d.,]+)\*\*/);
    if (totalMatch) {
      total = totalMatch[1];
      continue;
    }

    // Parse list items: "- Item name — $price" or "- Item name (~$price)"
    if (trimmed.startsWith("- ")) {
      const text = trimmed.slice(2).trim();
      // Try "— $price" or "- $price" format
      const dashPrice = text.match(/^(.+?)\s*[—–-]\s*(\$[\d.,]+|~\$[\d.,]+|from .+)$/);
      // Try "(~$price)" or "($price)" format
      const parenPrice = text.match(/^(.+?)\s*\((~?\$[\d.,]+)\)$/);

      if (dashPrice) {
        parts.push({ name: dashPrice[1].trim(), price: dashPrice[2].trim() });
      } else if (parenPrice) {
        parts.push({ name: parenPrice[1].trim(), price: parenPrice[2].trim() });
      } else if (text.length > 0) {
        parts.push({ name: text, price: null });
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
