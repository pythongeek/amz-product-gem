import { ProtectedLayout } from "@/components/Layout";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
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
import {
  Settings as SettingsIcon,
  User,
  Globe,
  DollarSign,
  MapPin,
  TrendingUp,
  Loader2,
  Save,
  Shield,
} from "lucide-react";

const experienceLevels = [
  { value: "beginner", label: "বিগিনার — নতুন শুরু করছি" },
  { value: "intermediate", label: "ইন্টারমিডিয়েট — কিছু অভিজ্ঞতা আছে" },
  { value: "advanced", label: "অ্যাডভান্সড — এক্সপার্ট" },
];

const budgetRanges = [
  { value: "500-2000", label: "$500 - $2,000" },
  { value: "2000-10000", label: "$2,000 - $10,000" },
  { value: "10000+", label: "$10,000+" },
];

const sourcingOptions = [
  { value: "alibaba", label: "শুধু Alibaba" },
  { value: "local", label: "শুধু লোকাল (বাংলাদেশ)" },
  { value: "both", label: "উভয়" },
];

const marginOptions = [
  { value: "20", label: "২০%" },
  { value: "25", label: "২৫%" },
  { value: "30", label: "৩০%" },
  { value: "40", label: "৪০%+" },
];

export default function Settings() {
  const { user } = useAuth();
  const updateMutation = trpc.auth.updateProfile.useMutation();
  const utils = trpc.useUtils();

  const [name, setName] = useState("");
  const [experience, setExperience] = useState("");
  const [budget, setBudget] = useState("");
  const [sourcing, setSourcing] = useState("");
  const [margin, setMargin] = useState("");
  const [localArea, setLocalArea] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load user data
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setExperience((user as any).experienceLevel || "");
      setBudget((user as any).budgetRange || "");
      setSourcing((user as any).preferredSourcing || "");
      setMargin((user as any).targetMargin?.toString() || "");
      setLocalArea((user as any).localArea || "");
    }
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaved(false);
    try {
      await updateMutation.mutateAsync({
        name: name || undefined,
        experienceLevel: experience || undefined,
        budgetRange: budget || undefined,
        preferredSourcing: sourcing || undefined,
        targetMargin: margin ? parseInt(margin) : undefined,
        localArea: localArea || undefined,
      });
      utils.auth.me.invalidate();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProtectedLayout>
      <div className="space-y-8 max-w-3xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            সেটিংস
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            আপনার প্রোফাইল ও পছন্দসমূহ পরিবর্তন করুন
          </p>
        </div>

        {/* Profile Section */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              প্রোফাইল তথ্য
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-slate-400" />
                নাম
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="আপনার নাম"
                className="h-12 rounded-xl"
              />
            </div>

            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-slate-400" />
                ইমেইল
              </Label>
              <Input
                value={(user as any)?.email || ""}
                disabled
                className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800"
              />
              <p className="text-xs text-slate-400 mt-1">
                ইমেইল পরিবর্তন করা যাবে না
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Business Preferences */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              ব্যবসায়িক পছন্দ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-slate-400" />
                অভিজ্ঞতার লেভেল
              </Label>
              <Select value={experience} onValueChange={setExperience}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  {experienceLevels.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-slate-400" />
                বাজেট রেঞ্জ
              </Label>
              <Select value={budget} onValueChange={setBudget}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="বাজেট নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  {budgetRanges.map((b) => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Globe className="h-4 w-4 text-slate-400" />
                পছন্দের সোর্সিং
              </Label>
              <Select value={sourcing} onValueChange={setSourcing}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="সোর্সিং নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  {sourcingOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-slate-400" />
                টার্গেট মার্জিন
              </Label>
              <Select value={margin} onValueChange={setMargin}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="মার্জিন নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  {marginOptions.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-slate-400" />
                লোকাল এলাকা
              </Label>
              <Input
                value={localArea}
                onChange={(e) => setLocalArea(e.target.value)}
                placeholder="যেমন: ঢাকা, চট্টগ্রাম, নারায়ণগঞ্জ"
                className="h-12 rounded-xl"
              />
              <p className="text-xs text-slate-400 mt-1">
                লোকাল সাপ্লায়ার রিসার্চের জন্য ব্যবহৃত হবে
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex items-center justify-between">
          <div>
            {saved && (
              <p className="text-green-600 font-medium">
                ✅ সেটিংস সেভ হয়েছে!
              </p>
            )}
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="h-12 px-8 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600"
          >
            {isSaving ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Save className="h-5 w-5 mr-2" />
            )}
            সেভ করুন
          </Button>
        </div>

        {/* Environment Variables Guide */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <SettingsIcon className="h-5 w-5 text-blue-600" />
              এনভায়রনমেন্ট ভেরিয়েবলস (Vercel Deploy-এর জন্য)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-800 text-green-400 p-4 rounded-xl font-mono text-xs overflow-x-auto space-y-1">
              <p># Supabase</p>
              <p>SUPABASE_URL=https://your-project.supabase.co</p>
              <p>SUPABASE_ANON_KEY=your-anon-key</p>
              <p>SUPABASE_SERVICE_KEY=your-service-key</p>
              <p>DATABASE_URL=postgresql://postgres:pass@db.project.supabase.co:5432/postgres</p>
              <p className="text-slate-500"># ---</p>
              <p># Kimi AI API</p>
              <p>KIMI_API_KEY=your-kimi-api-key</p>
              <p>KIMI_BASE_URL=https://api.moonshot.cn/v1</p>
              <p className="text-slate-500"># ---</p>
              <p># Security</p>
              <p>JWT_SECRET=your-random-secret-key</p>
              <p>CRON_SECRET=your-cron-secret-for-cron-jobs-org</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  );
}
