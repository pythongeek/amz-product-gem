import { ProtectedLayout } from "@/components/Layout";
import { trpc } from "@/providers/trpc";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSearchParams, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calculator as CalcIcon,
  DollarSign,
  Package,
  Truck,
  Percent,
  Warehouse,
  Megaphone,
  RotateCcw,
  Loader2,
  Info,
  ShieldAlert,
  Zap,
} from "lucide-react";

const categories = [
  { value: "most_categories", label: "মোস্ট ক্যাটাগরি (১৫%)", fee: 0.15 },
  { value: "electronics", label: "ইলেকট্রনিক্স (৮%)", fee: 0.08 },
  { value: "home_kitchen", label: "হোম অ্যান্ড কিচেন (১৫%)", fee: 0.15 },
  { value: "clothing", label: "ক্লোথিং (৫-১৫%)", fee: 0.15 },
  { value: "jewelry", label: "জুয়েলারি (২০%)", fee: 0.20 },
];

const sizeTiers = [
  { value: "small_standard_12oz", label: "স্মল স্ট্যান্ডার্ড (≤12 oz)", fee: 3.22 },
  { value: "small_standard_16oz", label: "স্মল স্ট্যান্ডার্ড (12-16 oz)", fee: 3.40 },
  { value: "large_standard_1lb", label: "লার্জ স্ট্যান্ডার্ড (≤1 lb)", fee: 3.86 },
  { value: "large_standard_2lb", label: "লার্জ স্ট্যান্ডার্ড (1-2 lb)", fee: 5.77 },
  { value: "large_standard_3lb", label: "লার্জ স্ট্যান্ডার্ড (2-3 lb)", fee: 6.47 },
  { value: "oversize_base", label: "ওভারসাইজ", fee: 9.00 },
];

