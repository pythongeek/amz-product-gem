import { Link, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  Search,
  Package,
  Calculator,
  FileText,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Database,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const navItems = [
  { path: "/dashboard", label: "ড্যাশবোর্ড", icon: LayoutDashboard },
  { path: "/research", label: "রিসার্চ", icon: Search },
  { path: "/products", label: "প্রোডাক্টস", icon: Package },
  { path: "/calculator", label: "FBA ক্যালকুলেটর", icon: Calculator },
  { path: "/reports", label: "রিপোর্টস", icon: FileText },
  { path: "/alerts", label: "অ্যালার্টস", icon: Bell },
  { path: "/settings", label: "সেটিংস", icon: Settings },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const items = isAdmin
    ? [...navItems, { path: "/admin/knowledge-base", label: "নলেজ বেস (Admin)", icon: Database }]
    : navItems;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <Link to="/dashboard" className="font-bold text-lg text-blue-600 dark:text-blue-400">
            FBA AI Research
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600 dark:text-slate-300 truncate max-w-[100px]">
            {user?.name || "ব্যবহারকারী"}
          </span>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border-r border-slate-200 dark:border-slate-700 z-50 transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6">
          <Link to="/dashboard" className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-800 dark:text-white leading-tight">
                FBA AI
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                রিসার্চ প্ল্যাটফর্ম
              </p>
            </div>
          </Link>

          <nav className="space-y-1">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive(item.path)
                      ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  {isActive(item.path) && (
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {(user?.name || "U")[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                {user?.name || "ব্যবহারকারী"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {(user as any)?.email || ""}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>লগআউট</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth({
    redirectOnUnauthenticated: true,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <Layout>{children}</Layout>;
}
