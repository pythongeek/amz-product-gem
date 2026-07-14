import { ProtectedLayout } from "@/components/Layout";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Info,
  Database,
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

const categories = [
  { value: "most_categories", label: "মোস্ট ক্যাটাগরি (১৫%)" },
  { value: "electronics", label: "ইলেকট্রনিক্স (৮%)" },
  { value: "home_kitchen", label: "হোম অ্যান্ড কিচেন (১৫%)" },
  { value: "clothing", label: "ক্লোথিং (৫-১৫%)" },
  { value: "jewelry", label: "জুয়েলারি (২০%)" },
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

const researchSteps = [
  { title: "আমাজন কানেকশন ও PA-API ভ্যালিডেশন", desc: "লাইভ ডাটা এক্সেস করার জন্য রিকোয়েস্ট তৈরি করা হচ্ছে...", icon: Globe },
  { title: "প্রোডাক্ট ডাটা এক্সট্রাকশন", desc: "প্রাইস, BSR, রেটিং এবং রিভিউ রিট্রিভ করা হচ্ছে...", icon: Search },
  { title: "ফি ডাটাবেজ ও প্লেবুক লোড", desc: "রেফারেল ও FBA ফি টেবিল ডাটা সিঙ্ক করা হচ্ছে...", icon: Database },
  { title: "AI কনসাল্টিং ইঞ্জিন রানিং", desc: "প্রফিটাবিলিটি এবং ফিজিবিলিটি বিশ্লেষণ করা হচ্ছে...", icon: Sparkles },
  { title: "১৩-পয়েন্ট স্কোর মূল্যায়ন", desc: "ভ্যালিডেশন রুব্রিক্স অনুসারে গ্রেড ক্যালকুলেট করা হচ্ছে...", icon: TrendingUp },
  { title: "রিপোর্ট ও একশন প্ল্যান কম্পাইল", desc: "চূড়ান্ত পিডিএফ এবং সুপারিশ প্রস্তুত করা হচ্ছে...", icon: Lightbulb },
];

export default function Research() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const analyzeMutation = trpc.analysis.analyzeProduct.useMutation();

  const [url, setUrl] = useState("");
  const [keyword, setKeyword] = useState("");
  const [marketplace, setMarketplace] = useState("US");
  const [experience, setExperience] = useState((user as any)?.experienceLevel || "beginner");
  const [budget, setBudget] = useState((user as any)?.budgetRange || "500-2000");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [activeStep, setActiveStep] = useState(0);

  // Timer and step progression logic
  useEffect(() => {
    let timer: any;
    let stepTimer: any;

    if (isAnalyzing) {
      setTimeLeft(60);
      setActiveStep(0);

      timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 1 ? prev - 1 : 1));
      }, 1000);

      stepTimer = setInterval(() => {
        setActiveStep((prev) => (prev < 5 ? prev + 1 : prev));
      }, 9500); // Progress to next step roughly every 9.5s
    }

    return () => {
      clearInterval(timer);
      clearInterval(stepTimer);
    };
  }, [isAnalyzing]);

  // Manual Ingestion States
  const [manualTitle, setManualTitle] = useState("");
  const [manualAsin, setManualAsin] = useState("");
  const [manualPrice, setManualPrice] = useState("29.99");
  const [manualWeight, setManualWeight] = useState("1.2");
  const [manualBsr, setManualBsr] = useState("15000");
  const [manualReviews, setManualReviews] = useState("120");
  const [manualRating, setManualRating] = useState("4.3");
  const [manualSellers, setManualSellers] = useState("8");
  const [manualCategory, setManualCategory] = useState("most_categories");
  const [hasBattery, setHasBattery] = useState(false);
  const [isElectronic, setIsElectronic] = useState(false);
  const [isFragile, setIsFragile] = useState(false);

  const handleResearch = async (isManualMode = false) => {
    const searchTerm = isManualMode ? manualTitle : (url || keyword);
    if (!searchTerm.trim()) return;

    setIsAnalyzing(true);
    try {
      const asin = isManualMode 
        ? manualAsin 
        : (url.match(/(?:dp|gp\/product)\/(\w{10})/) ? url.match(/(?:dp|gp\/product)\/(\w{10})/)![1] : `KW-${Date.now()}`);

      const result = await analyzeMutation.mutateAsync({
        title: searchTerm,
        asin,
        marketplace,
        productUrl: isManualMode ? undefined : (url || undefined),
        isManual: isManualMode,
        price: isManualMode ? parseFloat(manualPrice) : undefined,
        weight: isManualMode ? parseFloat(manualWeight) : undefined,
        bsr: isManualMode ? parseInt(manualBsr) : undefined,
        reviewCount: isManualMode ? parseInt(manualReviews) : undefined,
        rating: isManualMode ? parseFloat(manualRating) : undefined,
        sellerCount: isManualMode ? parseInt(manualSellers) : undefined,
        category: isManualMode ? manualCategory : undefined,
        hasBattery: isManualMode ? hasBattery : undefined,
        isElectronic: isManualMode ? isElectronic : undefined,
        isFragile: isManualMode ? isFragile : undefined,
      });

      // Navigate to results page with state
      navigate("/research/results", {
        state: {
          result,
          searchConfig: {
            url: isManualMode ? "" : url,
            keyword: isManualMode ? manualTitle : keyword,
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
            Amazon প্রোডাক্ট রিসার্চ বা ম্যানুয়াল ডাটা দিয়ে প্রফিট ও ভ্যালিডেশন নির্ণয় করুন
          </p>
        {/* Main Input Card with Tabs */}
        <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-slate-800/50 bg-white dark:bg-slate-800 overflow-hidden">
          <CardContent className="p-8">
            <Tabs defaultValue="single" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl">
                <TabsTrigger value="single" className="rounded-lg py-3 text-sm font-semibold">
                  🔍 সিঙ্গেল প্রোডাক্ট রিসার্চ
                </TabsTrigger>
                <TabsTrigger value="keyword" className="rounded-lg py-3 text-sm font-semibold">
                  🔍 কীওয়ার্ড/লিস্টিং বিশ্লেষণ
                </TabsTrigger>
              </TabsList>

              {/* Single Product Research */}
              <TabsContent value="single">
                <Tabs defaultValue="auto" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl">
                    <TabsTrigger value="auto" className="rounded-lg py-3 text-sm font-semibold">
                      🔍 স্বয়ংক্রিয় AI রিসার্চ
                    </TabsTrigger>
                    <TabsTrigger value="manual" className="rounded-lg py-3 text-sm font-semibold">
                      ✍️ ম্যানুয়াল প্রোডাক্ট এন্ট্রি (উন্নত)
                    </TabsTrigger>
                  </TabsList>

                  {/* Automatic Search */}
                  <TabsContent value="auto" className="space-y-6">
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
                        className="pl-12 h-14 text-base rounded-xl border-slate-300 dark:border-slate-600 focus-visible:ring-blue-500"
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
                        className="pl-12 h-14 text-base rounded-xl border-slate-300 dark:border-slate-600 focus-visible:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

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

                <Button
                  onClick={() => handleResearch(false)}
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
              </TabsContent>

              {/* Manual Entry */}
              <TabsContent value="manual" className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-2 block">প্রোডাক্ট নাম</Label>
                    <Input
                      placeholder="যেমন: Ergonomic Memory Foam Pillow"
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">ASIN</Label>
                    <Input
                      placeholder="যেমন: B08N5WRWNW"
                      value={manualAsin}
                      onChange={(e) => setManualAsin(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="mb-2 block">সেলিং প্রাইজ ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={manualPrice}
                      onChange={(e) => setManualPrice(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">ওজন (lbs)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={manualWeight}
                      onChange={(e) => setManualWeight(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">BSR (Best Sellers Rank)</Label>
                    <Input
                      type="number"
                      value={manualBsr}
                      onChange={(e) => setManualBsr(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">রিভিউ সংখ্যা</Label>
                    <Input
                      type="number"
                      value={manualReviews}
                      onChange={(e) => setManualReviews(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">অ্যাভারেজ রেটিং</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={manualRating}
                      onChange={(e) => setManualRating(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">সেলার সংখ্যা</Label>
                    <Input
                      type="number"
                      value={manualSellers}
                      onChange={(e) => setManualSellers(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-2 block">ক্যাটাগরি</Label>
                    <Select value={manualCategory} onValueChange={setManualCategory}>
                      <SelectTrigger className="rounded-xl h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-2 block">মার্কেটপ্লেস</Label>
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
                </div>

                {/* Switch style Checkboxes */}
                <div className="flex flex-wrap gap-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="battery" checked={hasBattery} onCheckedChange={(c) => setHasBattery(!!c)} />
                    <Label htmlFor="battery" className="cursor-pointer">ব্যাটারি আছে (Battery Included)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="electronic" checked={isElectronic} onCheckedChange={(c) => setIsElectronic(!!c)} />
                    <Label htmlFor="electronic" className="cursor-pointer">ইলেকট্রনিক ডিভাইস (Electronic)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="fragile" checked={isFragile} onCheckedChange={(c) => setIsFragile(!!c)} />
                    <Label htmlFor="fragile" className="cursor-pointer">কাঁচ বা ভঙ্গুর (Fragile / Glass)</Label>
                  </div>
                </div>

                {/* Keepa Helper Text Alert */}
                <div className="flex gap-3 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 text-sm text-blue-700 dark:text-blue-300">
                  <Info className="h-5 w-5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold block mb-0.5">💡 Keepa এক্সটেনশন টিপস</span>
                    আপনি যদি ক্রোম বা ফায়ারফক্স ব্রাউজারে ফ্রি <b>Keepa Extension</b> ব্যবহার করেন, তবে সেখান থেকে সরাসরি প্রোডাক্টের BSR, প্রাইস, ও রিভিউর সঠিক হিসাব এখানে বসাতে পারেন।
                  </div>
                </div>

                <Button
                  onClick={() => handleResearch(true)}
                  disabled={isAnalyzing || !manualTitle || !manualAsin}
                  className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-lg shadow-blue-500/25 transition-all"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      ম্যানুয়াল ভ্যালিডেশন চলছে...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      ডাটা সাবমিট ও স্কোর বের করুন
                    </>
                  )}
                </Button>
              {/* Keyword Research */}
              <TabsContent value="keyword">
                <KeywordResearchForm />
              </TabsContent>
            </Tabs>
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

      {/* Visual Loading Overlay with Countdown Timer and Process Steps */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <CardContent className="p-8 text-center space-y-6">
              {/* Circular Countdown Loader */}
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800" />
                <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-xl font-bold text-blue-600 dark:text-blue-400">
                  {timeLeft}s
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-950 dark:text-white flex items-center justify-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
                  স্মার্ট FBA রিসার্চ চলছে
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  গড় সময়কাল: ৬০ সেকেন্ড। আপনার প্রোডাক্ট ডেটা বিশ্লেষণ করা হচ্ছে।
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-full transition-all duration-1000 ease-out rounded-full" 
                  style={{ width: `${((60 - timeLeft) / 60) * 100}%` }}
                />
              </div>

              {/* Steps Progress List */}
              <div className="text-left space-y-4 pt-5 border-t border-slate-100 dark:border-slate-800">
                {researchSteps.map((step, idx) => {
                  const Icon = step.icon;
                  const isCurrent = idx === activeStep;
                  const isCompleted = idx < activeStep;
                  return (
                    <div 
                      key={step.title} 
                      className={`flex gap-3 transition-all duration-300 ${
                        isCurrent ? "opacity-100 scale-100 font-semibold" : isCompleted ? "opacity-60" : "opacity-30 scale-95"
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                        isCompleted 
                          ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400" 
                          : isCurrent 
                            ? "bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 animate-pulse" 
                            : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                      }`}>
                        {isCompleted ? "✓" : <Icon className="h-3.5 w-3.5" />}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          {step.title}
                          {isCurrent && <Loader2 className="h-3 w-3 animate-spin text-blue-600 dark:text-blue-400" />}
                        </h4>
                        {isCurrent && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            {step.desc}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </ProtectedLayout>
  );
}
