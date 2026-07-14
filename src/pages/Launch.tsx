import { ProtectedLayout } from "@/components/Layout";
import { trpc } from "@/providers/trpc";
import { useParams } from "react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Rocket,
  Loader2,
  Sparkles,
  TrendingUp,
  Megaphone,
  Star,
  Package,
  Calendar,
  DollarSign,
  Target,
  CheckCircle,
} from "lucide-react";

export default function Launch() {
  const { productId } = useParams<{ productId: string }>();
  const id = parseInt(productId || "0");

  const { data: product } = trpc.product.getById.useQuery({ id }, { enabled: !!id });
  const { data: existingStrategies } = trpc.launch.getByProduct.useQuery({ productId: id }, { enabled: !!id });

  const [productTitle, setProductTitle] = useState("");
  const [category, setCategory] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [competitorPrice, setCompetitorPrice] = useState("");
  const [budget] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [strategy, setStrategy] = useState<any>(null);

  const generateMutation = trpc.launch.generate.useMutation();

  // Pre-populate fields from product details
  useEffect(() => {
    if (product) {
      setProductTitle(product.title || "");
      setCategory(product.bsrCategory || "General");
      setTargetPrice(product.price ? String(product.price) : "29.99");
      setCompetitorPrice(product.price ? String((Number(product.price) * 1.1).toFixed(2)) : "34.99");
    }
  }, [product]);

  // Pre-load existing strategy if already generated
  useEffect(() => {
    if (existingStrategies && existingStrategies.length > 0) {
      const latest = existingStrategies[existingStrategies.length - 1];
      setStrategy({
        strategy: latest,
        fullText: latest.content,
      });
    }
  }, [existingStrategies]);

  const handleGenerate = async () => {
    if (!productTitle) return;
    setIsGenerating(true);
    try {
      const result = await generateMutation.mutateAsync({
        productId: id,
        productTitle,
        category: category || undefined,
        targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
        competitorPrice: competitorPrice
          ? parseFloat(competitorPrice)
          : undefined,
        budget: budget ? parseFloat(budget) : undefined,
      });
      setStrategy(result);
      toast.success("লঞ্চ স্ট্র্যাটেজি সফলভাবে জেনারেট হয়েছে!");
    } catch (error: any) {
      toast.error(`লঞ্চ স্ট্র্যাটেজি তৈরি ব্যর্থ হয়েছে: ${error.message || "Unknown error"}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <ProtectedLayout>
      <div className="space-y-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            লঞ্চ স্ট্র্যাটেজি জেনারেটর
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            AI-পাওয়ার্ড Day 0-90 লঞ্চ প্ল্যান তৈরি করুন
          </p>
          {product && (
            <div className="mt-3 text-sm">
              <a
                href={(() => {
                  const domainMap: Record<string, string> = {
                    US: "amazon.com",
                    UK: "amazon.co.uk",
                    DE: "amazon.de",
                    CA: "amazon.ca",
                    FR: "amazon.fr",
                    IT: "amazon.it",
                    ES: "amazon.es",
                    JP: "amazon.co.jp",
                  };
                  const domain = domainMap[(product.marketplace || "US").toUpperCase()] || "amazon.com";
                  return `https://www.${domain}/dp/${product.asin}`;
                })()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline font-semibold"
              >
                আমাজন লিস্টিং দেখুন ({product.asin}) 🔗
              </a>
            </div>
          )}
        </div>

        {/* Input Form */}
        <Card className="border-0 shadow-xl">
          <CardContent className="p-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2 lg:col-span-3">
              <Label className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-blue-600" />
                প্রোডাক্ট টাইটেল *
              </Label>
              <Input
                placeholder="যেমন: Yoga Block, Kitchen Organizer..."
                value={productTitle}
                onChange={(e) => setProductTitle(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-purple-600" />
                ক্যাটাগরি
              </Label>
              <Input
                placeholder="Home & Kitchen"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                টার্গেট প্রাইজ ($)
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder="29.99"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-orange-600" />
                কম্পিটিটর প্রাইজ ($)
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder="34.99"
                value={competitorPrice}
                onChange={(e) => setCompetitorPrice(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !productTitle}
                className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl"
              >
                {isGenerating ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-5 w-5 mr-2" />
                )}
                লঞ্চ স্ট্র্যাটেজি জেনারেট করুন
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Strategy Results */}
        {strategy && (
          <div className="space-y-6">
            {/* Overview */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
              <CardContent className="p-8">
                <div className="prose dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed">
                    {strategy.fullText}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            {strategy.strategy?.timeline && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    Day 0-90 লঞ্চ টাইমলাইন
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {strategy.strategy.timeline.map(
                      (item: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800"
                        >
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-sm">
                              {item.day}
                            </span>
                          </div>
                          <div>
                            <p className="text-slate-700 dark:text-slate-300">
                              {item.task}
                            </p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pricing Strategy */}
            {strategy.strategy?.pricingStrategy && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    প্রাইসিং স্ট্র্যাটেজি
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-3 gap-4">
                    {Object.entries(strategy.strategy.pricingStrategy).map(
                      ([key, value]: [string, any]) => (
                        <div
                          key={key}
                          className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800"
                        >
                          <Badge className="mb-2">
                            {key === "phase1"
                              ? "ফেজ ১"
                              : key === "phase2"
                              ? "ফেজ ২"
                              : "ফেজ ৩"}
                          </Badge>
                          <p className="text-2xl font-bold text-slate-800 dark:text-white">
                            ${value.price}
                          </p>
                          <p className="text-sm text-slate-500">
                            {value.days} দিন
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {value.strategy}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* PPC Campaign */}
            {strategy.strategy?.ppcCampaign && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-orange-600" />
                    PPC ক্যাম্পেইন স্ট্রাকচার
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(strategy.strategy.ppcCampaign).map(
                      ([key, value]: [string, any]) => {
                        if (key === "totalDailyBudget" || key === "targetAcos")
                          return null;
                        return (
                          <div
                            key={key}
                            className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800"
                          >
                            <div>
                              <p className="font-semibold text-slate-700 dark:text-slate-200 capitalize">
                                {key.replace(/([A-Z])/g, " $1").trim()}
                              </p>
                              <p className="text-sm text-slate-500">
                                {value.goal}
                              </p>
                            </div>
                            <Badge variant="outline">
                              ${value.budget}/দিন
                            </Badge>
                          </div>
                        );
                      }
                    )}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                      <span className="font-bold">মোট দৈনিক বাজেট</span>
                      <span className="font-bold text-blue-600">
                        ${strategy.strategy.ppcCampaign.totalDailyBudget}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-green-50 dark:bg-green-900/20">
                      <span className="font-bold">টার্গেট ACoS</span>
                      <span className="font-bold text-green-600">
                        {strategy.strategy.ppcCampaign.targetAcos}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Review Strategy */}
            {strategy.strategy?.reviewStrategy && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    রিভিউ জেনারেশন স্ট্র্যাটেজি
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-3 gap-4">
                    {Object.entries(strategy.strategy.reviewStrategy).map(
                      ([key, value]: [string, any]) => {
                        if (key === "target") return null;
                        return (
                          <div
                            key={key}
                            className="p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20"
                          >
                            <p className="font-semibold text-slate-700 dark:text-slate-200 capitalize mb-2">
                              {key.replace(/([A-Z])/g, " $1").trim()}
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                              {typeof value === "string"
                                ? value
                                : `${value.units} ইউনিট — ${value.expectedReviews} রিভিউ`}
                            </p>
                          </div>
                        );
                      }
                    )}
                  </div>
                  <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 text-center">
                    <p className="font-bold text-slate-800 dark:text-white">
                      🎯 টার্গেট: {strategy.strategy.reviewStrategy.target}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Marketing Channels */}
            {strategy.strategy?.marketingChannels && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Rocket className="h-5 w-5 text-purple-600" />
                    মার্কেটিং চ্যানেল
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {strategy.strategy.marketingChannels.map(
                      (channel: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800"
                        >
                          <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg flex items-center justify-center">
                            <CheckCircle className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-700 dark:text-slate-200">
                              {channel.channel}
                            </p>
                            <p className="text-sm text-slate-500">
                              {channel.strategy}
                            </p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