export default function Calculator() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productIdStr = searchParams.get("productId");
  const parsedProductId = productIdStr ? parseInt(productIdStr) : null;

  const { data: product } = trpc.product.getById.useQuery(
    { id: parsedProductId || 0 },
    { enabled: !!parsedProductId }
  );

  const [sellingPrice, setSellingPrice] = useState("29.99");
  const [productCost, setProductCost] = useState("7.00");
  const [shippingCost, setShippingCost] = useState("1.50");
  const [category, setCategory] = useState("most_categories");
  const [sizeTier, setSizeTier] = useState("large_standard_1lb");
  const [ppcAcos, setPpcAcos] = useState("25");
  const [returnRate, setReturnRate] = useState("5");
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  // Stress test states
  const [stressResult, setStressResult] = useState<any>(null);
  const [stressDialogOpen, setStressDialogOpen] = useState(false);

  const calculateMutation = trpc.fba.calculate.useMutation();
  const { data: rates } = trpc.fba.listRates.useQuery(undefined, {
    enabled: (user as any)?.experienceLevel === "advanced",
  });

  // Pre-populate fields from product details
  useEffect(() => {
    if (product) {
      if (product.price) setSellingPrice(String(product.price));
      if (product.bsrCategory) {
        const catLower = product.bsrCategory.toLowerCase();
        if (catLower.includes("elect")) {
          setCategory("electronics");
        } else if (catLower.includes("cloth") || catLower.includes("apparel")) {
          setCategory("clothing");
        } else if (catLower.includes("jewel")) {
          setCategory("jewelry");
        } else if (catLower.includes("home") || catLower.includes("kitchen")) {
          setCategory("home_kitchen");
        } else {
          setCategory("most_categories");
        }
      }
    }
  }, [product]);

  const handleCalculate = async () => {
    setIsCalculating(true);
    try {
      const calcResult = await calculateMutation.mutateAsync({
        productId: parsedProductId || 1, // pass real product ID if available, else fallback
        sellingPrice: parseFloat(sellingPrice),
        productCost: parseFloat(productCost),
        shippingCost: parseFloat(shippingCost),
        category,
        productSize: sizeTier,
        ppcAcos: parseFloat(ppcAcos),
        returnRate: parseFloat(returnRate),
      });
      setResult(calcResult);

      // Run stress test calculations
      const referralFeeRate = calcResult.breakdown.costs.referral / calcResult.breakdown.sellingPrice;
      const stressSellingPrice = calcResult.breakdown.sellingPrice * 0.80; // 20% off promo
      const stressProductCost = calcResult.breakdown.costs.product * 1.15; // +15% supplier cost
      const stressFbaFee = calcResult.breakdown.costs.fba * 1.10; // +10% FBA fees
      const stressReferralFee = stressSellingPrice * referralFeeRate;
      
      const stressFuel = (calcResult.breakdown.costs.fuelSurcharge || 0) * 1.10;
      const stressStorage = calcResult.breakdown.costs.storage;
      const stressShipping = calcResult.breakdown.costs.shipping;
      const stressInbound = calcResult.breakdown.costs.inboundPlacement || 0;
      const stressAged = calcResult.breakdown.costs.agedInventory || 0;
      const stressSipp = calcResult.breakdown.costs.sippPenalty || 0;
      const stressLowPrice = calcResult.breakdown.costs.lowPriceDiscount || 0;
      const stressReturns = stressSellingPrice * (parseFloat(returnRate) / 100);
      const stressPpc = stressSellingPrice * 0.25; // 25% ACoS

      const stressTotalCosts = 
        stressProductCost + 
        stressShipping + 
        stressReferralFee + 
        stressFbaFee + 
        stressFuel + 
        stressInbound + 
        stressAged + 
        stressSipp - 
        stressLowPrice + 
        stressStorage + 
        stressReturns + 
        stressPpc;

      const stressNetProfit = stressSellingPrice - stressTotalCosts;
      const stressMargin = (stressNetProfit / stressSellingPrice) * 100;

      setStressResult({
        sellingPrice: stressSellingPrice,
        netProfit: stressNetProfit,
        marginPercent: stressMargin,
        totalCosts: stressTotalCosts,
      });

    } catch (error) {
      console.error(error);
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <ProtectedLayout>
      <div className="space-y-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              FBA প্রফিট ক্যালকুলেটর
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Amazon FBA ফি হিসেব করে নিট লাভ বের করুন (২০২৬ রেটস)
            </p>
          </div>
          {parsedProductId && (
            <Button
              onClick={() => navigate(`/launch/${parsedProductId}`)}
              className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-semibold text-white shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
            >
              <Zap className="h-4 w-4" />
              লঞ্চ স্ট্র্যাটেজি দেখুন
            </Button>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-slate-800/50">
            <CardContent className="p-6 space-y-5">
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  সেলিং প্রাইজ ($)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="h-12 rounded-xl"
                  placeholder="29.99"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    প্রোডাক্ট কস্ট ($)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={productCost}
                    onChange={(e) => setProductCost(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <Truck className="h-4 w-4 text-orange-600" />
                    শিপিং কস্ট ($)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Percent className="h-4 w-4 text-purple-600" />
                  ক্যাটাগরি
                </Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-12 rounded-xl">
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
                <Label className="flex items-center gap-2 mb-2">
                  <Warehouse className="h-4 w-4 text-indigo-600" />
                  প্রোডাক্ট সাইজ টিয়ার
                </Label>
                <Select value={sizeTier} onValueChange={setSizeTier}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sizeTiers.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label} — ${s.fee}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <Megaphone className="h-4 w-4 text-red-600" />
                    PPC ACoS (%)
                  </Label>
                  <Input
                    type="number"
                    value={ppcAcos}
                    onChange={(e) => setPpcAcos(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <RotateCcw className="h-4 w-4 text-yellow-600" />
                    রিটার্ন রেট (%)
                  </Label>
                  <Input
                    type="number"
                    value={returnRate}
                    onChange={(e) => setReturnRate(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>

              <Button
                onClick={handleCalculate}
                disabled={isCalculating}
                className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl"
              >
                {isCalculating ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <CalcIcon className="h-5 w-5 mr-2" />
                )}
                ক্যালকুলেট করুন
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="space-y-6">
            {result ? (
              <>
                {/* Main Result */}
                <Card
                  className={`border-0 shadow-xl ${
                    result.breakdown.marginPercent >= 25
                      ? "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20"
                      : result.breakdown.marginPercent >= 15
                      ? "bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20"
                      : "bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20"
                  }`}
                >
                  <CardContent className="p-8 text-center">
                    <p className="text-sm text-slate-500 mb-2">প্রতি ইউনিট নিট লাভ</p>
                    <p
                      className={`text-5xl font-bold ${
                        result.breakdown.marginPercent >= 25
                          ? "text-green-600"
                          : result.breakdown.marginPercent >= 15
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      ${result.breakdown.netProfit.toFixed(2)}
                    </p>
                    <p className="text-lg text-slate-600 mt-2">
                      মার্জিন: {result.breakdown.marginPercent.toFixed(1)}%
                    </p>
                    <Badge
                      className={`mt-4 text-sm px-4 py-1 ${
                        result.breakdown.marginPercent >= 25
                          ? "bg-green-500 text-white"
                          : result.breakdown.marginPercent >= 15
                          ? "bg-yellow-500 text-white"
                          : "bg-red-500 text-white"
                      }`}
                    >
                      {result.breakdown.recommendation}
                    </Badge>
                  </CardContent>
                </Card>

                {/* Cost Breakdown */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg">খরচের বিভাজন</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      {
                        label: "সেলিং প্রাইজ",
                        value: result.breakdown.sellingPrice,
                        icon: DollarSign,
                        color: "text-green-600",
                        isPositive: true,
                      },
                      {
                        label: "প্রোডাক্ট কস্ট",
                        value: -result.breakdown.costs.product,
                        icon: Package,
                        color: "text-red-500",
                        isDeduction: true,
                      },
                      {
                        label: "শিপিং কস্ট",
                        value: -result.breakdown.costs.shipping,
                        icon: Truck,
                        color: "text-red-500",
                        isDeduction: true,
                      },
                      {
                        label: "রেফারেল ফি",
                        value: -result.breakdown.costs.referral,
                        icon: Percent,
                        color: "text-red-500",
                        isDeduction: true,
                      },
                      {
                        label: "FBA ফুলফিলমেন্ট ফি",
                        value: -result.breakdown.costs.fba,
                        icon: Warehouse,
                        color: "text-red-500",
                        isDeduction: true,
                      },
                      {
                        label: "জ্বালানি সারচার্জ (Fuel Surcharge)",
                        value: -result.breakdown.costs.fuelSurcharge,
                        icon: Percent,
                        color: "text-red-500",
                        isDeduction: true,
                      },
                      {
                        label: "ইনবাউন্ড প্লেসমেন্ট ফি (Inbound Placement)",
                        value: -result.breakdown.costs.inboundPlacement,
                        icon: Warehouse,
                        color: "text-red-500",
                        isDeduction: true,
                      },
                      ...(result.breakdown.costs.lowPriceDiscount > 0 ? [{
                        label: "লো-প্রাইস FBA ডিসকাউন্ট",
                        value: result.breakdown.costs.lowPriceDiscount,
                        icon: DollarSign,
                        color: "text-green-600",
                        isDeduction: false,
                      }] : []),
                      {
                        label: "এজড ইনভেন্টরি ফি (Aged Inventory)",
                        value: -result.breakdown.costs.agedInventory,
                        icon: Info,
                        color: "text-red-500",
                        isDeduction: true,
                      },
                      {
                        label: "SIPP প্যাকেজিং পেনাল্টি (Bulky items)",
                        value: -result.breakdown.costs.sippPenalty,
                        icon: Info,
                        color: "text-red-500",
                        isDeduction: true,
                      },
                      {
                        label: "স্টোরেজ ফি",
                        value: -result.breakdown.costs.storage,
                        icon: Warehouse,
                        color: "text-red-500",
                        isDeduction: true,
                      },
                      {
                        label: "PPC কস্ট",
                        value: -result.breakdown.costs.ppc,
                        icon: Megaphone,
                        color: "text-red-500",
                        isDeduction: true,
                      },
                      {
                        label: "রিটার্ন কস্ট",
                        value: -result.breakdown.costs.returns,
                        icon: RotateCcw,
                        color: "text-red-500",
                        isDeduction: true,
                      },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.label}
                          className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800"
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`h-4 w-4 ${item.color}`} />
                            <span className="text-sm text-slate-600 dark:text-slate-300">
                              {item.label}
                            </span>
                          </div>
                          <span
                            className={`font-semibold ${
                              item.isDeduction
                                ? "text-red-500"
                                : "text-green-600"
                            }`}
                          >
                            {item.isDeduction ? "" : "+"}$
                            {Math.abs(item.value).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}

                    <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                        <span className="font-bold text-slate-800 dark:text-white">
                          মোট খরচ
                        </span>
                        <span className="font-bold text-red-600">
                          -${result.breakdown.totalCosts.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <span className="font-bold text-slate-800 dark:text-white">
                        নিট লাভ
                      </span>
                      <span className="font-bold text-green-600">
                        ${result.breakdown.netProfit.toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Break-even Info */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Info className="h-5 w-5 text-blue-600" />
                      ব্রেক-ইভেন তথ্য
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">
                        ব্রেক-ইভেন ACoS
                      </span>
                      <span className="font-semibold">
                        {result.breakdown.breakEvenAcos.toFixed(1)}%
                      </span>
                    </div>
                    <Progress
                      value={Math.min(
                        (parseFloat(ppcAcos) / result.breakdown.breakEvenAcos) *
                          100,
                        100
                      )}
                      className="h-2"
                    />
                    <p className="text-xs text-slate-500">
                      আপনার বর্তমান ACoS ({ppcAcos}%) ব্রেক-ইভেন থেকে{" "}
                      {parseFloat(ppcAcos) > result.breakdown.breakEvenAcos
                        ? "বেশি ⚠️"
                        : "কম ✅"}
                    </p>
                  </CardContent>
                </Card>

                {/* Margin Stress Test Button */}
                {(user as any)?.experienceLevel === "advanced" && (
                  <Button
                    onClick={() => setStressDialogOpen(true)}
                    className="w-full h-12 text-md font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg"
                  >
                    <ShieldAlert className="h-5 w-5 mr-2" />
                    মার্জিন স্ট্রেস টেস্ট (Margin Stress Test)
                  </Button>
                )}
              </>
            ) : (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-12 text-center">
                  <CalcIcon className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 mb-2">
                    প্রফিট ক্যালকুলেট করতে উপরের ফর্ম পূরণ করুন
                  </p>
                  <p className="text-sm text-slate-400">
                    সব ফিল্ড পূরণ করে "ক্যালকুলেট করুন" বাটনে ক্লিক করুন
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Fee assumptions panel for pros */}
        {(user as any)?.experienceLevel === "advanced" && rates && rates.length > 0 && (
          <Card className="border-0 shadow-xl mt-8 bg-white dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="text-lg">বর্তমান ফি ডাটাবেজ (Fee Assumptions Audit)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                  <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                      <th className="px-4 py-3">মার্কেটপ্লেস</th>
                      <th className="px-4 py-3">ফি টাইপ</th>
                      <th className="px-4 py-3">ক্যাটাগরি/সাইজ</th>
                      <th className="px-4 py-3">রেট ভ্যালু</th>
                      <th className="px-4 py-3">নোটস</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rates.map((r: any) => (
                      <tr key={r.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{r.marketplace}</td>
                        <td className="px-4 py-3 font-mono text-xs">{r.feeType}</td>
                        <td className="px-4 py-3">{r.category || r.sizeTier || "—"}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                          {r.rateType === "percent" ? `${(Number(r.rateValue) * 100).toFixed(1)}%` : `$${Number(r.rateValue).toFixed(2)}`}
                        </td>
                        <td className="px-4 py-3 text-xs">{r.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Stress Test Dialog */}
      <Dialog open={stressDialogOpen} onOpenChange={setStressDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-red-600">
              <ShieldAlert className="h-6 w-6" />
              মার্জিন স্ট্রেস টেস্ট রিপোর্ট
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
              এই টেস্টটি প্রোডাক্টের স্থায়িত্ব যাচাই করতে নিম্নোক্ত প্রতিকূল পরিস্থিতিতে মার্জিন হিসেব করে:
              <ul className="list-disc pl-5 mt-2 space-y-1 text-xs">
                <li>Supplier কস্ট <b>+১৫%</b> বৃদ্ধি</li>
                <li>FBA ফি ও সারচার্জ <b>+১০%</b> বৃদ্ধি</li>
                <li>গ্রাহকদের আকৃষ্ট করতে <b>২০% প্রোমো ডিসকাউন্ট</b></li>
                <li>PPC এডভার্টাইজিং <b>২৫% ACoS</b> ধরে</li>
              </ul>
            </DialogDescription>
          </DialogHeader>

          {stressResult && (
            <div className="space-y-6 mt-4">
              <div
                className={`p-6 rounded-2xl text-center border ${
                  stressResult.marginPercent >= 10
                    ? "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                    : stressResult.marginPercent >= 0
                    ? "bg-yellow-50/50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800"
                    : "bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                }`}
              >
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">স্ট্রেস টেস্ট নিট লাভ</p>
                <h3
                  className={`text-4xl font-extrabold ${
                    stressResult.marginPercent >= 10
                      ? "text-green-600"
                      : stressResult.marginPercent >= 0
                      ? "text-yellow-600"
                      : "text-red-600"
                  }`}
                >
                  ${stressResult.netProfit.toFixed(2)}
                </h3>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-2">
                  মার্জিন: {stressResult.marginPercent.toFixed(1)}%
                </p>
                <div className="mt-3 flex justify-center">
                  <Badge
                    className={`${
                      stressResult.marginPercent >= 10
                        ? "bg-green-500 hover:bg-green-600"
                        : stressResult.marginPercent >= 0
                        ? "bg-yellow-500 hover:bg-yellow-600"
                        : "bg-red-500 hover:bg-red-600"
                    } text-white px-4 py-1 text-xs`}
                  >
                    {stressResult.marginPercent >= 10
                      ? "সবুজ (Green) — চরম প্রতিকূলতাতেও লাভজনক"
                      : stressResult.marginPercent >= 0
                      ? "হলুদ (Yellow) — ঝুঁকিপূর্ণ, লাভ খুব কম"
                      : "লাল (Red) — লোকসান নিশ্চিত, অগ্রহণযোগ্য"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-slate-500">স্ট্রেস সেলিং প্রাইজ:</span>
                  <span className="font-semibold">${stressResult.sellingPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-slate-500">স্ট্রেস মোট খরচ:</span>
                  <span className="font-semibold text-red-500">${stressResult.totalCosts.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button
              onClick={() => setStressDialogOpen(false)}
              className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-full"
            >
              বন্ধ করুন
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ProtectedLayout>
  );
}
