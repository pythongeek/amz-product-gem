import { ProtectedLayout } from "@/components/Layout";
import { trpc } from "@/providers/trpc";
import { useState } from "react";
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
  const [sellingPrice, setSellingPrice] = useState("29.99");
  const [productCost, setProductCost] = useState("7.00");
  const [shippingCost, setShippingCost] = useState("1.50");
  const [category, setCategory] = useState("most_categories");
  const [sizeTier, setSizeTier] = useState("large_standard_1lb");
  const [ppcAcos, setPpcAcos] = useState("25");
  const [returnRate, setReturnRate] = useState("5");
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<any>(null);

  const calculateMutation = trpc.fba.calculate.useMutation();

  const handleCalculate = async () => {
    setIsCalculating(true);
    try {
      const calcResult = await calculateMutation.mutateAsync({
        productId: 1, // demo
        sellingPrice: parseFloat(sellingPrice),
        productCost: parseFloat(productCost),
        shippingCost: parseFloat(shippingCost),
        category,
        productSize: sizeTier,
        ppcAcos: parseFloat(ppcAcos),
        returnRate: parseFloat(returnRate),
      });
      setResult(calcResult);
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
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            FBA প্রফিট ক্যালকুলেটর
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Amazon FBA ফি হিসেব করে নিট লাভ বের করুন (২০২৬ রেটস)
          </p>
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
      </div>
    </ProtectedLayout>
  );
}
