/**
 * Parses AI-generated Bangla markdown report into structured sections.
 * Handles the specific format MiniMax-M3 generates for Amazon FBA reports.
 */

export interface ParsedSection {
  type: "header" | "table" | "bullet-list" | "risk" | "score" | "verdict" | "action" | "paragraph" | "separator";
  title?: string;
  content?: string;
  rows?: Array<Record<string, string>>;
  headers?: string[];
  items?: string[];
  level?: "high" | "medium" | "low";
  score?: number;
  maxScore?: number;
  grade?: string;
  recommendation?: string;
}

export interface ParsedReport {
  productName: string;
  marketplace: string;
  date: string;
  sections: ParsedSection[];
  overallScore?: number;
  overallGrade?: string;
  overallRecommendation?: string;
}

function extractTable(lines: string[], startIdx: number): { table: ParsedSection; nextIdx: number } {
  const headers: string[] = [];
  const rows: Array<Record<string, string>> = [];
  let i = startIdx;

  // Find header row (contains | separators)
  for (; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("|") && line.includes("|", 1)) {
      const cells = line.split("|").map(c => c.trim()).filter(Boolean);
      if (cells.length > 0 && !cells.every(c => c.match(/^[-\s|]+$/))) {
        headers.push(...cells);
        i++;
        break;
      }
    }
  }

  // Skip separator line
  if (i < lines.length && lines[i].trim().startsWith("|")) {
    i++;
  }

  // Read data rows
  for (; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith("|")) break;
    const cells = line.split("|").map(c => c.trim()).filter(Boolean);
    if (cells.length === 0) break;

    const row: Record<string, string> = {};
    cells.forEach((cell, idx) => {
      row[headers[idx] || `col${idx}`] = cell;
    });
    rows.push(row);
  }

  return {
    table: { type: "table", headers, rows },
    nextIdx: i,
  };
}

function detectSectionType(title: string): ParsedSection["type"] {
  const t = title.toLowerCase();
  if (t.includes("রিস্ক") || t.includes("ঝুঁকি") || t.includes("risk")) return "risk";
  if (t.includes("স্কোর") || t.includes("score") || t.includes("ভ্যালিডেশন")) return "score";
  if (t.includes("সুপারিশ") || t.includes("রেজাল্ট") || t.includes("verdict") || t.includes("recommendation")) return "verdict";
  if (t.includes("অ্যাকশন") || t.includes("ধাপ") || t.includes("action") || t.includes("step")) return "action";
  if (t.includes("ওভারভিউ") || t.includes("overview")) return "header";
  return "paragraph";
}

export function parseReport(markdown: string): ParsedReport {
  const lines = markdown.split("\n");
  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection | null = null;
  let productName = "Amazon FBA Research";
  let marketplace = "US";
  let date = new Date().toLocaleDateString("bn-BD");

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // H1 title
    if (trimmed.startsWith("# ")) {
      productName = trimmed.replace(/^#\s*/, "").replace(/\s*-\s*Amazon FBA.*$/i, "").trim();
      sections.push({ type: "header", title: productName, content: trimmed });
      i++;
      continue;
    }

    // H2/H3 section headers
    if (trimmed.match(/^#{2,3}\s/)) {
      // Flush previous section
      if (currentSection && currentSection.content) {
        sections.push(currentSection);
      }

      const title = trimmed.replace(/^#{2,3}\s*/, "").trim();
      const sectionType = detectSectionType(title);
      currentSection = { type: sectionType, title, content: "" };
      i++;
      continue;
    }

    // Table
    if (trimmed.startsWith("|") && trimmed.includes("|", 1)) {
      const { table, nextIdx } = extractTable(lines, i);
      if (table.headers && table.headers.length > 0) {
        sections.push(table);
      }
      i = nextIdx;
      continue;
    }

    // Bullet points
    if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
      if (!currentSection) {
        currentSection = { type: "bullet-list", items: [] };
      }
      if (currentSection.type !== "bullet-list") {
        if (currentSection.content) sections.push(currentSection);
        currentSection = { type: "bullet-list", items: [] };
      }
      const item = trimmed.replace(/^[-*]\s*/, "").trim();
      currentSection.items = [...(currentSection.items || []), item];
      i++;
      continue;
    }

    // Numbered list (action items)
    if (trimmed.match(/^\d+[\.।]\s/)) {
      if (!currentSection) {
        currentSection = { type: "action", items: [] };
      }
      if (currentSection.type !== "action") {
        if (currentSection.content) sections.push(currentSection);
        currentSection = { type: "action", items: [] };
      }
      const item = trimmed.replace(/^\d+[\.।]\s*/, "").trim();
      currentSection.items = [...(currentSection.items || []), item];
      i++;
      continue;
    }

    // Separator (---)
    if (trimmed === "---") {
      if (currentSection && currentSection.content) {
        sections.push(currentSection);
        currentSection = null;
      }
      sections.push({ type: "separator" });
      i++;
      continue;
    }

    // Regular paragraph content
    if (!currentSection) {
      currentSection = { type: "paragraph", content: trimmed };
    } else {
      currentSection.content = (currentSection.content || "") + "\n" + trimmed;
    }
    i++;
  }

  // Flush last section
  if (currentSection && (currentSection.content || currentSection.items?.length)) {
    sections.push(currentSection);
  }

  // Extract overall score/grade from verdict section
  let overallScore: number | undefined;
  let overallGrade: string | undefined;
  let overallRecommendation: string | undefined;

  for (const section of sections) {
    if (section.type === "verdict" && section.content) {
      const scoreMatch = section.content.match(/(\d+)\s*\/\s*130/);
      if (scoreMatch) overallScore = parseInt(scoreMatch[1]);

      const gradeMatch = section.content.match(/গ্রেড[:\s]*([ABC])/i) || section.content.match(/Grade[:\s]*([ABC])/i);
      if (gradeMatch) overallGrade = gradeMatch[1];

      if (section.content.includes("GO") || section.content.includes("যান")) {
        overallRecommendation = "GO";
      } else if (section.content.includes("CAUTION") || section.content.includes("সতর্কতা")) {
        overallRecommendation = "CAUTION";
      } else if (section.content.includes("FAIL") || section.content.includes("বর্জন")) {
        overallRecommendation = "FAIL";
      }
    }
  }

  return {
    productName,
    marketplace,
    date,
    sections,
    overallScore,
    overallGrade,
    overallRecommendation,
  };
}
