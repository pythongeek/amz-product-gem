import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import {
  Search,
  BarChart3,
  Calculator,
  Rocket,
  Shield,
  Zap,
  Globe,
  ChevronRight,
  Star,
  TrendingUp,
  Package,
  FileText,
} from "lucide-react";

const features = [
  {
    icon: Search,
    title: "AI প্রোডাক্ট রিসার্চ",
    description:
      "Amazon-ের যেকোনো প্রোডাক্ট বিশ্লেষণ করুন AI দিয়ে। মার্কেট চাহিদা, প্রতিযোগিতা, এবং লাভের সম্ভাবনা এক নজরে দেখুন।",
  },
  {
    icon: BarChart3,
    title: "13-পয়েন্ট ভ্যালিডেশন",
    description:
      "আমাদের বিশেষজ্ঞ চেকলিস্ট প্রতিটি প্রোডাক্টকে ১৩টি ক্রাইটেরিয়ায় মূল্যায়ন করে সেরা সুযোগ খুঁজে দেয়।",
  },
  {
    icon: Calculator,
    title: "FBA ক্যালকুলেটর",
    description:
      "Amazon-ের সকল ফি হিসেব করে নিট লাভ বের করুন। ২০২৬-এর লেটেস্ট ফি স্ট্রাকচার সাপোর্টেড।",
  },
  {
    icon: Rocket,
    title: "লঞ্চ স্ট্র্যাটেজি",
    description:
      "Day 0-90 লঞ্চ প্ল্যান, PPC ক্যাম্পেইন স্ট্রাকচার, এবং রিভিউ জেনারেশন স্ট্র্যাটেজি পান AI-জেনারেটেড।",
  },
  {
    icon: FileText,
    title: "বাংলা রিপোর্ট",
    description:
      "সম্পূর্ণ বাংলায় AI-জেনারেটেড রিসার্চ রিপোর্ট। PDF হিসেবে এক্সপোর্ট করুন এবং টীমের সাথে শেয়ার করুন।",
  },
  {
    icon: Shield,
    title: "মনিটরিং অ্যালার্ট",
    description:
      "BSR পরিবর্তন, প্রাইস ড্রপ, নতুন রিভিউ — সবকিছুর নোটিফিকেশন পান রিয়েল-টাইমে।",
  },
];

const stats = [
  { value: "১০০০+", label: "এক্টিভ ব্যবহারকারী" },
  { value: "৫০K+", label: "প্রোডাক্ট রিসার্চড" },
  { value: "৯৫%", label: "সন্তুষ্টি রেট" },
  { value: "২৪/৭", label: "AI সাপোর্ট" },
];

