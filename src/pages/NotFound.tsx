import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="text-center max-w-lg">
        <div className="text-9xl font-bold bg-gradient-to-br from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          ৪০৪
        </div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-4">
          পেজ পাওয়া যায়নি
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8 text-lg">
          আপনি যে পেজটি খুঁজছেন তা বিদ্যমান নেই বা সরিয়ে ফেলা হয়েছে।
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            className="rounded-full px-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            পেছনে যান
          </Button>
          <Link to="/dashboard">
            <Button className="rounded-full px-6 bg-gradient-to-r from-blue-600 to-purple-600">
              <Home className="h-4 w-4 mr-2" />
              ড্যাশবোর্ডে যান
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
