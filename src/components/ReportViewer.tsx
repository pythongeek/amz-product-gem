import { useMemo } from "react";
import { parseReport, type ParsedReport, type ParsedSection } from "@/lib/report-parser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  ShieldCheck,
  Shield,
  BarChart3,
  DollarSign,
  Users,
  Target,
  Lightbulb,
  FileText,
  ChevronRight,
  Award,
} from "lucide-react";

/* ── Icon map for section types ── */
const sectionIcons: Record<string, React.ReactNode> = {
  "মার্কেট": <TrendingUp className="h-5 w-5" />,
  "market": <TrendingUp className="h-5 w-5" />,
  "কম্পিটিশন": <Users className="h-5 w-5" />,
  "competition": <Users className="h-5 w-5" />,
  "প্রফিট": <DollarSign className="h-5 w-5" />,
  "profit": <DollarSign className="h-5 w-5" />,
  "রিস্ক": <ShieldAlert className="h-5 w-5" />,
  "risk": <ShieldAlert className="h-5 w-5" />,
  "ঝুঁকি": <ShieldAlert className="h-5 w-5" />,
  "স্কোর": <BarChart3 className="h-5 w-5" />,
  "score": <BarChart3 className="h-5 w-5" />,
  "সুপারিশ": <Award className="h-5 w-5" />,
  "verdict": <Award className="h-5 w-5" />,
  "অ্যাকশন": <Target className="h-5 w-5" />,
  "action": <Target className="h-5 w-5" />,
  "ধাপ": <ChevronRight className="h-5 w-5" />,
  "ওভারভিউ": <FileText className="h-5 w-5" />,
  "overview": <FileText className="h-5 w-5" />,
};

