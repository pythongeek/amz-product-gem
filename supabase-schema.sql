-- ============================================================
-- FULL DATABASE SCHEMA for amz-product-gem
-- Run this in Supabase SQL Editor (all at once)
-- ============================================================

-- Drop existing enum types if they exist (to avoid conflicts)
-- Create enums safely without dropping tables/columns
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE product_status AS ENUM ('researching', 'hot_opportunity', 'sourced', 'launched', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE alert_type AS ENUM ('price_drop', 'bsr_change', 'new_review', 'buybox_change', 'new_competitor', 'stockout');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE research_job_status AS ENUM ('pending', 'running', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 1. USERS TABLE (synced with Supabase Auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  supabase_uid VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(320),
  name VARCHAR(255),
  avatar TEXT,
  role user_role DEFAULT 'user' NOT NULL,
  experience_level VARCHAR(50),
  budget_range VARCHAR(50),
  preferred_sourcing VARCHAR(50),
  target_margin INTEGER,
  local_area VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================================
-- 2. PRODUCTS / RESEARCH RESULTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  asin VARCHAR(20) NOT NULL,
  title TEXT,
  price DECIMAL(10, 2),
  price_range VARCHAR(100),
  rating DECIMAL(3, 1),
  review_count INTEGER,
  amazon_choice BOOLEAN DEFAULT FALSE,
  amazon_choice_reason TEXT,
  bsr INTEGER,
  bsr_category VARCHAR(255),
  image_url TEXT,
  seller_count INTEGER,
  fba_sellers INTEGER,
  fbm_sellers INTEGER,
  variation_count INTEGER,
  qa_count INTEGER,
  has_aplus_content BOOLEAN DEFAULT FALSE,
  has_video BOOLEAN DEFAULT FALSE,
  launch_date TIMESTAMP,
  review_velocity DECIMAL(10, 2),
  sales_estimate INTEGER,
  marketplace VARCHAR(10) DEFAULT 'US',
  status product_status DEFAULT 'researching',
  tags JSONB DEFAULT '[]',
  notes TEXT,
  folder_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================================
-- 3. PRODUCT SCORES (13-Point Validation)
-- ============================================================
CREATE TABLE IF NOT EXISTS product_scores (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) NOT NULL,
  user_id INTEGER REFERENCES users(id),
  price_score INTEGER,
  size_weight_score INTEGER,
  market_size_score INTEGER,
  review_barrier_score INTEGER,
  differentiation_score INTEGER,
  seasonality_score INTEGER,
  complexity_score INTEGER,
  return_rate_score INTEGER,
  brand_dominance_score INTEGER,
  trend_score INTEGER,
  defensibility_score INTEGER,
  manufacturability_score INTEGER,
  margin_score INTEGER,
  total_score INTEGER,
  grade VARCHAR(1),
  recommendation VARCHAR(50),
  analysis_data JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================================
-- 4. AI RESEARCH REPORTS (Bangla)
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) NOT NULL,
  user_id INTEGER REFERENCES users(id),
  title TEXT,
  content TEXT,
  summary TEXT,
  market_analysis TEXT,
  competition_analysis TEXT,
  profit_analysis TEXT,
  risk_analysis TEXT,
  recommendation TEXT,
  sentiment_data JSONB,
  trends_data JSONB,
  differentiation_ideas JSONB,
  language VARCHAR(10) DEFAULT 'bn',
  is_pdf_exported BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================================
-- 5. FBA COST CALCULATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS fba_calculations (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) NOT NULL,
  selling_price DECIMAL(10, 2),
  product_cost DECIMAL(10, 2),
  shipping_cost DECIMAL(10, 2),
  referral_fee DECIMAL(10, 2),
  fba_fee DECIMAL(10, 2),
  storage_fee DECIMAL(10, 2),
  ppc_cost DECIMAL(10, 2),
  returns_cost DECIMAL(10, 2),
  net_profit DECIMAL(10, 2),
  margin_percent DECIMAL(5, 2),
  break_even_acos DECIMAL(5, 2),
  category VARCHAR(100),
  product_size VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================================
-- 6. ALERTS / MONITORING
-- ============================================================
CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) NOT NULL,
  user_id INTEGER REFERENCES users(id),
  alert_type alert_type NOT NULL,
  old_value TEXT,
  new_value TEXT,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================================
-- 7. LAUNCH STRATEGIES
-- ============================================================
CREATE TABLE IF NOT EXISTS launch_strategies (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) NOT NULL,
  user_id INTEGER REFERENCES users(id),
  title TEXT,
  content TEXT,
  listing_title TEXT,
  bullet_points JSONB,
  keywords JSONB,
  pricing_strategy JSONB,
  ppc_campaign JSONB,
  review_strategy JSONB,
  inventory_plan JSONB,
  timeline JSONB,
  marketing_channels JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================================
-- 8. ACTIVITY LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================================
-- 9. FOLDERS FOR PRODUCT ORGANIZATION
-- ============================================================
CREATE TABLE IF NOT EXISTS folders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================================
-- 10. ADMIN CREDENTIALS (separate from OAuth users)
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_credentials (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================================
-- 11. CRON JOB STATE TRACKING
-- ============================================================
CREATE TABLE IF NOT EXISTS cron_state (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) NOT NULL UNIQUE,
  value TEXT,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================================
-- 12. RESEARCH JOBS QUEUE (async AI processing)
-- ============================================================
CREATE TABLE IF NOT EXISTS research_jobs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  input TEXT NOT NULL,
  input_type VARCHAR(20) NOT NULL,
  marketplace VARCHAR(10) DEFAULT 'US',
  status research_job_status DEFAULT 'pending' NOT NULL,
  result TEXT,
  scores JSONB,
  error TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Safe schema updates to handle existing tables
ALTER TABLE products ADD COLUMN IF NOT EXISTS status product_status DEFAULT 'researching';
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';
ALTER TABLE products ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS folder_id INTEGER;

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_asin ON products(asin);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at);
CREATE INDEX IF NOT EXISTS idx_research_jobs_user_id ON research_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_research_jobs_status ON research_jobs(status);
CREATE INDEX IF NOT EXISTS idx_research_jobs_user_status ON research_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_research_jobs_status_created ON research_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_reports_product_id ON reports(product_id);
CREATE INDEX IF NOT EXISTS idx_scores_product_id ON product_scores(product_id);
CREATE INDEX IF NOT EXISTS idx_fba_product_id ON fba_calculations(product_id);
CREATE INDEX IF NOT EXISTS idx_launch_product_id ON launch_strategies(product_id);

-- ============================================================
-- INSERT DEFAULT ADMIN USER
-- Username: admin | Password: admin123
-- ============================================================

-- Insert admin into users table first (needed for FK constraints)
INSERT INTO users (supabase_uid, email, name, role)
VALUES ('admin:1', 'admin', 'admin', 'admin')
ON CONFLICT (supabase_uid) DO NOTHING;

-- Insert admin credentials
INSERT INTO admin_credentials (username, password_hash, name, is_active)
VALUES (
  'admin',
  '$2b$10$oxDDHoXWjhbtJgWLtVOveOV59h75WSEdj7pmjTc7feKzbs1/fhV2a',
  'System Administrator',
  TRUE
)
ON CONFLICT (username) DO NOTHING;
