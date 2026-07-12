import { ProtectedLayout } from "@/components/Layout";
import { trpc } from "@/providers/trpc";
import { Link } from "react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Package,
  Plus,
  Filter,
  ArrowRight,
  FolderOpen,
  FileUp,
  Upload,
  Loader2,
  Trash2,
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

export default function Products() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: products, isLoading } = trpc.product.list.useQuery();
  const { data: folders } = trpc.product.listFolders.useQuery();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Quick Save URL State
  const [quickUrl, setQuickUrl] = useState("");
  const [quickMarketplace, setQuickMarketplace] = useState("US");
  const [isSavingUrl, setIsSavingUrl] = useState(false);

  const quickSaveMutation = trpc.product.quickSaveUrl.useMutation();

  const handleQuickSave = async () => {
    if (!quickUrl.trim()) {
      toast.error("অনুগ্রহ করে একটি আমাজন প্রোডাক্ট ইউআরএল দিন।");
      return;
    }

    setIsSavingUrl(true);
    try {
      const product = await quickSaveMutation.mutateAsync({
        url: quickUrl,
        marketplace: quickMarketplace,
      });
      toast.success(`"${product.title || product.asin}" সফলভাবে সেভ করা হয়েছে!`);
      setQuickUrl("");
      utils.product.list.invalidate();
    } catch (err: any) {
      toast.error(`সেভ করতে ব্যর্থ হয়েছে: ${err.message || "Unknown error"}`);
    } finally {
      setIsSavingUrl(false);
    }
  };

  const deleteMutation = trpc.product.delete.useMutation();

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("আপনি কি নিশ্চিতভাবে এই প্রোডাক্টটি ডিলিট করতে চান?")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("প্রোডাক্টটি সফলভাবে ডিলিট করা হয়েছে।");
      utils.product.list.invalidate();
    } catch (err: any) {
      toast.error(`ডিলিট করতে ব্যর্থ হয়েছে: ${err.message || "Unknown error"}`);
    }
  };

  // CSV Import state
  const [csvText, setCsvText] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const bulkImportMutation = trpc.product.bulkImport.useMutation();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async () => {
    if (!csvText.trim()) {
      toast.error("অনুগ্রহ করে কিছু CSV টেক্সট লিখুন বা ফাইল আপলোড করুন।");
      return;
    }
    setIsImporting(true);
    try {
      const resp = await bulkImportMutation.mutateAsync({ csvContent: csvText });
      toast.success(`${resp.count}টি প্রোডাক্ট সফলভাবে ইম্পোর্ট করা হয়েছে!`);
      setIsImportOpen(false);
      setCsvText("");
      utils.product.list.invalidate();
    } catch (err: any) {
      toast.error(`ইম্পোর্ট ব্যর্থ হয়েছে: ${err.message || "Unknown error"}`);
    } finally {
      setIsImporting(false);
    }
  };

  const filteredProducts = products?.filter((p) => {
    const matchesSearch =
      !search ||
      p.title?.toLowerCase().includes(search.toLowerCase()) ||
      p.asin.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              প্রোডাক্ট ভল্ট
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              সেভ করা সব প্রোডাক্ট ও রিসার্চ
            </p>
          </div>
          <div className="flex gap-3">
            {(user as any)?.experienceLevel === "advanced" && (
              <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="rounded-full">
                    <FileUp className="h-4 w-4 mr-2" />
                    CSV বাল্ক ইম্পোর্ট
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                      <Upload className="h-5 w-5 text-blue-600" />
                      প্রোডাক্ট বাল্ক ইম্পোর্ট (CSV)
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 text-xs">
                      Keepa বা Helium10 থেকে এক্সপোর্ট করা প্রোডাক্ট ফাইল ইম্পোর্ট করুন। নিচের ফরম্যাট অনুসরণ করুন:
                      <code className="block mt-2 p-2 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[10px] text-slate-700 dark:text-slate-300">
                        asin,price,bsr,reviews,title,marketplace,category,weight
                      </code>
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 my-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">CSV ফাইল সিলেক্ট করুন</label>
                      <Input type="file" accept=".csv" onChange={handleFileUpload} className="h-10 rounded-xl" />
                    </div>
                    <div className="relative flex justify-center text-xs text-slate-400">
                      <span className="bg-white dark:bg-slate-900 px-2">অথবা সরাসরি পেস্ট করুন</span>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">CSV ডাটা পেস্ট করুন</label>
                      <textarea
                        value={csvText}
                        onChange={(e) => setCsvText(e.target.value)}
                        placeholder="asin,price,bsr,reviews...&#10;B08N5WRWNW,29.99,15000,120..."
                        rows={6}
                        className="w-full p-3 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-xl bg-transparent focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                    <Button variant="ghost" onClick={() => setIsImportOpen(false)} disabled={isImporting} className="rounded-full">বাতিল</Button>
                    <Button onClick={handleImportSubmit} disabled={isImporting} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full">
                      {isImporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      ইম্পোর্ট করুন
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <Link to="/research">
              <Button className="bg-blue-600 hover:bg-blue-700 rounded-full">
                <Plus className="h-4 w-4 mr-2" />
                নতুন রিসার্চ
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick URL Save Section */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-slate-800/50 dark:to-slate-800/80 border-l-4 border-l-blue-600">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-end gap-4">
              <div className="flex-1 w-full space-y-2">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  🔗 দ্রুত আমাজন লিংক সেভ করুন (Quick-Save URL for Later Research)
                </label>
                <div className="relative">
                  <Input
                    placeholder="https://amazon.com/dp/B08N5WRWNW বা প্রোডাক্টের যেকোনো বিবরণ ইউআরএল পেস্ট করুন..."
                    value={quickUrl}
                    onChange={(e) => setQuickUrl(e.target.value)}
                    disabled={isSavingUrl}
                    className="h-12 pr-4 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>
              <div className="w-full md:w-[180px] space-y-2">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
                  মার্কেটপ্লেস
                </label>
                <Select value={quickMarketplace} onValueChange={setQuickMarketplace} disabled={isSavingUrl}>
                  <SelectTrigger className="h-12 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">🇺🇸 US</SelectItem>
                    <SelectItem value="UK">🇬🇧 UK</SelectItem>
                    <SelectItem value="DE">🇩🇪 DE</SelectItem>
                    <SelectItem value="CA">🇨🇦 CA</SelectItem>
                    <SelectItem value="JP">🇯🇵 JP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleQuickSave}
                disabled={isSavingUrl || !quickUrl.trim()}
                className="w-full md:w-auto h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/10 font-medium flex items-center justify-center gap-2"
              >
                {isSavingUrl ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    সেভ হচ্ছে...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    সেভ করুন
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="প্রোডাক্ট বা ASIN সার্চ করুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px] rounded-xl">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="সব স্ট্যাটাস" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব স্ট্যাটাস</SelectItem>
              <SelectItem value="researching">রিসার্চিং</SelectItem>
              <SelectItem value="hot_opportunity">হট অপরচুনিটি</SelectItem>
              <SelectItem value="sourced">সোর্সড</SelectItem>
              <SelectItem value="launched">লঞ্চড</SelectItem>
              <SelectItem value="archived">আর্কাইভড</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Folders */}
        {folders && folders.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {folders.map((folder) => (
              <Badge
                key={folder.id}
                variant="outline"
                className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-1.5"
              >
                <FolderOpen className="h-3 w-3 mr-1" />
                {folder.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Products Grid */}
        {isLoading ? (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500">লোড হচ্ছে...</p>
          </div>
        ) : filteredProducts && filteredProducts.length > 0 ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <Link key={product.id} to={`/products/${product.id}`}>
                <Card className="border-0 shadow-lg hover:shadow-xl transition-all group cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl flex items-center justify-center">
                        <Package className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={statusColors[product.status || "researching"]}
                        >
                          {statusLabels[product.status || "researching"]}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDelete(e, product.id)}
                          className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-full"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <h3 className="font-bold text-slate-800 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {product.title || product.asin}
                    </h3>

                    <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                      <div className="flex items-center justify-between">
                        <span>ASIN</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {product.asin}
                        </span>
                      </div>
                      {product.price && (
                        <div className="flex items-center justify-between">
                          <span>প্রাইজ</span>
                          <span className="font-semibold text-green-600">
                            ${product.price}
                          </span>
                        </div>
                      )}
                      {product.bsr && (
                        <div className="flex items-center justify-between">
                          <span>BSR</span>
                          <span className="font-semibold">
                            #{product.bsr.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {product.rating && (
                        <div className="flex items-center justify-between">
                          <span>রেটিং</span>
                          <span>⭐ {product.rating}/5</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span>মার্কেটপ্লেস</span>
                        <span>{product.marketplace}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        {new Date(product.createdAt).toLocaleDateString("bn-BD")}
                      </span>
                      <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
              কোনো প্রোডাক্ট পাওয়া যায়নি
            </h3>
            <p className="text-slate-500 mb-6">
              {search || statusFilter !== "all"
                ? "ফিল্টার পরিবর্তন করুন"
                : "প্রথম প্রোডাক্ট রিসার্চ করুন"}
            </p>
            <Link to="/research">
              <Button className="rounded-full">
                <Plus className="h-4 w-4 mr-2" />
                রিসার্চ শুরু করুন
              </Button>
            </Link>
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
