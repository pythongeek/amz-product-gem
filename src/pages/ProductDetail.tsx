import { ProtectedLayout } from "@/components/Layout";
import { trpc } from "@/providers/trpc";
import { useParams, Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useState } from "react";
import {
  ArrowLeft,
  Package,
  Rocket,
  Calculator,
  FileText,
  TrendingUp,
  DollarSign,
  Star,
  BarChart3,
  Trash2,
  Loader2,
  RotateCw,
} from "lucide-react";

const statusColors: Record<string, string> = {
  researching: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  hot_opportunity: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  sourced: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  launched: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  archived: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const statusLabels: Record<string, string> = {
  researching: "রিসার্চিং",
  hot_opportunity: "হট অপরচুনিটি",
  sourced: "সোর্সড",
  launched: "লঞ্চড",
  archived: "আর্কাইভড",
};

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const productId = parseInt(id || "0");

  const { data: product, isLoading } = trpc.product.getById.useQuery({
    id: productId,
  });

  const updateMutation = trpc.product.update.useMutation();
  const deleteMutation = trpc.product.delete.useMutation();
  const refreshMutation = trpc.product.refresh.useMutation();
  const utils = trpc.useUtils();
 
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
 
  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      await updateMutation.mutateAsync({
        id: productId,
        data: { status: newStatus as any },
      });
      utils.product.getById.invalidate({ id: productId });
    } catch (error) {
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };
 
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshMutation.mutateAsync({ productId });
      toast.success("প্রোডাক্ট ডাটা সফলভাবে রিফ্রেশ করা হয়েছে!");
      utils.product.getById.invalidate({ id: productId });
    } catch (error: any) {
      toast.error(`রিফ্রেশ ব্যর্থ হয়েছে: ${error.message || "Unknown error"}`);
    } finally {
      setIsRefreshing(false);
    }
  };
 
  const handleDelete = async () => {
    if (!confirm("আপনি কি এই প্রোডাক্টটি ডিলিট করতে চান?")) return;
    try {
      await deleteMutation.mutateAsync({ id: productId });
      navigate("/products");
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <ProtectedLayout>
        <div className="text-center py-20">
          <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-slate-500">লোড হচ্ছে...</p>
        </div>
      </ProtectedLayout>
    );
  }

  if (!product) {
    return (
      <ProtectedLayout>
        <div className="text-center py-20">
          <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">
            প্রোডাক্ট পাওয়া যায়নি
          </h2>
          <Button onClick={() => navigate("/products")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            প্রোডাক্ট লিস্টে ফিরে যান
          </Button>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/products")}
              className="rounded-xl"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {product.title || product.asin}
                </h1>
                <Badge className={statusColors[product.status || "researching"]}>
                  {statusLabels[product.status || "researching"]}
                </Badge>
              </div>
              <p className="text-sm text-slate-500">
                ASIN: {product.asin} | {product.marketplace}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              disabled={isRefreshing}
              onClick={handleRefresh}
              className="rounded-xl flex items-center gap-1.5"
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCw className="h-4 w-4" />
              )}
              ডাটা রিফ্রেশ
            </Button>
            <Select
              value={product.status || "researching"}
              onValueChange={handleStatusChange}
              disabled={isUpdating}
            >
              <SelectTrigger className="w-[180px] rounded-xl">
                <span className="text-sm">{isUpdating ? "আপডেটিং..." : "স্ট্যাটাস পরিবর্তন"}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="researching">রিসার্চিং</SelectItem>
                <SelectItem value="hot_opportunity">হট অপরচুনিটি</SelectItem>
                <SelectItem value="sourced">সোর্সড</SelectItem>
                <SelectItem value="launched">লঞ্চড</SelectItem>
                <SelectItem value="archived">আর্কাইভড</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="destructive"
              size="icon"
              onClick={handleDelete}
              className="rounded-xl"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "প্রাইজ",
              value: product.price ? `$${product.price}` : "N/A",
              icon: DollarSign,
              color: "text-green-600",
              bg: "bg-green-50 dark:bg-green-900/20",
            },
            {
              label: "BSR",
              value: product.bsr ? `#${product.bsr.toLocaleString()}` : "N/A",
              icon: BarChart3,
              color: "text-blue-600",
              bg: "bg-blue-50 dark:bg-blue-900/20",
            },
            {
              label: "রেটিং",
              value: product.rating ? `⭐ ${product.rating}/5` : "N/A",
              icon: Star,
              color: "text-purple-600",
              bg: "bg-purple-50 dark:bg-purple-900/20",
            },
            {
              label: "রিভিউ",
              value: product.reviewCount
                ? `${product.reviewCount.toLocaleString()}`
                : "N/A",
              icon: TrendingUp,
              color: "text-orange-600",
              bg: "bg-orange-50 dark:bg-orange-900/20",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label} className="border-0 shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 ${item.bg} rounded-lg flex items-center justify-center`}
                    >
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

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Link to={`/launch/${product.id}`}>
            <Card className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer group">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Rocket className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white">
                      লঞ্চ স্ট্র্যাটেজি
                    </h3>
                      <p className="text-sm text-slate-500">
                      AI-জেনারেটেড লঞ্চ প্ল্যান
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={`/calculator?productId=${product.id}`}>
            <Card className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer group">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Calculator className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white">
                      FBA ক্যালকুলেটর
                    </h3>
                    <p className="text-sm text-slate-500">
                      প্রফিট ক্যালকুলেশন
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={`/reports?productId=${product.id}`}>
            <Card className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer group">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white">
                      রিপোর্ট দেখুন
                    </h3>
                    <p className="text-sm text-slate-500">
                      বাংলা রিসার্চ রিপোর্ট
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Product Details */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>প্রোডাক্ট বিস্তারিত</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { label: "ASIN", value: product.asin },
                { label: "মার্কেটপ্লেস", value: product.marketplace },
                { label: "Amazon Choice", value: product.amazonChoice ? "✅ হ্যাঁ" : "❌ না" },
                { label: "সেলার সংখ্যা", value: product.sellerCount || "N/A" },
                { label: "FBA সেলার", value: product.fbaSellers || "N/A" },
                { label: "FBM সেলার", value: product.fbmSellers || "N/A" },
                { label: "ভ্যারিয়েশন", value: product.variationCount || "N/A" },
                { label: "Q&A কাউন্ট", value: product.qaCount || "N/A" },
                { label: "A+ কন্টেন্ট", value: product.hasAplusContent ? "✅ আছে" : "❌ নেই" },
                { label: "ভিডিও", value: product.hasVideo ? "✅ আছে" : "❌ নেই" },
                { label: "রিভিউ ভেলোসিটি", value: product.reviewVelocity ? `${product.reviewVelocity}/দিন` : "N/A" },
                { label: "সেলস এস্টিমেট", value: product.salesEstimate ? `${product.salesEstimate.toLocaleString()}/মাস` : "N/A" },
                {
                  label: "যোগ করা হয়েছে",
                  value: new Date(product.createdAt).toLocaleDateString("bn-BD"),
                },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {item.label}
                  </p>
                  <p className="font-semibold text-slate-800 dark:text-white">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  );
}
