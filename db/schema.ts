import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  decimal,
  pgEnum,
} from "drizzle-orm/pg-core";

// Enums
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const productStatusEnum = pgEnum("product_status", [
  "researching",
  "hot_opportunity",
  "sourced",
  "launched",
  "archived",
]);
export const alertTypeEnum = pgEnum("alert_type", [
  "price_drop",
  "bsr_change",
  "new_review",
  "buybox_change",
  "new_competitor",
  "stockout",
]);
export const researchJobStatusEnum = pgEnum("research_job_status", [
  "pending",
  "running",
  "completed",
  "failed",
]);

// Users table (synced with Supabase Auth)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  supabaseUid: varchar("supabase_uid", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 320 }),
  name: varchar("name", { length: 255 }),
  avatar: text("avatar"),
  role: userRoleEnum("role").default("user").notNull(),
  experienceLevel: varchar("experience_level", { length: 50 }),
  budgetRange: varchar("budget_range", { length: 50 }),
  preferredSourcing: varchar("preferred_sourcing", { length: 50 }),
  targetMargin: integer("target_margin"),
  localArea: varchar("local_area", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Products / Research Results
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  asin: varchar("asin", { length: 20 }).notNull(),
  title: text("title"),
  price: decimal("price", { precision: 10, scale: 2 }),
  priceRange: varchar("price_range", { length: 100 }),
  rating: decimal("rating", { precision: 3, scale: 1 }),
  reviewCount: integer("review_count"),
  amazonChoice: boolean("amazon_choice").default(false),
  amazonChoiceReason: text("amazon_choice_reason"),
  bsr: integer("bsr"),
  bsrCategory: varchar("bsr_category", { length: 255 }),
  imageUrl: text("image_url"),
  sellerCount: integer("seller_count"),
  fbaSellers: integer("fba_sellers"),
  fbmSellers: integer("fbm_sellers"),
  variationCount: integer("variation_count"),
  qaCount: integer("qa_count"),
  hasAplusContent: boolean("has_aplus_content").default(false),
  hasVideo: boolean("has_video").default(false),
  launchDate: timestamp("launch_date"),
  reviewVelocity: decimal("review_velocity", { precision: 10, scale: 2 }),
  salesEstimate: integer("sales_estimate"),
  marketplace: varchar("marketplace", { length: 10 }).default("US"),
  status: productStatusEnum("status").default("researching"),
  tags: jsonb("tags").default([]),
  notes: text("notes"),
  folderId: integer("folder_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Product Scores (13-Point Validation)
export const productScores = pgTable("product_scores", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .references(() => products.id)
    .notNull(),
  userId: integer("user_id").references(() => users.id),
  priceScore: integer("price_score"),
  sizeWeightScore: integer("size_weight_score"),
  marketSizeScore: integer("market_size_score"),
  reviewBarrierScore: integer("review_barrier_score"),
  differentiationScore: integer("differentiation_score"),
  seasonalityScore: integer("seasonality_score"),
  complexityScore: integer("complexity_score"),
  returnRateScore: integer("return_rate_score"),
  brandDominanceScore: integer("brand_dominance_score"),
  trendScore: integer("trend_score"),
  defensibilityScore: integer("defensibility_score"),
  manufacturabilityScore: integer("manufacturability_score"),
  marginScore: integer("margin_score"),
  totalScore: integer("total_score"),
  grade: varchar("grade", { length: 1 }),
  recommendation: varchar("recommendation", { length: 50 }),
  analysisData: jsonb("analysis_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// AI Research Reports (Bangla)
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .references(() => products.id)
    .notNull(),
  userId: integer("user_id").references(() => users.id),
  title: text("title"),
  content: text("content"),
  summary: text("summary"),
  marketAnalysis: text("market_analysis"),
  competitionAnalysis: text("competition_analysis"),
  profitAnalysis: text("profit_analysis"),
  riskAnalysis: text("risk_analysis"),
  recommendation: text("recommendation"),
  sentimentData: jsonb("sentiment_data"),
  trendsData: jsonb("trends_data"),
  differentiationIdeas: jsonb("differentiation_ideas"),
  language: varchar("language", { length: 10 }).default("bn"),
  isPdfExported: boolean("is_pdf_exported").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// FBA Cost Calculations
export const fbaCalculations = pgTable("fba_calculations", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .references(() => products.id)
    .notNull(),
  sellingPrice: decimal("selling_price", { precision: 10, scale: 2 }),
  productCost: decimal("product_cost", { precision: 10, scale: 2 }),
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }),
  referralFee: decimal("referral_fee", { precision: 10, scale: 2 }),
  fbaFee: decimal("fba_fee", { precision: 10, scale: 2 }),
  storageFee: decimal("storage_fee", { precision: 10, scale: 2 }),
  ppcCost: decimal("ppc_cost", { precision: 10, scale: 2 }),
  returnsCost: decimal("returns_cost", { precision: 10, scale: 2 }),
  netProfit: decimal("net_profit", { precision: 10, scale: 2 }),
  marginPercent: decimal("margin_percent", { precision: 5, scale: 2 }),
  breakEvenAcos: decimal("break_even_acos", { precision: 5, scale: 2 }),
  category: varchar("category", { length: 100 }),
  productSize: varchar("product_size", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Alerts / Monitoring
export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .references(() => products.id)
    .notNull(),
  userId: integer("user_id").references(() => users.id),
  alertType: alertTypeEnum("alert_type").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  message: text("message"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Launch Strategies
export const launchStrategies = pgTable("launch_strategies", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .references(() => products.id)
    .notNull(),
  userId: integer("user_id").references(() => users.id),
  title: text("title"),
  content: text("content"),
  listingTitle: text("listing_title"),
  bulletPoints: jsonb("bullet_points"),
  keywords: jsonb("keywords"),
  pricingStrategy: jsonb("pricing_strategy"),
  ppcCampaign: jsonb("ppc_campaign"),
  reviewStrategy: jsonb("review_strategy"),
  inventoryPlan: jsonb("inventory_plan"),
  timeline: jsonb("timeline"),
  marketingChannels: jsonb("marketing_channels"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Activity Log
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }),
  entityId: integer("entity_id"),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Folders for Product Organization
export const folders = pgTable("folders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Admin Credentials (separate from OAuth users)
export const adminCredentials = pgTable("admin_credentials", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: varchar("name", { length: 255 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Cron job state tracking
export const cronState = pgTable("cron_state", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Research Jobs Queue — for async AI processing (bypasses Vercel 8s timeout)
export const researchJobs = pgTable("research_jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  input: text("input").notNull(), // URL or keyword
  inputType: varchar("input_type", { length: 20 }).notNull(), // "url" | "keyword"
  marketplace: varchar("marketplace", { length: 10 }).default("US"),
  status: researchJobStatusEnum("status").default("pending").notNull(),
  result: text("result"), // AI-generated report
  scores: jsonb("scores"), // 13-point validation scores
  error: text("error"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type ProductScore = typeof productScores.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type FbaCalculation = typeof fbaCalculations.$inferSelect;
export type Alert = typeof alerts.$inferSelect;
export type LaunchStrategy = typeof launchStrategies.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Folder = typeof folders.$inferSelect;
export type AdminCredential = typeof adminCredentials.$inferSelect;
export type InsertAdminCredential = typeof adminCredentials.$inferInsert;
export type CronState = typeof cronState.$inferSelect;
export type InsertCronState = typeof cronState.$inferInsert;
export type ResearchJob = typeof researchJobs.$inferSelect;
export type InsertResearchJob = typeof researchJobs.$inferInsert;
