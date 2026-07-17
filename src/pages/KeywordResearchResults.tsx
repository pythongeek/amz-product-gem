import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, TrendingUp, Target, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface LocationState {
  searchId: number;
}

export default function KeywordResearchResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const { searchId } = (location.state as LocationState) || {};
  
  const [pollingInterval, setPollingInterval] = useState(2000);
  
  const {
    data: searchData,
    isLoading,
    isError,
    error,
  } = trpc.keywordResearch.getStatus.useQuery(
    { searchId: searchId! },
    {
      enabled: !!searchId,
      refetchInterval: pollingInterval,
      refetchIntervalInBackground: false,
      retry: 3,
    }
  );

  useEffect(() => {
    if (searchData?.status === "completed" || searchData?.status === "failed") {
      setPollingInterval(0); // Stop polling once completed or failed
    }
  }, [searchData?.status]);

  if (!searchId) {
    return (
      <Card className="border-0 shadow-lg max-w-2xl mx-auto mt-16">
        <CardContent className="p-12 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">ত্রুটি</h3>
          <p className="text-slate-500">কোনো অনুসন্ধান ID পাওয়া যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।</p>
          <Button onClick={() => navigate("/research")} className="mt-6">
            ফিরে যান
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg max-w-4xl mx-auto mt-8">
        <CardContent className="p-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="text-lg font-medium">ফলাফল প্রক্রিয়াকরণ হচ্ছে...</span>
          </div>
          <p className="text-slate-500">অনুগ্রহ করে অপেক্ষা করুন, আমরা আপনার কীওয়ার্ড বিশ্লেষণ করছি।</p>
        </CardContent>
      </Card>
    );
  }

  if (isError || !searchData) {
    return (
      <Card className="border-0 shadow-lg max-w-2xl mx-auto mt-16">
        <CardContent className="p-12 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">ত্রুটি ঘটেছে</h3>
          <p className="text-slate-500">{error?.message || "অনুগ্রহ করে আবার চেষ্টা করুন"}</p>
          <Button onClick={() => navigate("/research")} className="mt-6">
            পুনরায় চেষ্টা করুন
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (searchData.status === "failed") {
    return (
      <Card className="border-0 shadow-lg max-w-2xl mx-auto mt-16">
        <CardContent className="p-12 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">বিশ্লেষণ ব্যর্থ হয়েছে</h3>
          <p className="text-slate-500">{searchData.error || "অজানা ত্রুটি"}</p>
          <Button onClick={() => navigate("/research")} className="mt-6">
            নতুন বিশ্লেষণ শুরু করুন
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Extract market assessment from aggregateScores
  const marketAssessment = searchData.aggregateScores as {
    totalListings: number;
    avgPrice: number;
    avgReviewCount: number;
    topBrandShare: number;
    priceSpreadRatio: number;
    reviewCountGiniLike: number;
    marketVerdict: "green" | "yellow" | "red";
    marketVerdictReason: string;
    bestOpportunityAsin: string | null;
  };

  // Get verdict color
  const getVerdictColor = () => {
    switch (marketAssessment?.marketVerdict) {
      case "green":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "yellow":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "red":
        return "bg-rose-100 text-rose-800 border-rose-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  // Get verdict icon
  const getVerdictIcon = () => {
    switch (marketAssessment?.marketVerdict) {
      case "green":
        return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
      case "yellow":
        return <AlertTriangle className="h-5 w-5 text-amber-600" />;
      case "red":
        return <AlertTriangle className="h-5 w-5 text-rose-600" />;
      default:
        return <TrendingUp className="h-5 w-5 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-8">
      {/* Header */}
      <div className="text-center">
        <Button
          variant="ghost"
          onClick={() => navigate("/research")}
          className="mb-6 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          ফিরে যান
        </Button>
        
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
          কীওয়ার্ড বিশ্লেষণ ফলাফল
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          কীওয়ার্ড: <span className="font-medium text-slate-700 dark:text-slate-300">{searchData.keyword}</span>
        </p>
        <p className="text-slate-500 dark:text-slate-400">
          মার্কেটপ্লেস: <span className="font-medium text-slate-700 dark:text-slate-300">{searchData.marketplace}</span>
        </p>
      </div>

      {/* Hero Verdict Card */}
      <Card className="border-0 shadow-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
        <CardContent className="p-8">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${getVerdictColor()}`}>
              {getVerdictIcon()}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                মার্কেট ওভারভিউ
              </h2>
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-slate-500" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">মোট লিস্টিং:</span>
                  <span className="font-semibold text-slate-800 dark:text-white">
                    {marketAssessment?.totalListings?.toLocaleString() || "0"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-slate-500" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">গড় প্রাইস:</span>
                  <span className="font-semibold text-slate-800 dark:text-white">
                    ${Number(marketAssessment?.avgPrice || 0).toFixed(2)}
                  </span>
                </div>
              </div>
              <p className="text-lg font-medium text-slate-800 dark:text-white">
                <span className="text-slate-600 dark:text-slate-400">ভারডিক্ট:</span> 
                <span className="capitalize">{marketAssessment?.marketVerdict || "pending"}</span>
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                কারণ: {marketAssessment?.marketVerdictReason || "অপেক্ষা করুন..."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market Snapshot Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md bg-white dark:bg-slate-800">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">গড় রিভিউ</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {marketAssessment?.avgReviewCount?.toLocaleString() || "0"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-white dark:bg-slate-800">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">ব্র্যান্ড ডোমিনেন্স</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {(Number(marketAssessment?.topBrandShare) || 0) > 0 
                ? `${(Number(marketAssessment.topBrandShare) * 100).toFixed(1)}%`
                : "0%"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-white dark:bg-slate-800">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">প্রাইস স্প্রেড</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {(Number(marketAssessment?.priceSpreadRatio) || 0) > 0 
                ? `${(Number(marketAssessment.priceSpreadRatio) * 100).toFixed(1)}%`
                : "0%"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-white dark:bg-slate-800">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">রিভিউ গ্যাপ</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {(Number(marketAssessment?.reviewCountGiniLike) || 0) > 0 
                ? `${(Number(marketAssessment.reviewCountGiniLike) * 100).toFixed(1)}%`
                : "0%"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ranked Listing Table */}
      <Card className="border-0 shadow-xl bg-white dark:bg-slate-800">
        <CardContent className="p-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
            প্রতিটি লিস্টিং বিশ্লেষণ (সেরা থেকে শুরু)
          </h3>
          
          {searchData.listings && searchData.listings.length > 0 ? (
            <div className="space-y-4">
              {searchData.listings
                .sort((a, b) => (b.perListingScore || 0) - (a.perListingScore || 0))
                .map((listing) => (
                  <div
                    key={listing.id}
                    className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                  >
                    <div className="flex gap-4">
                      {/* Thumbnail */}
                      {listing.imageUrl && (
                        <img
                          src={listing.imageUrl}
                          alt={listing.title || "Product"}
                          className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                          onError={(e) => {
                            e.currentTarget.src = "https://via.placeholder.com/64x64?text=No+Image";
                          }}
                        />
                      )}
                      
                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900 dark:text-white line-clamp-2">
                              {listing.title || "Untitled Product"}
                            </h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                              ASIN: {listing.asin}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                ${Number(listing.price || 0).toFixed(2)}
                              </span>
                              <div className="flex items-center gap-1">
                                <span className="text-yellow-500 text-sm">★</span>
                                <span className="text-sm">
                                  {Number(listing.rating || 0).toFixed(1)} ({Number(listing.reviewCount || 0).toLocaleString()})
                                </span>
                              </div>
                              {listing.isPrime && (
                                <Badge variant="outline" className="text-xs">
                                  Prime
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {/* Score Badge */}
                          <div className="text-right">
                            <Badge
                              className={`text-sm font-bold ${
                                listing.perListingVerdict === "strong"
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                  : listing.perListingVerdict === "vulnerable"
                                    ? "bg-amber-100 text-amber-800 border-amber-200"
                                    : "bg-rose-100 text-rose-800 border-rose-200"
                              }`}
                            >
                              {Number(listing.perListingScore || 0).toFixed(0)}/100
                            </Badge>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 capitalize">
                              {listing.perListingVerdict || "pending"}
                            </p>
                          </div>
                        </div>
                        
                        {listing.perListingVerdict && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                            কারণ: {listing.perListingVerdictReason || "স্ট্যান্ডার্ড লিস্টিং"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-500 dark:text-slate-400">কোনো লিস্টিং পাওয়া যায়নি</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Summary Panel */}
      <Card className="border-0 shadow-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
        <CardContent className="p-8">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
            AI বিশ্লেষণ ও সুপারিশ
          </h3>
          
          {searchData.summaryReport ? (
            <div className="prose dark:prose-invert max-w-none">
              <div dangerouslySetInnerHTML={{ __html: searchData.summaryReport }} />
            </div>
          ) : (
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}