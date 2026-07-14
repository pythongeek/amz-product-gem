import { ProtectedLayout } from "@/components/Layout";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router";
import {
  Package,
  Flame,
  Rocket,
  Search,
  TrendingUp,
  Bell,
  Calendar,
  ArrowRight,
  Activity,
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

export default function Dashboard() {
  const { data: stats, isLoading } = trpc.dashboard.getStats.useQuery();
  const { data: recentProducts } = trpc.dashboard.getRecentProducts.useQuery();

  const statCards = [
    {
      title: "মোট প্রোডাক্ট",
      value: stats?.totalProducts || 0,
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      title: "হট অপরচুনিটি",
      value: stats?.hotOpportunities || 0,
      icon: Flame,
      color: "text-orange-600",
      bg: "bg-orange-50 dark:bg-orange-900/20",
    },
    {
      title: "লঞ্চড",
      value: stats?.launched || 0,
      icon: Rocket,
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-900/20",
    },
    {
      title: "নতুন অ্যালার্ট",
      value: stats?.unreadAlerts || 0,
      icon: Bell,
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-900/20",
    },
  ];

  return (
    <ProtectedLayout>
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              ড্যাশবোর্ড
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              আপনার Amazon FBA রিসার্চ ওভারভিউ
            </p>
          </div>
          <Link to="/research">
            <Button className="bg-blue-600 hover:bg-blue-700 rounded-full">
              <Search className="h-4 w-4 mr-2" />
              নতুন রিসার্চ
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.title}
                className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-slate-800/50 bg-white dark:bg-slate-800"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                        {stat.title}
                      </p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white">
                        {isLoading ? "..." : stat.value}
                      </p>
                    </div>
                    <div
                      className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center`}
                    >
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Products */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-slate-800/50 bg-white dark:bg-slate-800">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-800 dark:text-white">
                    সাম্প্রতিক প্রোডাক্টস
                  </CardTitle>
                  <Link
                    to="/products"
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    সব দেখুন
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {recentProducts && recentProducts.length > 0 ? (
                  <div className="space-y-3">
                    {recentProducts.slice(0, 5).map((product) => (
                      <Link
                        key={product.id}
                        to={`/products/${product.id}`}
                        className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                            {product.title || product.asin}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
                            <span>ASIN: {product.asin}</span>
                            {product.price && (
                              <span>${product.price}</span>
                            )}
                            {product.bsr && (
                              <span>BSR: #{product.bsr}</span>
                            )}
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            statusColors[product.status || "researching"]
                          }`}
                        >
                          {statusLabels[product.status || "researching"]}
                        </span>
                        <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 dark:text-slate-400 mb-4">
                      এখনো কোনো প্রোডাক্ট রিসার্চ করা হয়নি
                    </p>
                    <Link to="/research">
                      <Button variant="outline" className="rounded-full">
                        প্রথম রিসার্চ করুন
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-slate-800/50 bg-white dark:bg-slate-800">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-slate-800 dark:text-white">
                  দ্রুত অ্যাকশন
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to="/research">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-12 rounded-xl"
                  >
                    <Search className="h-4 w-4 text-blue-600" />
                    প্রোডাক্ট রিসার্চ
                  </Button>
                </Link>
                <Link to="/calculator">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-12 rounded-xl"
                  >
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    FBA ক্যালকুলেটর
                  </Button>
                </Link>
                <Link to="/alerts">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-12 rounded-xl"
                  >
                    <Bell className="h-4 w-4 text-orange-600" />
                    অ্যালার্টস দেখুন
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-slate-800/50 bg-white dark:bg-slate-800">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-slate-800 dark:text-white">
                  সাম্প্রতিক অ্যাক্টিভিটি
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {stats.recentActivity.slice(0, 5).map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3"
                      >
                        <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Activity className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-700 dark:text-slate-300">
                            {activity.action}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(activity.createdAt).toLocaleDateString(
                              "bn-BD"
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-4">
                    কোনো অ্যাক্টিভিটি নেই
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
