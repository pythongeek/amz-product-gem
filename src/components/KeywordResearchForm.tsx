import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Loader2, Search, Globe, Sparkles } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useNavigate } from "react-router";
import { useState, useEffect } from "react";
import { parseAmazonSearchInput } from "@/lib/amazon-url";

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

const researchSteps = [
  { title: "কীওয়ার্ড পার্স করা হচ্ছে", desc: "আমাজন সার্চ URL বা কীওয়ার্ড বিশ্লেষণ করা হচ্ছে...", icon: Search },
  { title: "আমাজন সার্চ ডেটা রিট্রিভ করা হচ্ছে", desc: "PA-API এর মাধ্যমে সংশ্লিষ্ট প্রোডাক্ট ডেটা আনছি...", icon: Globe },
  { title: "প্রতিটি লিস্টিং বিশ্লেষণ", desc: "রিভিউ, রেটিং এবং প্রাইস বিশ্লেষণ করা হচ্ছে...", icon: Sparkles },
  { title: "তুলনামূলক স্কোর ক্যালকুলেট", desc: "মার্কেটের তুলনায় প্রতিটি প্রোডাক্টের স্কোর বের করা হচ্ছে...", icon: Sparkles },
  { title: "AI সারাংশ রিপোর্ট তৈরি", desc: "ব্যবসায়ীর জন্য উপযুক্ত সুপারিশ প্রস্তুত করা হচ্ছে...", icon: Sparkles },
];

export default function KeywordResearchForm() {
  const navigate = useNavigate();
  const analyzeMutation = trpc.keywordResearch.analyze.useMutation();
  
  const [input, setInput] = useState("");
  const [marketplace, setMarketplace] = useState("US");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [activeStep, setActiveStep] = useState(0);

  // Parse input to determine marketplace
  const { keyword, marketplace: detectedMarketplace } = parseAmazonSearchInput(input);
  
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
        setActiveStep((prev) => (prev < 4 ? prev + 1 : prev));
      }, 10000); // Progress to next step roughly every 10s
    }
    
    return () => {
      clearInterval(timer);
      clearInterval(stepTimer);
    };
  }, [isAnalyzing]);
  
  const handleResearch = async () => {
    if (!input.trim()) return;
    
    setIsAnalyzing(true);
    try {
      const result = await analyzeMutation.mutateAsync({
        input,
        marketplace,
      });
      
      // Navigate to results page with state
      navigate("/research/keyword-results", {
        state: { searchId: result.searchId },
      });
    } catch (error) {
      console.error("Keyword research error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  return (
    <Card className="border-0 shadow-lg bg-white dark:bg-slate-800 overflow-hidden">
      <CardContent className="p-8">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">
          কীওয়ার্ড বা সার্চ URL দিয়ে প্রোডাক্ট বিশ্লেষণ
        </h2>
        
        <div className="space-y-6">
          <div>
            <Label className="text-base font-medium text-slate-700 dark:text-slate-200 mb-2 block">
              আমাজন সার্চ URL অথবা কীওয়ার্ড পেস্ট করুন
            </Label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                placeholder="https://www.amazon.com/s?k=plant+basket OR plant basket"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  // Auto-detect marketplace from URL
                  if (e.target.value) {
                    const detected = parseAmazonSearchInput(e.target.value);
                    setMarketplace(detected.marketplace);
                  }
                }}
                className="pl-12 h-14 text-base rounded-xl border-slate-300 dark:border-slate-600 focus-visible:ring-blue-500"
              />
            </div>
            {input && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                <span className="font-medium">কীওয়ার্ড:</span> {keyword} | 
                <span className="font-medium">মার্কেটপ্লেস:</span> {detectedMarketplace}
              </p>
            )}
          </div>
          
          <div>
            <Label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2 block">
              মার্কেটপ্লেস (যদি স্বয়ংক্রিয় সনাক্তকরণ ভুল হয়)
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
          
          <Button
            onClick={handleResearch}
            disabled={isAnalyzing || !input.trim()}
            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-lg shadow-blue-500/25 transition-all"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                বিশ্লেষণ চলছে...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                কীওয়ার্ড বিশ্লেষণ করুন
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}