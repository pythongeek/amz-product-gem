import { ProtectedLayout } from "@/components/Layout";
import { trpc } from "@/providers/trpc";
import { useLocation, useNavigate } from "react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import ReportViewer from "@/components/ReportViewer";
import {
  ArrowLeft, Save, FileText, TrendingUp, CheckCircle, Loader2, Sparkles,
  BarChart3, DollarSign, Clock, AlertTriangle, XCircle, Zap, Shield,
} from "lucide-react";

export default function ResearchResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const { result, searchConfig } = location.state || {};

  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [report, setReport] = useState("");
  const [scores, setScores] = useState<any>(null);
  const [jobStatus, setJobStatus] = useState<any>(null);
  const [pollError, setPollError] = useState("");

  const saveMutation = trpc.product.create.useMutation();
  const reportMutation = trpc.analysis.generateReport.useMutation();
  const getJobStatus = trpc.job.getJobStatus.useQuery(
    { jobId: result?.jobId },
    { enabled: !!result?.jobId, refetchInterval: 2000 }
  );

  useEffect(() => {
    if (getJobStatus.data) {
      setJobStatus(getJobStatus.data);
      if (getJobStatus.data.status === "completed" && getJobStatus.data.scores) {
        setScores(getJobStatus.data.scores);
      }
      if (getJobStatus.data.error) {
        setPollError(getJobStatus.data.error);
      }
    }
  }, [getJobStatus.data]);

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

  const isPending = !jobStatus || jobStatus.status === "pending" || jobStatus.status === "running";
  const isCompleted = jobStatus?.status === "completed";
  const isFailed = jobStatus?.status === "failed" || pollError;

  const handleSaveProduct = async () => {
    if (!isCompleted) return;
    setIsSaving(true);
    try {
      await saveMutation.mutateAsync({
        asin: searchConfig?.asin || `KW-${Date.now()}`,
        title: searchConfig?.keyword || "Research Product",
        marketplace: searchConfig?.marketplace || "US",
      });
      alert("প্রোডাক্ট সেভ হয়েছে! ✅");
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!isCompleted) return;
    setIsGeneratingReport(true);
    try {
      const reportResult = await reportMutation.mutateAsync({
        title: searchConfig?.keyword || "Research Product",
        asin: searchConfig?.asin || "N/A",
        analysis: jobStatus?.result || "",
        scores: scores || { totalScore: 85, grade: "B", recommendation: "সতর্কতা (CAUTION)" },
      });
      setReport(reportResult.report);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const fullReportMarkdown = report || jobStatus?.result || "";

  const scoreItems = scores ? [
    { label: "প্রাইজ রেঞ্জ", score: scores.priceScore || 7, icon: DollarSign },
    { label: "সাইজ/ওজন", score: scores.sizeWeightScore || 8, icon: BarChart3 },
    { label: "মার্কেট সাইজ", score: scores.marketSizeScore || 7, icon: TrendingUp },
    { label: "রিভিউ ব্যারিয়ার", score: scores.reviewBarrierScore || 6, icon: CheckCircle },
    { label: "ডিফারেন্সিয়েশন", score: scores.differentiationScore || 7, icon: Sparkles },
    { label: "সিজনালিটি", score: scores.seasonalityScore || 7, icon: Clock },
    { label: "কমপ্লেক্সিটি", score: scores.complexityScore || 7, icon: Zap },
    { label: "রিটার্ন রেট", score: scores.returnRateScore || 7, icon: AlertTriangle },
    { label: "ব্র্যান্ড ডোমিনেন্স", score: scores.brandDominanceScore || 6, icon: BarChart3 },
    { label: "ট্রেন্ড", score: scores.trendScore || 7, icon: TrendingUp },
    { label: "ডিফেন্সিবিলিটি", score: scores.defensibilityScore || 7, icon: Shield },
    { label: "ম্যানুফ্যাকচারেবিলিটি", score: scores.manufacturabilityScore || 7, icon: Zap },
    { label: "নেট মার্জিন", score: scores.marginScore || 7, icon: DollarSign },
  ] : [];

  const totalScore = scores?.totalScore || 0;
  const grade = scores?.grade || "B";
  const recommendation = scores?.recommendation || "সতর্কতা (CAUTION)";
  const scorePct = Math.round((totalScore / 130) * 100);

  const gradeConfig: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
    A: { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: <CheckCircle className="h-5 w-5 text-emerald-600" /> },
    B: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", icon: <AlertTriangle className="h-5 w-5 text-amber-600" /> },
    C: { color: "text-red-700", bg: "bg-red-50", border: "border-red-200", icon: <XCircle className="h-5 w-5 text-red-600" /> },
  };
  const gc = gradeConfig[grade] || gradeConfig.B;

  return (
    <ProtectedLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/research")} className="rounded-xl">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">রিসার্চ ফলাফল</h1>
              <p className="text-sm text-slate-500">
                {searchConfig?.keyword || searchConfig?.url} ({searchConfig?.marketplace || "US"})
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleSaveProduct} disabled={isSaving || !isCompleted} className="rounded-xl">
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              সেভ করুন
            </Button>
            <Button onClick={handleGenerateReport} disabled={isGeneratingReport || !isCompleted} className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600">
              {isGeneratingReport ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
              {report ? "রিপোর্ট রিফ্রেশ" : "রিপোর্ট জেনারেট"}
            </Button>
          </div>
        </div>

        {/* Job Status */}
        {isPending && (
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
            <CardContent className="p-8">
              <div className="text-center">
                <Loader2 className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">AI রিসার্চ চলছে...</h3>
                <p className="text-slate-600 dark:text-slate-300 mb-4">
                  আপনার রিসার্চ জব কিউতে আছে। এটি সম্পন্ন হতে ২-৫ মিনিট সময় লাগতে পারে।
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                  <Clock className="h-4 w-4" />
                  <span>Job ID: {result.jobId}</span>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">{jobStatus?.status || "pending"}</Badge>
                </div>
                <Progress className="mt-4 h-2" value={isCompleted ? 100 : 30} />
              </div>
            </CardContent>
          </Card>
        )}

        {isFailed && (
          <Card className="border-0 shadow-lg bg-red-50 dark:bg-red-900/20">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-red-600 dark:text-red-400 font-medium">
                  রিসার্চ ব্যর্থ হয়েছে: {pollError || jobStatus?.error || "Unknown error"}
                </p>
                <Button onClick={() => navigate("/research")} className="mt-4">আবার চেষ্টা করুন</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        {isCompleted && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left sidebar */}
            <div className="lg:col-span-1 space-y-4">
              {/* Verdict Card */}
              <Card className={`border-0 shadow-xl overflow-hidden ${gc.bg}`}>
                <CardContent className="p-0">
                  <div className={`p-5 ${gc.bg.replace("50", "100")} border-b ${gc.border}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {gc.icon}
                        <span className={`font-bold ${gc.color}`}>চূড়ান্ত সুপারিশ</span>
                      </div>
                      <Badge className={`${gc.bg} ${gc.color} border ${gc.border} text-lg font-bold`}>{grade}</Badge>
                    </div>
                    <p className={`mt-2 text-sm ${gc.color} font-medium`}>{recommendation}</p>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-600">সামগ্রিক স্কোর</span>
                      <span className="text-lg font-bold text-slate-800">{totalScore} / 130</span>
                    </div>
                    <Progress value={scorePct} className="h-2.5" />
                    <div className="flex justify-between mt-1.5 text-xs text-slate-400">
                      <span>০</span><span>৬৫ (গড়)</span><span>১৩০</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Score Breakdown */}
              {scores && (
                <Card className="border-0 shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-blue-600" />
                      ১৩-পয়েন্ট স্কোর বিশ্লেষণ
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    {scoreItems.map((item) => {
                      const pct = (item.score / 10) * 100;
                      const barColor = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";
                      const Icon = item.icon;
                      return (
                        <div key={item.label}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <Icon className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-xs text-slate-600">{item.label}</span>
                            </div>
                            <span className="text-xs font-semibold text-slate-700">{item.score}/10</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right — Report Viewer */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="report" className="space-y-4">
                <TabsList className="bg-white dark:bg-slate-800 p-1 rounded-xl w-full">
                  <TabsTrigger value="report" className="rounded-lg flex-1">
                    <FileText className="h-4 w-4 mr-2" />এক্সিকিউটিভ রিপোর্ট
                  </TabsTrigger>
                  <TabsTrigger value="raw" className="rounded-lg flex-1">
                    <Sparkles className="h-4 w-4 mr-2" />কাঁচা বিশ্লেষণ
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="report" className="mt-0">
                  {fullReportMarkdown ? (
                    <ReportViewer markdown={fullReportMarkdown} />
                  ) : (
                    <Card className="border-0 shadow-lg">
                      <CardContent className="p-8 text-center">
                        <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 mb-4">AI রিপোর্ট জেনারেট করতে উপরের বাটনে ক্লিক করুন</p>
                        <Button onClick={handleGenerateReport} disabled={isGeneratingReport} className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600">
                          {isGeneratingReport ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                          রিপোর্ট জেনারেট করুন
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="raw" className="mt-0">
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-sm text-slate-500">
                        <Sparkles className="h-4 w-4" />AI-জেনারেটেড কাঁচা বিশ্লেষণ
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="whitespace-pre-wrap text-sm text-slate-600 leading-relaxed font-mono bg-slate-50 p-4 rounded-lg">
                        {jobStatus?.result || "কোনো বিশ্লেষণ পাওয়া যায়নি"}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