function getSectionIcon(title: string): React.ReactNode {
  for (const [key, icon] of Object.entries(sectionIcons)) {
    if (title.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return <Lightbulb className="h-5 w-5" />;
}

/* ── Verdict Hero ── */
function VerdictHero({ report }: { report: ParsedReport }) {
  const { overallGrade, overallScore } = report;

  const config = {
    A: {
      label: "যান (GO)",
      sub: "ভালো সুযোগ — এগিয়ে যেতে পারেন",
      color: "bg-emerald-500",
      light: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      icon: <CheckCircle2 className="h-8 w-8" />,
    },
    B: {
      label: "সতর্কতা (CAUTION)",
      sub: "ঝুঁকি আছে — বিস্তারিত যাচাই করুন",
      color: "bg-amber-500",
      light: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      icon: <AlertTriangle className="h-8 w-8" />,
    },
    C: {
      label: "বর্জন (FAIL)",
      sub: "এড়িয়ে চলুন — ভালো বিকল্প খুঁজুন",
      color: "bg-red-500",
      light: "bg-red-50",
      text: "text-red-700",
      border: "border-red-200",
      icon: <XCircle className="h-8 w-8" />,
    },
  };

  const c = config[(overallGrade as "A" | "B" | "C") || "B"];
  const pct = Math.round(((overallScore || 85) / 130) * 100);

  return (
    <Card className={`border-0 shadow-xl overflow-hidden ${c.light}`}>
      <CardContent className="p-0">
        <div className={`${c.color} text-white p-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {c.icon}
              <div>
                <p className="text-sm opacity-90">চূড়ান্ত সুপারিশ</p>
                <h2 className="text-2xl font-bold">{c.label}</h2>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{overallGrade || "B"}</div>
              <div className="text-sm opacity-90">গ্রেড</div>
            </div>
          </div>
          <p className="mt-3 text-sm opacity-90">{c.sub}</p>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">সামগ্রিক স্কোর</span>
            <span className="text-lg font-bold text-slate-800">
              {overallScore || 85} / 130 ({pct}%)
            </span>
          </div>
          <Progress value={pct} className="h-3" />
          <div className="flex justify-between mt-2 text-xs text-slate-400">
            <span>০</span>
            <span>৬৫ (গড়)</span>
            <span>১৩০ (সর্বোচ্চ)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Score Card ── */
function ScoreCard({ section }: { section: ParsedSection }) {
  if (!section.rows) return null;

  // Try to extract score data from table rows
  const scores = section.rows
    .map((row) => {
      const keys = Object.keys(row);
      const nameKey = keys.find((k) => k.includes("ক্রাইটেরিয়া") || k.includes("Criteria")) || keys[0];
      const scoreKey = keys.find((k) => k.includes("স্কোর") || k.includes("Score")) || keys[1];
      const maxKey = keys.find((k) => k.includes("ম্যাক্স") || k.includes("Max")) || keys[2];
      return {
        name: row[nameKey] || "",
        score: parseInt(row[scoreKey]?.replace(/\D/g, "")) || 0,
        max: parseInt(row[maxKey]?.replace(/\D/g, "")) || 10,
      };
    })
    .filter((s) => s.name && !s.name.includes("মোট") && !s.name.includes("Total"));

  return (
    <div className="space-y-4">
      {scores.map((s) => {
        const pct = Math.round((s.score / s.max) * 100);
        const color = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";
        return (
          <div key={s.name}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-slate-600">{s.name}</span>
              <span className="text-sm font-semibold text-slate-800">
                {s.score}/{s.max}
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Risk Card ── */
function RiskCard({ section }: { section: ParsedSection }) {
  const items = section.items || [];

  const levels = {
    high: { label: "হাই রিস্ক", color: "bg-red-50 border-red-200 text-red-700", icon: <ShieldAlert className="h-4 w-4" /> },
    medium: { label: "মিডিয়াম রিস্ক", color: "bg-amber-50 border-amber-200 text-amber-700", icon: <Shield className="h-4 w-4" /> },
    low: { label: "লো রিস্ক", color: "bg-emerald-50 border-emerald-200 text-emerald-700", icon: <ShieldCheck className="h-4 w-4" /> },
  };

  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const level = item.includes("🔴") || item.includes("হাই") ? "high"
          : item.includes("🟡") || item.includes("মিডিয়াম") ? "medium"
          : item.includes("🟢") || item.includes("লো") ? "low"
          : "medium";
        const cfg = levels[level];
        const cleanItem = item.replace(/^[🔴🟡🟢\s*-]+/, "").trim();

        return (
          <Alert key={idx} className={`${cfg.color} border`}>
            <div className="flex items-start gap-2">
              {cfg.icon}
              <AlertDescription className="text-sm">{cleanItem}</AlertDescription>
            </div>
          </Alert>
        );
      })}
    </div>
  );
}

/* ── Action Card ── */
function ActionCard({ section }: { section: ParsedSection }) {
  return (
    <div className="space-y-3">
      {section.items?.map((item, idx) => (
        <div key={idx} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
            {idx + 1}
          </div>
          <p className="text-sm text-slate-700 pt-0.5">{item}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Table Card ── */
function TableCard({ section }: { section: ParsedSection }) {
  if (!section.rows || section.rows.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {section.headers?.map((h) => (
              <th key={h} className="text-left px-4 py-3 font-semibold text-slate-600">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {section.rows.map((row, idx) => (
            <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
              {section.headers?.map((h) => (
                <td key={h} className="px-4 py-2.5 text-slate-700">
                  {row[h]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Section Renderer ── */
function SectionCard({ section }: { section: ParsedSection }) {
  const icon = getSectionIcon(section.title || "");

  switch (section.type) {
    case "header":
      return null; // Already shown in hero

    case "verdict":
      return null; // Already shown in hero

    case "score":
      return (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="text-blue-600">{icon}</span>
              {section.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreCard section={section} />
          </CardContent>
        </Card>
      );

    case "risk":
      return (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="text-red-500">{icon}</span>
              {section.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RiskCard section={section} />
          </CardContent>
        </Card>
      );

    case "action":
      return (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="text-blue-600">{icon}</span>
              {section.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActionCard section={section} />
          </CardContent>
        </Card>
      );

    case "table":
      return (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="text-slate-500">{icon}</span>
              {section.title || "তথ্য সারণী"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TableCard section={section} />
          </CardContent>
        </Card>
      );

    case "bullet-list":
      return (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="text-slate-500">{icon}</span>
              {section.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {section.items?.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                  <ChevronRight className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      );

    case "paragraph":
      if (!section.content?.trim()) return null;
      return (
        <Card className="border-0 shadow-lg">
          {section.title && (
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="text-slate-500">{icon}</span>
                {section.title}
              </CardTitle>
            </CardHeader>
          )}
          <CardContent>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {section.content}
            </p>
          </CardContent>
        </Card>
      );

    default:
      return null;
  }
}

/* ── Main Report Viewer ── */
export default function ReportViewer({ markdown }: { markdown: string }) {
  const report = useMemo(() => parseReport(markdown), [markdown]);

  if (!markdown) {
    return (
      <div className="text-center py-12 text-slate-400">
        <FileText className="h-12 w-12 mx-auto mb-4" />
        <p>রিপোর্ট এখনো প্রস্তুত হয়নি</p>
      </div>
    );
  }

  // Group sections by type for better layout
  const mainSections = report.sections.filter(
    (s) => s.type !== "verdict" && s.type !== "score" && s.type !== "separator"
  );
  const scoreSection = report.sections.find((s) => s.type === "score");

  return (
    <div className="space-y-6">
      {/* Verdict Hero */}
      <VerdictHero report={report} />

      {/* Score Card (if separate from verdict) */}
      {scoreSection && <SectionCard section={scoreSection} />}

      {/* Main Content Sections */}
      <Accordion type="multiple" defaultValue={mainSections.slice(0, 3).map((_, i) => `section-${i}`)}>
        {mainSections.map((section, idx) => (
          <AccordionItem key={idx} value={`section-${idx}`} className="border-0 mb-4">
            <AccordionTrigger className="hover:no-underline py-0">
              <div className="w-full text-left">
                <SectionCard section={section} />
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-0">
              {/* Content already rendered inside card */}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Footer */}
      <div className="text-center text-xs text-slate-400 pt-4 border-t border-slate-100">
        <p>রিপোর্ট জেনারেটেড: {report.date} | MiniMax-M3 AI Engine</p>
      </div>
    </div>
  );
}