const pricingPlans = [
  {
    name: "ফ্রি",
    price: "৳০",
    period: "চিরকাল",
    features: [
      "৫টি প্রোডাক্ট রিসার্চ/মাস",
      "বেসিক ৭-পয়েন্ট স্কোরিং",
      "টেক্সট বাংলা রিপোর্ট",
      "৭ দিন ডেটা রিটেনশন",
    ],
    cta: "ফ্রিতে শুরু করুন",
    highlighted: false,
  },
  {
    name: "প্রো",
    price: "৳২,৯৯০",
    period: "/মাস",
    features: [
      "আনলিমিটেড রিসার্চ",
      "ফুল 13-পয়েন্ট চেকলিস্ট",
      "Google Trends ইন্টিগ্রেশন",
      "FBA ক্যালকুলেটর (সকল ফি)",
      "PDF রিপোর্ট এক্সপোর্ট",
      "ইমেইল অ্যালার্টস",
    ],
    cta: "প্রোতে আপগ্রেড",
    highlighted: true,
  },
  {
    name: "এজেন্সি",
    price: "৳৯,৯৯০",
    period: "/মাস",
    features: [
      "প্রো-এর সব ফিচার",
      "৫ টীম মেম্বার",
      "White-label রিপোর্ট",
      "API অ্যাক্সেস",
      "প্রায়রিটি সাপোর্ট",
      "কাস্টম ইন্টিগ্রেশন",
    ],
    cta: "এজেন্সি প্ল্যান",
    highlighted: false,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Package className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-xl text-slate-800 dark:text-white">
                FBA AI Research
              </span>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors"
              >
                লগইন
              </Link>
              <Link to="/login">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6">
                  ফ্রিতে শুরু করুন
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/30 dark:via-purple-950/30 dark:to-pink-950/30" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Zap className="h-4 w-4" />
              <span>AI-পাওয়ার্ড Amazon FBA রিসার্চ টুল</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-slate-900 dark:text-white leading-tight mb-6">
              বাংলাদেশি উদ্যোক্তাদের জন্য{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Amazon FBA
              </span>{" "}
              সাক্সেস প্ল্যাটফর্ম
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
              AI দিয়ে প্রোডাক্ট রিসার্চ করুন, প্রফিট ক্যালকুলেট করুন, এবং লঞ্চ
              স্ট্র্যাটেজি পান — সবকিছু সম্পূর্ণ বাংলায়। আপনার Amazon FBA
              জার্নি শুরু করুন আজই।
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/login">
                <Button
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 py-6 text-lg shadow-xl shadow-blue-500/25"
                >
                  <Search className="h-5 w-5 mr-2" />
                  ফ্রি রিসার্চ শুরু করুন
                </Button>
              </Link>
              <a
                href="#features"
                className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors px-6 py-3"
              >
                ফিচার দেখুন
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl lg:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                  {stat.value}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              সম্পূর্ণ FBA রিসার্চ স্যুট
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              প্রোডাক্ট ডিসকভারি থেকে লঞ্চ পর্যন্ত — সবকিছু এক প্ল্যাটফর্মে
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={i}
                  className="group p-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              কিভাবে কাজ করে
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              মাত্র ৩ স্টেপে আপনার প্রোডাক্ট রিসার্চ শুরু করুন
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "০১",
                title: "URL দিন বা কীওয়ার্ড সার্চ করুন",
                description:
                  "Amazon প্রোডাক্ট URL পেস্ট করুন অথবা কীওয়ার্ড দিয়ে সার্চ করুন।",
              },
              {
                step: "০২",
                title: "AI বিশ্লেষণ দেখুন",
                description:
                  "Kimi AI প্রোডাক্টকে বিশ্লেষণ করে বাংলায় সম্পূর্ণ রিপোর্ট তৈরি করে।",
              },
              {
                step: "০৩",
                title: "সিদ্ধান্ত নিন ও লঞ্চ করুন",
                description:
                  "13-পয়েন্ট স্কোর, FBA ক্যালকুলেশন, এবং লঞ্চ প্ল্যান দেখে সিদ্ধান্ত নিন।",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-lg"
              >
                <span className="text-6xl font-bold text-blue-100 dark:text-blue-900 absolute top-4 right-4">
                  {item.step}
                </span>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-3 relative">
                  {item.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 relative">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              সহজ মূল্যায়ন
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              আপনার ব্যবসার জন্য সেরা প্ল্যান বেছে নিন
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative p-8 rounded-2xl ${
                  plan.highlighted
                    ? "bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-xl shadow-blue-500/25 scale-105"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs font-bold px-4 py-1 rounded-full">
                    সবচেয়ে জনপ্রিয়
                  </div>
                )}
                <h3
                  className={`text-xl font-bold mb-2 ${
                    plan.highlighted
                      ? "text-white"
                      : "text-slate-800 dark:text-white"
                  }`}
                >
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span
                    className={`text-4xl font-bold ${
                      plan.highlighted
                        ? "text-white"
                        : "text-slate-900 dark:text-white"
                    }`}
                  >
                    {plan.price}
                  </span>
                  <span
                    className={`text-sm ${
                      plan.highlighted
                        ? "text-blue-100"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {plan.period}
                  </span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Star
                        className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                          plan.highlighted
                            ? "text-yellow-300"
                            : "text-blue-500"
                        }`}
                      />
                      <span
                        className={`text-sm ${
                          plan.highlighted
                            ? "text-blue-50"
                            : "text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link to="/login" className="block">
                  <Button
                    className={`w-full rounded-full ${
                      plan.highlighted
                        ? "bg-white text-blue-600 hover:bg-blue-50"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl p-12 shadow-2xl shadow-blue-500/25">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            আজই শুরু করুন আপনার FBA জার্নি
          </h2>
          <p className="text-blue-100 mb-8 text-lg">
            প্রথম ৫টি রিসার্চ ফ্রি। ক্রেডিট কার্ডের প্রয়োজন নেই।
          </p>
          <Link to="/login">
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-blue-50 rounded-full px-8 py-6 text-lg font-bold"
            >
              <TrendingUp className="h-5 w-5 mr-2" />
              বিনামূল্যে রেজিস্টার করুন
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Package className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-slate-800 dark:text-white">
                FBA AI Research
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
              © ২০২৬ Amazon FBA AI Research Platform — বাংলাদেশি উদ্যোক্তাদের জন্য তৈরি 🇧🇩
            </p>
            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                বাংলা
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
