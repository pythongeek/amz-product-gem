import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package, Github, Chrome, TrendingUp, Shield, Zap } from "lucide-react";
import { Link } from "react-router";

export default function Login() {
  const { isAuthenticated, isLoading, loginWithGitHub, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-300">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-12 items-center">
        {/* Left Side - Info */}
        <div className="hidden lg:block space-y-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-2xl text-slate-800 dark:text-white">
                FBA AI Research
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Amazon FBA রিসার্চ প্ল্যাটফর্ম
              </p>
            </div>
          </Link>

          <div className="space-y-6">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white leading-tight">
              AI-পাওয়ার্ড প্রোডাক্ট{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                রিসার্চ টুল
              </span>
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
              Amazon-ে সফল প্রোডাক্ট খুঁজুন, FBA ফি হিসেব করুন, এবং লঞ্চ
              স্ট্র্যাটেজি তৈরি করুন — সবকিছু সম্পূর্ণ বাংলায়।
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                icon: TrendingUp,
                title: "১৩-পয়েন্ট ভ্যালিডেশন",
                desc: "প্রোডাক্ট স্কোরিং সিস্টেম",
              },
              {
                icon: Shield,
                title: "FBA ক্যালকুলেটর",
                desc: "২০২৬-এর লেটেস্ট ফি সহ",
              },
              {
                icon: Zap,
                title: "AI বাংলা রিপোর্ট",
                desc: "Kimi AI-জেনারেটেড",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="flex items-center gap-4 p-4 bg-white/60 dark:bg-slate-800/60 rounded-xl"
                >
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-white">
                      {item.title}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side - Login Card */}
        <div className="flex justify-center">
          <Card className="w-full max-w-md border-0 shadow-2xl shadow-blue-500/10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
                <Package className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                অ্যাকাউন্টে লগইন করুন
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Amazon FBA রিসার্চ শুরু করতে লগইন করুন
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <Button
                onClick={loginWithGitHub}
                variant="outline"
                className="w-full h-12 text-base font-medium border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
              >
                <Github className="h-5 w-5 mr-3" />
                GitHub দিয়ে লগইন
              </Button>

              <Button
                onClick={loginWithGoogle}
                variant="outline"
                className="w-full h-12 text-base font-medium border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
              >
                <Chrome className="h-5 w-5 mr-3 text-red-500" />
                Google দিয়ে লগইন
              </Button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200 dark:border-slate-700" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white dark:bg-slate-800 px-4 text-slate-400">
                    অথবা
                  </span>
                </div>
              </div>

              <div className="text-center text-sm text-slate-500 dark:text-slate-400 space-y-2">
                <p>
                  লগইন করার মাধ্যমে আপনি আমাদের{" "}
                  <a href="#" className="text-blue-600 hover:underline">
                    সার্ভিস টার্মস
                  </a>{" "}
                  এবং{" "}
                  <a href="#" className="text-blue-600 hover:underline">
                    প্রাইভেসি পলিসি
                  </a>{" "}
                  মেনে নিচ্ছেন।
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
