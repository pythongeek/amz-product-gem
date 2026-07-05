import { ProtectedLayout } from "@/components/Layout";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Bell,
  TrendingDown,
  BarChart3,
  MessageSquare,
  ShoppingCart,
  Users,
  Package,
  CheckCheck,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";

const alertIcons: Record<string, any> = {
  price_drop: TrendingDown,
  bsr_change: BarChart3,
  new_review: MessageSquare,
  buybox_change: ShoppingCart,
  new_competitor: Users,
  stockout: Package,
};

const alertLabels: Record<string, string> = {
  price_drop: "প্রাইস ড্রপ",
  bsr_change: "BSR পরিবর্তন",
  new_review: "নতুন রিভিউ",
  buybox_change: "Buy Box পরিবর্তন",
  new_competitor: "নতুন প্রতিযোগী",
  stockout: "স্টকআউট",
};

export default function Alerts() {
  const { data: alerts, isLoading } = trpc.alert.list.useQuery();
  const markReadMutation = trpc.alert.markRead.useMutation();
  const markAllReadMutation = trpc.alert.markAllRead.useMutation();
  const utils = trpc.useUtils();

  const [monitoringEnabled, setMonitoringEnabled] = useState(true);

  const handleMarkRead = async (id: number) => {
    await markReadMutation.mutateAsync({ id });
    utils.alert.list.invalidate();
  };

  const handleMarkAllRead = async () => {
    await markAllReadMutation.mutateAsync();
    utils.alert.list.invalidate();
  };

  const unreadCount = alerts?.filter((a) => !a.isRead).length || 0;

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                অ্যালার্টস
              </h1>
              {unreadCount > 0 && (
                <Badge className="bg-red-500 text-white">{unreadCount} নতুন</Badge>
              )}
            </div>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              প্রোডাক্ট মনিটরিং অ্যালার্ট ও নোটিফিকেশন
            </p>
          </div>
          <div className="flex items-center gap-4">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                onClick={handleMarkAllRead}
                className="rounded-xl"
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                সব পড়া হয়েছে
              </Button>
            )}
            <div className="flex items-center gap-3">
              <Switch
                id="monitoring"
                checked={monitoringEnabled}
                onCheckedChange={setMonitoringEnabled}
              />
              <Label htmlFor="monitoring" className="text-sm cursor-pointer">
                মনিটরিং {monitoringEnabled ? "অন" : "অফ"}
              </Label>
            </div>
          </div>
        </div>

        {/* Cron Job Setup Info */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <Bell className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-white mb-1">
                  cron-jobs.org সেটআপ
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  রিয়েল-টাইম মনিটরিং-এর জন্য cron-jobs.org-এ এই URLটি সেটআপ করুন:
                </p>
                <code className="block mt-2 p-3 bg-slate-800 text-green-400 rounded-lg text-xs font-mono">
                  POST https://your-app.vercel.app/api/cron/monitor
                  <br />
                  Headers: x-cron-secret: YOUR_CRON_SECRET
                </code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts List */}
        {isLoading ? (
          <div className="text-center py-20">
            <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-slate-500">লোড হচ্ছে...</p>
          </div>
        ) : alerts && alerts.length > 0 ? (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const Icon = alertIcons[alert.alertType] || Bell;
              return (
                <Card
                  key={alert.id}
                  className={`border-0 shadow-md transition-all ${
                    !alert.isRead
                      ? "bg-white dark:bg-slate-800 ring-2 ring-blue-100 dark:ring-blue-900/30"
                      : "bg-slate-50 dark:bg-slate-800/50"
                  }`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          !alert.isRead
                            ? "bg-blue-100 dark:bg-blue-900/30"
                            : "bg-slate-100 dark:bg-slate-700"
                        }`}
                      >
                        <Icon
                          className={`h-5 w-5 ${
                            !alert.isRead
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-slate-400"
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {alertLabels[alert.alertType] || alert.alertType}
                          </Badge>
                          {!alert.isRead && (
                            <Badge className="bg-blue-500 text-white text-xs">
                              নতুন
                            </Badge>
                          )}
                        </div>
                        <p
                          className={`text-sm ${
                            !alert.isRead
                              ? "font-semibold text-slate-800 dark:text-white"
                              : "text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {alert.message}
                        </p>
                        {alert.oldValue && alert.newValue && (
                          <p className="text-xs text-slate-500 mt-1">
                            {alert.oldValue} → {alert.newValue}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-2">
                          {new Date(alert.createdAt).toLocaleDateString("bn-BD", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      {!alert.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkRead(alert.id)}
                          className="rounded-lg text-xs"
                        >
                          পড়া হয়েছে
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <Bell className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                কোনো অ্যালার্ট নেই
              </h3>
              <p className="text-slate-500 mb-4">
                আপনার মনিটরিং অ্যালার্ট এখানে দেখা যাবে
              </p>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl max-w-md mx-auto">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 text-left">
                    মনিটরিং শুরু করতে cron-jobs.org-এ ওয়েবহুক সেটআপ করুন।
                    নির্দেশনা উপরে দেওয়া আছে।
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedLayout>
  );
}
