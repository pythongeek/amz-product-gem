import { ProtectedLayout } from "@/components/Layout";
import { trpc } from "@/providers/trpc";
import { Link } from "react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  const { data: products, isLoading } = trpc.product.list.useQuery();
  const { data: folders } = trpc.product.listFolders.useQuery();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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
          <Link to="/research">
            <Button className="bg-blue-600 hover:bg-blue-700 rounded-full">
              <Plus className="h-4 w-4 mr-2" />
              নতুন রিসার্চ
            </Button>
          </Link>
        </div>

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
                      <Badge
                        className={statusColors[product.status || "researching"]}
                      >
                        {statusLabels[product.status || "researching"]}
                      </Badge>
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
