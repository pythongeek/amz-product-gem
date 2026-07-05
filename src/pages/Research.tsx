import { ProtectedLayout } from "@/components/Layout";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Globe,
  Loader2,
  Sparkles,
  Lightbulb,
  TrendingUp,
  Shield,
} from "lucide-react";

const marketplaces = [
  { value: "US", label: "🇺🇸 যুক্তরাষ্ট্র (US)", currency: "USD" },
  { value: "UK", label: "🇬🇧 যুক্তরাজ্য (UK)", currency: "GBP" },
  { value: "DE", label: "🇩🇪 জার্মানি (DE)", currency: "EUR" },
  { value: "CA", label: "🇨🇦 কানাডা (CA)", currency: "CAD" },
  { value: "FR", label: "🇫🇷 ফ্রান্স (FR)", currency: "EUR" },
  { value: "IT", label: "🇮🇹 ইতালি (IT)", currency: "EUR" },
  { value: "ES", label: "🇪🇸 স্পেন (ES)", currency: "EUR" },
  { value: "JP", label: "🇯🇵 জাপান (JP)", currency: "JPY" },
];

const experienceLevels = [
  { value: "beginner", label: "বিগিনার — নতুন শুরু করছি" },
  { value: "intermediate", label: "ইন্টারমিডিয়েট — কিছু অভিজ্ঞতা আছে" },
  { value: "advanced", label: "অ্যাডভান্সড — এক্সপার্ট" },
];

const budgetRanges = [
  { value: "500-2000", label: "$500 - $2,000" },
  { value: "2000-10000", label: "$2,000 - $10,000" },
  { value: "10000+", label: "$10,000+" },
];

const quickTemplates = [
  {
    name: "বিগিনার ফ্রেন্ডলি",
    icon: Lightbulb,
    desc: "নতুনদের জন্য — কম প্রতিযোগিতা, সহজ প্রোডাক্ট",
    color: "from-green-400 to-emerald-500",
  },
  {
    name: "হাই মার্জিন হান্টার",
    icon: TrendingUp,
    desc: "বেশি লাভ — মার্জিন প্রায়রিটি",
    color: "from-blue-400 to-indigo-500",
  },
  {
    name: "ফাস্ট লঞ্চ",
    icon: Sparkles,
    desc: "দ্রুত লঞ্চ — কম MOQ, সহজ সোর্সিং",
    color: "from-purple-400 to-pink-500",
  },
];

export default function Research() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const analyzeMutation = trpc.analysis.analyzeProduct.useMutation();

  const [url, setUrl] = useState("");
  const [keyword, setKeyword] = useState("");
  const [marketplace, setMarketplace] = useState("US");
  const [experience, setExperience] = useState(user?.experienceLevel || "");
  const [budget, setBudget] = useState(user?.budgetRange || "");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleResearch = async () => {
    const searchTerm = url || keyword;
    if (!searchTerm.trim()) return;

    setIsAnalyzing(true);
    try {
      // Extract ASIN from URL or use keyword as-is
      const asinMatch = url.match(/(?:dp|gp\/product)\/(\w{10})/);
      const asin = asinMatch ? asinMatch[1] : `KW-${Date.now()}`;

      const result = await analyzeMutation.mutateAsync({
        title: searchTerm,
        asin,
        marketplace,
        productUrl: url || undefined,
      });

      // Navigate to results page with state
      navigate("/research/results", {
        state: {
          result,
          searchConfig: {
            url,
            keyword,
            marketplace,
            experience,
            budget,
          },
        },
      });
    } catch (error) {
      console.error("Research error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <ProtectedLayout>
      <div className="space-y-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            প্রোডাক্ট রিসার্চ
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Amazon প্রোডাক্ট URL দিন বা কীওয়ার্ড দিয়ে সার্চ করুন
          </p>
        </div>

        {/* Main Input Card */}
        <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-slate-800/50 bg-white dark:bg-slate-800">
          <CardContent className="p-8 space-y-6">
            {/* Input Mode Selection */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium text-slate-700 dark:text-slate-200 mb-2 block">
                  Amazon প্রোডাক্ট URL
                </Label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    placeholder="https://amazon.com/dp/B08N5WRWNW"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      if (e.target.value) setKeyword("");
                    }}
                    className="pl-12 h-14 text-base rounded-xl border-slate-300 dark:border-slate-600"
                  />
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200 dark:border-slate-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white dark:bg-slate-800 px-4 text-slate-400">
                    অথবা
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-base font-medium text-slate-700 dark:text-slate-200 mb-2 block">
                  কীওয়ার্ড দিয়ে সার্চ
                </Label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    placeholder="যেমন: yoga block, kitchen organizer..."
                    value={keyword}
                    onChange={(e) => {
                      setKeyword(e.target.value);
                      if (e.target.value) setUrl("");
                    }}
                    className="pl-12 h-14 text-base rounded-xl border-slate-300 dark:border-slate-600"
                  />
                </div>
              </div>
            </div>

            {/* Marketplace & Profile */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2 block">
                  মার্কেটপ্লেস
                </Label>
                <Select value={marketplace} onValueChange={setMarketplace}>
                  <SelectTrigger className="rounded-xl h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {marketplaces.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2 block">
                  অভিজ্ঞতার লেভেল
                </Label>
                <Select value={experience} onValueChange={setExperience}>
                  <SelectTrigger className="rounded-xl h-12">
                    <SelectValue placeholder="নির্বাচন করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    {experienceLevels.map((e) => (
                      <SelectItem key={e.value} value={e.value}>
                        {e.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2 block">
                বাজেট রেঞ্জ
              </Label>
              <Select value={budget} onValueChange={setBudget}>
                <SelectTrigger className="rounded-xl h-12">
                  <SelectValue placeholder="বাজেট নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  {budgetRanges.map((b) => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Research Button */}
            <Button
              onClick={handleResearch}
              disabled={isAnalyzing || (!url && !keyword)}
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-lg shadow-blue-500/25 transition-all"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  AI বিশ্লেষণ চলছে...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  AI দিয়ে রিসার্চ করুন
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Quick Templates */}
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">
            কুইক স্টার্ট টেমপ্লেট
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {quickTemplates.map((template) => {
              const Icon = template.icon;
              return (
                <Card
                  key={template.name}
                  className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group overflow-hidden"
                  onClick={() => {
                    setKeyword(template.name);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <CardContent className="p-6 relative">
                    <div
                      className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${template.color} opacity-10 rounded-full -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform`}
                    />
                    <div
                      className={`w-12 h-12 bg-gradient-to-br ${template.color} rounded-xl flex items-center justify-center mb-4`}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-white mb-1">
                      {template.name}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {template.desc}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Tips */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-white mb-2">
                  রিসার্চ টিপস
                </h3>
                <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
                  <li>• সঠিক ASIN বা কীওয়ার্ড ব্যবহার করুন</li>
                  <li>• বিভিন্ন মার্কেটপ্লেসে তুলনা করুন</li>
                  <li>• 13-পয়েন্ট স্কোর মনোযোগ দিয়ে দেখুন</li>
                  <li>• FBA ক্যালকুলেটর দিয়ে প্রফিট চেক করুন</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  );
}
