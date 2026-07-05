export const Session = {
  cookieName: "fba_session",
  maxAgeMs: 365 * 24 * 60 * 60 * 1000,
} as const;

export const ErrorMessages = {
  unauthenticated: "লগইন প্রয়োজন (Authentication Required)",
  insufficientRole: "অপর্যাপ্ত অনুমতি (Insufficient Permissions)",
} as const;

export const Paths = {
  login: "/login",
  dashboard: "/dashboard",
  research: "/research",
  products: "/products",
  calculator: "/calculator",
  launch: "/launch",
  reports: "/reports",
  alerts: "/alerts",
  settings: "/settings",
} as const;
