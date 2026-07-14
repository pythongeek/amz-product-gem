import { ProtectedLayout } from "@/components/Layout";
import { trpc } from "@/providers/trpc";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit2, Trash2, Search, RefreshCw, Database } from "lucide-react";
import { toast } from "sonner";

interface RateFormState {
  id?: number;
  marketplace: string;
  feeType: string;
  category: string;
  sizeTier: string;
  weightMinOz: string;
  weightMaxOz: string;
  priceMin: string;
  priceMax: string;
  rateType: "percent" | "flat";
  rateValue: string;
  currency: string;
  notes: string;
  effectiveDate: string;
  source: string;
}

const initialFormState: RateFormState = {
  marketplace: "US",
  feeType: "referral",
  category: "",
  sizeTier: "",
  weightMinOz: "",
  weightMaxOz: "",
  priceMin: "",
  priceMax: "",
  rateType: "percent",
  rateValue: "0",
  currency: "USD",
  notes: "",
  effectiveDate: new Date().toISOString().split("T")[0],
  source: "",
};

export default function KnowledgeBase() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formState, setFormState] = useState<RateFormState>(initialFormState);
  const [isEditing, setIsEditing] = useState(false);

  const { data: rates, isLoading: ratesLoading, refetch } = trpc.admin.listRates.useQuery(undefined, {
    enabled: isAdmin,
  });

  const insertMutation = trpc.admin.insertRate.useMutation({
    onSuccess: () => {
      toast.success("ফি রেট সফলভাবে যুক্ত করা হয়েছে।");
      refetch();
      setDialogOpen(false);
    },
    onError: (err) => {
      toast.error(`ব্যর্থ হয়েছে: ${err.message}`);
    },
  });

  const updateMutation = trpc.admin.updateRate.useMutation({
    onSuccess: () => {
      toast.success("ফি রেট সফলভাবে আপডেট করা হয়েছে।");
      refetch();
      setDialogOpen(false);
    },
    onError: (err) => {
      toast.error(`ব্যর্থ হয়েছে: ${err.message}`);
    },
  });

  const deleteMutation = trpc.admin.deleteRate.useMutation({
    onSuccess: () => {
      toast.success("ফি রেট সফলভাবে ডিলিট করা হয়েছে।");
      refetch();
    },
    onError: (err) => {
      toast.error(`ব্যর্থ হয়েছে: ${err.message}`);
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleOpenAdd = () => {
    setFormState(initialFormState);
    setIsEditing(false);
    setDialogOpen(true);
  };

  const handleOpenEdit = (rate: any) => {
    setFormState({
      id: rate.id,
      marketplace: rate.marketplace,
      feeType: rate.feeType,
      category: rate.category || "",
      sizeTier: rate.sizeTier || "",
      weightMinOz: rate.weightMinOz ? String(rate.weightMinOz) : "",
      weightMaxOz: rate.weightMaxOz ? String(rate.weightMaxOz) : "",
      priceMin: rate.priceMin ? String(rate.priceMin) : "",
      priceMax: rate.priceMax ? String(rate.priceMax) : "",
      rateType: rate.rateType as "percent" | "flat",
      rateValue: String(rate.rateValue),
      currency: rate.currency || "USD",
      notes: rate.notes || "",
      effectiveDate: rate.effectiveDate ? rate.effectiveDate.split("T")[0] : "",
      source: rate.source || "",
    });
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("আপনি কি নিশ্চিতভাবে এই ফি রেটটি ডিলিট করতে চান?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      marketplace: formState.marketplace,
      feeType: formState.feeType,
      category: formState.category || null,
      sizeTier: formState.sizeTier || null,
      weightMinOz: formState.weightMinOz ? Number(formState.weightMinOz) : null,
      weightMaxOz: formState.weightMaxOz ? Number(formState.weightMaxOz) : null,
      priceMin: formState.priceMin ? Number(formState.priceMin) : null,
      priceMax: formState.priceMax ? Number(formState.priceMax) : null,
      rateType: formState.rateType,
      rateValue: Number(formState.rateValue),
      currency: formState.currency,
      notes: formState.notes || null,
      effectiveDate: formState.effectiveDate,
      source: formState.source || null,
    };

    if (isEditing && formState.id) {
      updateMutation.mutate({ id: formState.id, ...payload });
    } else {
      insertMutation.mutate(payload);
    }
  };

  const filteredRates = rates?.filter((rate) => {
    const term = search.toLowerCase();
    return (
      rate.marketplace.toLowerCase().includes(term) ||
      rate.feeType.toLowerCase().includes(term) ||
      (rate.category && rate.category.toLowerCase().includes(term)) ||
      (rate.notes && rate.notes.toLowerCase().includes(term))
    );
  });

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <Database className="h-8 w-8 text-blue-500" />
              নলেজ বেস ম্যানেজার
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              অ্যামাজন FBA ফি রেট ও রুলস সম্বলিত নলেজ বেস পরিচালনা করুন
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              className="rounded-full"
              disabled={ratesLoading}
            >
              <RefreshCw className={`h-4 w-4 ${ratesLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              onClick={handleOpenAdd}
              className="bg-blue-600 hover:bg-blue-700 rounded-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              নতুন ফি রেট যুক্ত করুন
            </Button>
          </div>
        </div>

        {/* Stats card */}
        <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur border-slate-200 dark:border-slate-700">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              মোট রেকর্ড: <span className="font-semibold text-slate-800 dark:text-white">{rates?.length || 0} টি</span>
            </div>
            <div className="relative w-64 sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="মার্কেটপ্লেস, টাইপ বা ক্যাটাগরি খুঁজুন..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 rounded-xl bg-white dark:bg-slate-900"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table list */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>মার্কেটপ্লেস</TableHead>
                  <TableHead>ফি টাইপ</TableHead>
                  <TableHead>ক্যাটাগরি</TableHead>
                  <TableHead>ওজন/সাইজ টিয়ার</TableHead>
                  <TableHead>প্রাইস রেঞ্জ</TableHead>
                  <TableHead>ফি রেট</TableHead>
                  <TableHead>কার্যকরী তারিখ</TableHead>
                  <TableHead>নোট</TableHead>
                  <TableHead className="text-right">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ratesLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-slate-400">
                      লোড হচ্ছে...
                    </TableCell>
                  </TableRow>
                ) : filteredRates?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-slate-400">
                      কোনো ফি রেট পাওয়া যায়নি।
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRates?.map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell className="font-semibold text-blue-600 dark:text-blue-400">
                        {rate.marketplace}
                      </TableCell>
                      <TableCell className="capitalize">{rate.feeType.replace("_", " ")}</TableCell>
                      <TableCell className="max-w-[150px] truncate" title={rate.category || "সব ক্যাটাগরি"}>
                        {rate.category || <span className="text-slate-400 italic">সব ক্যাটাগরি</span>}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          {rate.sizeTier && <div className="font-semibold capitalize">{rate.sizeTier.replace("_", " ")}</div>}
                          {(rate.weightMinOz || rate.weightMaxOz) && (
                            <div className="text-slate-500">
                              {rate.weightMinOz || 0} - {rate.weightMaxOz || "∞"} oz
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {rate.priceMin || rate.priceMax ? (
                          <span>
                            {rate.currency} {rate.priceMin || 0} - {rate.priceMax || "∞"}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">যেকোনো</span>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {rate.rateType === "percent"
                          ? `${(Number(rate.rateValue) * 100).toFixed(2)}%`
                          : `${rate.currency} ${Number(rate.rateValue).toFixed(2)}`}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {rate.effectiveDate ? new Date(rate.effectiveDate).toLocaleDateString() : ""}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-slate-500 text-xs" title={rate.notes || ""}>
                        {rate.notes || ""}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(rate)}
                            className="h-8 w-8 text-blue-600 dark:text-blue-400"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(rate.id)}
                            className="h-8 w-8 text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg rounded-xl">
            <DialogHeader>
              <DialogTitle>
                {isEditing ? "ফি রেট সংশোধন করুন" : "নতুন ফি রেট যুক্ত করুন"}
              </DialogTitle>
              <DialogDescription>
                অ্যামাজন ফি ক্যালকুলেটর ও AI গ্রাউন্ডিংয়ের জন্য সঠিক প্যারামিটার দিয়ে ফর্মটি পূরণ করুন।
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">মার্কেটপ্লেস</label>
                  <Select
                    value={formState.marketplace}
                    onValueChange={(val) => setFormState({ ...formState, marketplace: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="নির্বাচন করুন" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">US (United States)</SelectItem>
                      <SelectItem value="UK">UK (United Kingdom)</SelectItem>
                      <SelectItem value="DE">DE (Germany)</SelectItem>
                      <SelectItem value="FR">FR (France)</SelectItem>
                      <SelectItem value="IT">IT (Italy)</SelectItem>
                      <SelectItem value="ES">ES (Spain)</SelectItem>
                      <SelectItem value="CA">CA (Canada)</SelectItem>
                      <SelectItem value="JP">JP (Japan)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">ফি টাইপ</label>
                  <Select
                    value={formState.feeType}
                    onValueChange={(val) => setFormState({ ...formState, feeType: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="নির্বাচন করুন" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="referral">Referral Fee</SelectItem>
                      <SelectItem value="fulfillment">Fulfillment Fee</SelectItem>
                      <SelectItem value="storage">Storage Fee</SelectItem>
                      <SelectItem value="inbound_placement">Inbound Placement Fee</SelectItem>
                      <SelectItem value="aged_inventory">Aged Inventory Fee</SelectItem>
                      <SelectItem value="returns_processing">Returns Processing</SelectItem>
                      <SelectItem value="low_inventory">Low Inventory Fee</SelectItem>
                      <SelectItem value="removal">Removal Fee</SelectItem>
                      <SelectItem value="disposal">Disposal Fee</SelectItem>
                      <SelectItem value="subscription">Subscription</SelectItem>
                      <SelectItem value="fuel_surcharge">Fuel Surcharge</SelectItem>
                      <SelectItem value="low_price_fba_discount">Low-Price FBA Discount</SelectItem>
                      <SelectItem value="sipp_packaging_penalty">SIPP Packaging Penalty</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">ক্যাটাগরি (ঐচ্ছিক)</label>
                  <Input
                    value={formState.category}
                    onChange={(e) => setFormState({ ...formState, category: e.target.value })}
                    placeholder="উদা: electronics, clothing"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">সাইজ টিয়ার (ঐচ্ছিক)</label>
                  <Input
                    value={formState.sizeTier}
                    onChange={(e) => setFormState({ ...formState, sizeTier: e.target.value })}
                    placeholder="উদা: small_standard, oversize"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-500">ওজন রেঞ্জ (Oz)</label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="any"
                      placeholder="মিন"
                      value={formState.weightMinOz}
                      onChange={(e) => setFormState({ ...formState, weightMinOz: e.target.value })}
                    />
                    <Input
                      type="number"
                      step="any"
                      placeholder="ম্যাক্স"
                      value={formState.weightMaxOz}
                      onChange={(e) => setFormState({ ...formState, weightMaxOz: e.target.value })}
                    />
                  </div>
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-500">প্রাইস রেঞ্জ ($)</label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="any"
                      placeholder="মিন"
                      value={formState.priceMin}
                      onChange={(e) => setFormState({ ...formState, priceMin: e.target.value })}
                    />
                    <Input
                      type="number"
                      step="any"
                      placeholder="ম্যাক্স"
                      value={formState.priceMax}
                      onChange={(e) => setFormState({ ...formState, priceMax: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">রেট টাইপ</label>
                  <Select
                    value={formState.rateType}
                    onValueChange={(val: any) => setFormState({ ...formState, rateType: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="নির্বাচন" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percentage (%)</SelectItem>
                      <SelectItem value="flat">Flat Value ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">রেট ভ্যালু (যেমন 0.15 বা 3.99)</label>
                  <Input
                    type="number"
                    step="any"
                    value={formState.rateValue}
                    onChange={(e) => setFormState({ ...formState, rateValue: e.target.value })}
                    placeholder="0.15"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">কারেন্সি</label>
                  <Input
                    value={formState.currency}
                    onChange={(e) => setFormState({ ...formState, currency: e.target.value })}
                    placeholder="USD, GBP, EUR"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">কার্যকরী তারিখ</label>
                  <Input
                    type="date"
                    value={formState.effectiveDate}
                    onChange={(e) => setFormState({ ...formState, effectiveDate: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">উৎস / প্রমাণসূত্র</label>
                  <Input
                    value={formState.source}
                    onChange={(e) => setFormState({ ...formState, source: e.target.value })}
                    placeholder="উদা: FBA Guide 2026"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">নোট</label>
                <Input
                  value={formState.notes}
                  onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
                  placeholder="রেট সম্পর্কিত অতিরিক্ত বিবরণ"
                />
              </div>

              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="rounded-full"
                >
                  বাতিল করুন
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-full"
                  disabled={insertMutation.isPending || updateMutation.isPending}
                >
                  {(insertMutation.isPending || updateMutation.isPending) && (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  সংরক্ষণ করুন
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedLayout>
  );
}
