import { ProtectedLayout } from "@/components/Layout";
import { trpc } from "@/providers/trpc";
import { useLocation, useNavigate } from "react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Save,
  FileText,
  TrendingUp,
  CheckCircle,
  Loader2,
  Sparkles,
  BarChart3,
  DollarSign,
  Globe,
} from "lucide-react";

export default function ResearchResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const { result } = location.state || {};

  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [report, setReport] = useState("");
  const [scores, setScores] = useState<any>(null);

  const saveMutation = trpc.product.create.useMutation();
  const validateMutation = trpc.analysis.validateProduct.useMutation();
  const reportMutation = trpc.analysis.generateReport.useMutation();

  if (!result) {
    return (
      <ProtectedLayout>
        <div className="text-center py-20">
          <p className="text-slate-500 mb-4">কোনো রিসার্চ ফলাফল পাওয়া যায়নি</p>
          <Button onClick={() => navigate("/research")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            রিসার্চে ফিরে যান
          </Button>
        </div>
      </ProtectedLayout>
    );
  }

  const handleSaveProduct = async () => {
    setIsSaving(true);
    try {
      await saveMutation.mutateAsync({
        asin: result.asin,
        title: result.title,
        price: result.mockData?.price,
        rating: result.mockData?.rating,
        reviewCount: result.mockData?.reviewCount,
        bsr: result.mockData?.bsr,
        salesEstimate: result.mockData?.salesEstimate,
        sellerCount: result.mockData?.sellerCount,
        fbaSellers: result.mockData?.fbaSellers,
        reviewVelocity: result.mockData?.reviewVelocity,
        marketplace: result.marketplace,
      });
      alert("প্রোডাক্ট সেভ হয়েছে! ✅");
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidate = async () => {
    try {
      const scoreResult = await validateMutation.mutateAsync({
        productId: 1, // Will be updated after save
        productData: {
          price: parseFloat(result.mockData?.price || "25"),
          reviewCount: result.mockData?.reviewCount || 100,
          bsr: result.mockData?.bsr || 5000,
          sellerCount: result.mockData?.sellerCount || 10,
          category: "general",
        },
      });
      setScores(scoreResult);
    } catch (error) {
      console.error(error);
    }
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      const reportResult = await reportMutation.mutateAsync({
        title: result.title,
        asin: result.asin,
        analysis: result.analysis,
        scores: scores || { totalScore: 85, grade: "B", recommendation: "সতর্কতা (CAUTION)" },
      });
      setReport(reportResult.report);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/research")}
              className="rounded-xl"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                রিসার্চ ফলাফল
              </h1>
              <p className="text-sm text-slate-500">
                {result.title} ({result.asin})
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleSaveProduct}
              disabled={isSaving}
              className="rounded-xl"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              সেভ করুন
            </Button>
            <Button
              onClick={handleGenerateReport}
              disabled={isGeneratingReport}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600"
            >
              {isGeneratingReport ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              রিপোর্ট জেনারেট
            </Button>
          </div>
        </div>

        {/* Product Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "প্রাইজ",
              value: `$${result.mockData?.price}`,
              icon: DollarSign,
              color: "text-green-600",
              bg: "bg-green-50 dark:bg-green-900/20",
            },
            {
              label: "BSR",
              value: `#${result.mockData?.bsr?.toLocaleString()}`,
              icon: BarChart3,
              color: "text-blue-600",
              bg: "bg-blue-50 dark:bg-blue-900/20",
            },
            {
              label: "রেটিং",
              value: `${result.mockData?.rating}/5`,
              icon: TrendingUp,
              color: "text-purple-600",
              bg: "bg-purple-50 dark:bg-purple-900/20",
            },
            {
              label: "মার্কেটপ্লেস",
              value: result.marketplace,
              icon: Globe,
              color: "text-orange-600",
              bg: "bg-orange-50 dark:bg-orange-900/20",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label} className="border-0 shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${item.bg} rounded-lg flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 ${item.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">{item.label}</p>
                      <p className="text-lg font-bold text-slate-800 dark:text-white">
                        {item.value}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Content */}
        <Tabs defaultValue="analysis" className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-800 p-1 rounded-xl">
            <TabsTrigger value="analysis" className="rounded-lg">
              <Sparkles className="h-4 w-4 mr-2" />
              AI বিশ্লেষণ
            </TabsTrigger>
            <TabsTrigger value="validation" className="rounded-lg">
              <CheckCircle className="h-4 w-4 mr-2" />
              13-পয়েন্ট স্কোর
            </TabsTrigger>
            <TabsTrigger value="report" className="rounded-lg">
              <FileText className="h-4 w-4 mr-2" />
              বাংলা রিপোর্ট
            </TabsTrigger>
          </TabsList>

          {/* AI Analysis Tab */}
          <TabsContent value="analysis">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  AI-জেনারেটেড বিশ্লেষণ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed">
                    {result.analysis}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Validation Tab */}
          <TabsContent value="validation">
            <Card className="border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  13-পয়েন্ট ভ্যালিডেশন
                </CardTitle>
                {!scores && (
                  <Button onClick={handleValidate} className="rounded-xl">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    স্কোর ক্যালকুলেট করুন
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {scores ? (
                  <div className="space-y-6">
                    {/* Overall Score */}
                    <div className="text-center p-6 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-700 rounded-xl">
                      <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white dark:bg-slate-800 shadow-lg mb-4">
                        <span className="text-3xl font-bold text-blue-600">
                          {scores.grade}
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-slate-800 dark:text-white">
                        {scores.totalScore} / 130
                      </p>
                      <p className="text-lg text-slate-600 dark:text-slate-300 mt-2">
                        {scores.recommendation}
                      </p>
                    </div>

                    {/* Score Breakdown */}
                    <div className="space-y-3">
                      {[
                        { label: "প্রাইজ রেঞ্জ ($15-$50)", score: scores.priceScore },
                        { label: "সাইজ ও ওজন", score: scores.sizeWeightScore },
                        { label: "মার্কেট সাইজ", score: scores.marketSizeScore },
                        { label: "রিভিউ ব্যারিয়ার", score: scores.reviewBarrierScore },
                        { label: "ডিফারেন্সিয়েশন", score: scores.differentiationScore },
                        { label: "সিজনালিটি", score: scores.seasonalityScore },
                        { label: "কমপ্লেক্সিটি", score: scores.complexityScore },
                        { label: "রিটার্ন রেট", score: scores.returnRateScore },
                        { label: "ব্র্যান্ড ডোমিনেন্স", score: scores.brandDominanceScore },
                        { label: "ট্রেন্ড", score: scores.trendScore },
                        { label: "ডিফেন্সিবিলিটি", score: scores.defensibilityScore },
                        { label: "ম্যানুফ্যাকচারেবিলিটি", score: scores.manufacturabilityScore },
                        { label: "নেট মার্জিন", score: scores.marginScore },
                      ].map((item) => (
                        <div key={item.label}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-slate-600 dark:text-slate-300">
                              {item.label}
                            </span>
                            <span className="text-sm font-semibold text-slate-800 dark:text-white">
                              {item.score}/10
                            </span>
                          </div>
                          <Progress
                            value={item.score * 10}
                            className="h-2"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">
                      স্কোর ক্যালকুলেট করতে বাটনে ক্লিক করুন
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Report Tab */}
          <TabsContent value="report">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  বাংলা রিসার্চ রিপোর্ট
                </CardTitle>
              </CardHeader>
              <CardContent>
                {report ? (
                  <div className="prose dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed">
                      {report}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 mb-4">
                      AI বাংলা রিপোর্ট জেনারেট করতে বাটনে ক্লিক করুন
                    </p>
                    <Button
                      onClick={handleGenerateReport}
                      disabled={isGeneratingReport}
                      className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600"
                    >
                      {isGeneratingReport ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      রিপোর্ট জেনারেট করুন
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedLayout>
  );
}
