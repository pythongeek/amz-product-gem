import { ProtectedLayout } from "@/components/Layout";
import { trpc } from "@/providers/trpc";
import { useLocation, useNavigate } from "react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
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
  Clock,
  Info,
} from "lucide-react";

export default function ResearchResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
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

  // Poll for job status
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
                {searchConfig?.keyword || searchConfig?.url} ({searchConfig?.marketplace || "US"})
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleSaveProduct}
              disabled={isSaving || !isCompleted}
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
              disabled={isGeneratingReport || !isCompleted}
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

        {/* Job Status */}
        {isPending && (
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
            <CardContent className="p-8">
              <div className="text-center">
                <Loader2 className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                  AI রিসার্চ চলছে...
                </h3>
                <p className="text-slate-600 dark:text-slate-300 mb-4">
                  আপনার রিসার্চ জব কিউতে আছে। এটি সম্পন্ন হতে ২-৫ মিনিট সময় লাগতে পারে।
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                  <Clock className="h-4 w-4" />
                  <span>Job ID: {result.jobId}</span>
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-800 rounded-full text-blue-700 dark:text-blue-300">
                    {jobStatus?.status || "pending"}
                  </span>
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
                <Button onClick={() => navigate("/research")} className="mt-4">
                  আবার চেষ্টা করুন
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Product Overview Cards - only show when completed */}
        {isCompleted && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "প্রাইজ",
                  value: "$N/A",
                  icon: DollarSign,
                  color: "text-green-600",
                  bg: "bg-green-50 dark:bg-green-900/20",
                },
                {
                  label: "BSR",
                  value: "#N/A",
                  icon: BarChart3,
                  color: "text-blue-600",
                  bg: "bg-blue-50 dark:bg-blue-900/20",
                },
                {
                  label: "রেটিং",
                  value: "N/A/5",
                  icon: TrendingUp,
                  color: "text-purple-600",
                  bg: "bg-purple-50 dark:bg-purple-900/20",
                },
                {
                  label: "মার্কেটপ্লেস",
                  value: searchConfig?.marketplace || "US",
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
                    {(user as any)?.experienceLevel === "beginner" && (
                      <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-xl text-sm flex items-start gap-3">
                        <Info className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                        <div>
                          <span className="font-bold text-yellow-800 dark:text-yellow-400 block mb-0.5">🔰 বিগিনার হান্টার গাইড</span>
                          আপনার অভিজ্ঞতা লেভেল <b>Beginner</b> সেট করা আছে। জটিল ম্যানুফ্যাকচারিং ও পেটেন্ট ঝামেলার এনালাইসিসগুলো নিচে আংশিক সংকুচিত করা হয়েছে। আপনার সেটিংস থেকে এটি পরিবর্তন করতে পারেন।
                        </div>
                      </div>
                    )}
                    <div className="prose dark:prose-invert max-w-none">
                      <div className="whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed">
                        {jobStatus?.result || "রিপোর্ট এখনো প্রস্তুত হয়নি।"}
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
                      <Button onClick={() => setScores(jobStatus?.scores)} className="rounded-xl">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        স্কোর দেখুন
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
                              {scores.grade || "B"}
                            </span>
                          </div>
                          <p className="text-2xl font-bold text-slate-800 dark:text-white">
                            {scores.totalScore || 85} / 130
                          </p>
                          <p className="text-lg text-slate-600 dark:text-slate-300 mt-2">
                            {scores.recommendation || "সতর্কতা (CAUTION)"}
                          </p>
                        </div>

                        {/* Score Breakdown */}
                        <div className="space-y-4">
                          {[
                            { label: "প্রাইজ রেঞ্জ ($15-$50)", score: scores.priceScore || 7, isAdvanced: false },
                            { label: "সাইজ ও ওজন", score: scores.sizeWeightScore || 8, isAdvanced: false },
                            { label: "মার্কেট সাইজ", score: scores.marketSizeScore || 7, isAdvanced: false },
                            { label: "রিভিউ ব্যারিয়ার", score: scores.reviewBarrierScore || 6, isAdvanced: false },
                            { label: "ডিফারেন্সিয়েশন", score: scores.differentiationScore || 7, isAdvanced: false },
                            { label: "সিজনালিটি", score: scores.seasonalityScore || 7, isAdvanced: false },
                            { label: "কমপ্লেক্সিটি", score: scores.complexityScore || 7, isAdvanced: true, tip: "ইলেকট্রনিক্স/ব্যাটারি/ভঙ্গুর উপাদানের আইনি ও লজিস্টিক জটিলতা" },
                            { label: "রিটার্ন রেট", score: scores.returnRateScore || 7, isAdvanced: true, tip: "ভঙ্গুর ও ফিটিং সংক্রান্ত প্রোডাক্টে কাস্টমার রিটার্নের হার" },
                            { label: "ব্র্যান্ড ডোমিনেন্স", score: scores.brandDominanceScore || 6, isAdvanced: false },
                            { label: "ট্রেন্ড", score: scores.trendScore || 7, isAdvanced: false },
                            { label: "ডিফেন্সিবিলিটি", score: scores.defensibilityScore || 7, isAdvanced: true, tip: "অন্য সেলারদের কপি করা প্রতিহত করার পেটেন্ট/ট্রেডমার্ক সক্ষমতা" },
                            { label: "ম্যানুফ্যাকচারেবিলিটি", score: scores.manufacturabilityScore || 7, isAdvanced: true, tip: "ফ্যাক্টরি সোর্সিং ও মোল্ড কাস্টমাইজেশন রিকোয়ারমেন্ট" },
                            { label: "নেট মার্জিন", score: scores.marginScore || 7, isAdvanced: false },
                          ].map((item) => {
                            const isLocked = (user as any)?.experienceLevel === "beginner" && item.isAdvanced;

                            return (
                              <div 
                                key={item.label} 
                                className={`relative p-2 rounded-lg transition-all ${
                                  isLocked ? "opacity-50 select-none bg-slate-50 dark:bg-slate-900/50" : ""
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                    {item.label}
                                    {isLocked && (
                                      <span className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-950/40 px-2 py-0.5 rounded-full font-bold">
                                        🔒 লকড (Beginner)
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-sm font-semibold text-slate-800 dark:text-white">
                                    {isLocked ? "--" : `${item.score}/10`}
                                  </span>
                                </div>
                                
                                {isLocked ? (
                                  <div className="text-xs text-slate-400 dark:text-slate-500 italic mt-1">
                                    {item.tip} (এটি দেখতে সেটিংস থেকে ইন্টারমিডিয়েট/অ্যাডভান্সড নির্বাচন করুন)
                                  </div>
                                ) : (
                                  <Progress value={item.score * 10} className="h-2" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">
                          স্কোর দেখতে বাটনে ক্লিক করুন
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
          </>
        )}
      </div>
    </ProtectedLayout>
  );
}
