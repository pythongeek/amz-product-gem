-- ============================================================
-- FBA KNOWLEDGE BASE — Supabase migration
-- Run in Supabase SQL Editor (after supabase-schema.sql).
--
-- Purpose: move the Amazon fee tables, 13-point scoring rubric,
-- restricted-category list, and research-methodology text out of
-- prompt strings / hardcoded TS objects and into structured rows
-- the server can query. This lets:
--   1. server/lib/ai.ts build a grounded system prompt (RAG-lite)
--      instead of relying on the LLM's memorized (and possibly
--      stale) fee numbers.
--   2. server/fba-router.ts pull live fee rates from the DB
--      instead of the hardcoded REFERRAL_FEES / FBA_FEES_2026
--      objects, so an admin can update fees without a deploy.
--   3. server/cron-router.ts / analysis-router.ts replace the
--      Math.random() placeholder scores with a real rubric-driven
--      calculation.
-- ============================================================

-- ------------------------------------------------------------
-- 1. FEE RATES (structured, queryable, versioned)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kb_fee_rates (
  id SERIAL PRIMARY KEY,
  marketplace VARCHAR(10) NOT NULL,      -- US, UK, DE, FR, IT, ES, CA, JP
  fee_type VARCHAR(50) NOT NULL,         -- referral | fulfillment | storage | inbound_placement
                                          -- aged_inventory | returns_processing | low_inventory
                                          -- removal | disposal | subscription | fuel_surcharge
  category VARCHAR(100),                 -- most_categories, home_kitchen, electronics, toys,
                                          -- pet_supplies, clothing, jewelry, grocery, beauty ...
  size_tier VARCHAR(50),                 -- small_standard | large_standard | oversize | n/a
  weight_min_oz DECIMAL(10,2),
  weight_max_oz DECIMAL(10,2),
  price_min DECIMAL(10,2),
  price_max DECIMAL(10,2),
  rate_type VARCHAR(10) NOT NULL,        -- 'percent' | 'flat'
  rate_value DECIMAL(10,4) NOT NULL,     -- 0.15 for 15%, or 3.65 for $3.65
  currency VARCHAR(5) DEFAULT 'USD',
  notes TEXT,
  effective_date DATE NOT NULL,
  source VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_kb_fee_marketplace ON kb_fee_rates(marketplace, fee_type);

-- ------------------------------------------------------------
-- 2. 13-POINT SCORING RUBRIC (machine-readable bands)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kb_scoring_rubric (
  id SERIAL PRIMARY KEY,
  criterion_key VARCHAR(50) NOT NULL UNIQUE,   -- priceScore, sizeWeightScore, marketSizeScore ...
  criterion_label_bn TEXT,
  criterion_label_en TEXT,
  weight INTEGER DEFAULT 10,                   -- max points, all currently /10 => total /130
  scoring_logic JSONB NOT NULL,                -- ordered bands: [{max:X,min:Y,score:Z,note:"..."}]
  display_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 3. PLAYBOOK / METHODOLOGY TEXT (chunked, tagged, retrievable)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kb_playbook (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50) NOT NULL,   -- niche_discovery | validation | competition | sourcing
                                    -- pricing | shipping | inventory | compliance | profitability
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  marketplace VARCHAR(10) DEFAULT 'ALL',
  tags JSONB DEFAULT '[]',
  source_doc VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_kb_playbook_category ON kb_playbook(category);

-- ------------------------------------------------------------
-- 4. RESTRICTED / GATED CATEGORIES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kb_restricted_categories (
  id SERIAL PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  gate_type VARCHAR(50),           -- category_gate | product_gate | subcategory_restriction
  requirements TEXT,
  approval_timeline VARCHAR(50),
  marketplace VARCHAR(10) DEFAULT 'US',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 5. KB VERSION / CHANGE LOG (so the AI can cite "as of" dates
--    and admins can see what changed between fee updates)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kb_revisions (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(255) NOT NULL,
  summary TEXT NOT NULL,
  revised_by VARCHAR(100) DEFAULT 'seed',
  created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE kb_revisions ALTER COLUMN table_name TYPE VARCHAR(255);

-- ============================================================
-- SEED DATA — extracted from the three attached playbooks
-- (Amazon-FBA-Product-Research-Playbook.md,
--  amazon_fba_complete_guide.md,
--  Zero-Cost Amazon FBA Product Research & Sourcing Blueprint)
-- All figures reflect the "2026" numbers described in those docs.
-- Treat these as a starting snapshot — Part 7 of the plan
-- describes how to keep them current.
-- ============================================================

-- ---- US Referral fees by category ----
INSERT INTO kb_fee_rates (marketplace, fee_type, category, size_tier, rate_type, rate_value, notes, effective_date, source) VALUES
('US','referral','most_categories', NULL, 'percent', 0.15, 'Default referral fee for Home & Kitchen, Sports, Toys, etc.', '2026-01-15', 'amazon_fba_complete_guide.md'),
('US','referral','electronics', NULL, 'percent', 0.08, NULL, '2026-01-15', 'amazon_fba_complete_guide.md'),
('US','referral','jewelry', NULL, 'percent', 0.20, NULL, '2026-01-15', 'Zero-Cost Blueprint'),
('US','referral','device_accessories', NULL, 'percent', 0.45, 'High-end of the 6-45% published range', '2026-01-15', 'rocketsource.io via guide'),
('US','referral','clothing', NULL, 'percent', 0.15, NULL, '2026-01-15', 'amazon_fba_complete_guide.md'),
('US','referral','pet_supplies', NULL, 'percent', 0.15, NULL, '2026-01-15', 'amazon_fba_complete_guide.md');

-- ---- UK / EU Referral fee reductions (effective 2026-01-05) ----
INSERT INTO kb_fee_rates (marketplace, fee_type, category, size_tier, price_max, rate_type, rate_value, notes, effective_date, source) VALUES
('UK','referral','home_products', NULL, 20.00, 'percent', 0.08, 'Reduced from 15% to 8% for items <= £20', '2026-01-05', 'aboutamazon.eu'),
('EU','referral','home_products', NULL, 20.00, 'percent', 0.08, 'Reduced from 15% to 8% for items <= €20 (DE/FR/IT/ES)', '2026-01-05', 'aboutamazon.eu'),
('UK','referral','pet_clothing_food', NULL, 10.00, 'percent', 0.05, 'Reduced from 15% to 5%', '2026-01-05', 'aboutamazon.eu'),
('EU','referral','pet_clothing_food', NULL, 10.00, 'percent', 0.05, 'Reduced from 15% to 5%', '2026-01-05', 'aboutamazon.eu'),
('UK','referral','clothing_accessories', NULL, 15.00, 'percent', 0.05, 'Reduced from 8% to 5% for items <= £15', '2026-01-05', 'aboutamazon.eu'),
('EU','referral','clothing_accessories', NULL, 15.00, 'percent', 0.05, 'Reduced from 8% to 5% for items <= €15', '2026-01-05', 'aboutamazon.eu'),
('UK','referral','toys_games', NULL, NULL, 'percent', 0.15, 'Unchanged', '2026-01-05', 'blue30.co.uk'),
('UK','referral','electronics', NULL, NULL, 'percent', 0.0714, NULL, '2026-01-05', 'blue30.co.uk');

-- ---- US FBA Fulfillment fee — Small Standard tier (per unit, non-peak) ----
INSERT INTO kb_fee_rates (marketplace, fee_type, size_tier, weight_min_oz, weight_max_oz, rate_type, rate_value, notes, effective_date, source) VALUES
('US','fulfillment','small_standard', 0, 2, 'flat', 3.06, NULL, '2026-01-15', 'rocketsource.io via guide'),
('US','fulfillment','small_standard', 2, 4, 'flat', 3.15, NULL, '2026-01-15', 'rocketsource.io via guide'),
('US','fulfillment','small_standard', 4, 6, 'flat', 3.24, NULL, '2026-01-15', 'rocketsource.io via guide'),
('US','fulfillment','small_standard', 6, 8, 'flat', 3.33, NULL, '2026-01-15', 'rocketsource.io via guide'),
('US','fulfillment','small_standard', 8, 10, 'flat', 3.43, NULL, '2026-01-15', 'rocketsource.io via guide'),
('US','fulfillment','small_standard', 10, 12, 'flat', 3.53, NULL, '2026-01-15', 'rocketsource.io via guide'),
('US','fulfillment','small_standard', 12, 14, 'flat', 3.60, NULL, '2026-01-15', 'rocketsource.io via guide'),
('US','fulfillment','small_standard', 14, 16, 'flat', 3.65, NULL, '2026-01-15', 'rocketsource.io via guide');

-- ---- US FBA Fulfillment fee — Large Standard tier ----
INSERT INTO kb_fee_rates (marketplace, fee_type, size_tier, weight_min_oz, weight_max_oz, rate_type, rate_value, notes, effective_date, source) VALUES
('US','fulfillment','large_standard', 0, 4, 'flat', 3.68, NULL, '2026-01-15', 'rocketsource.io via guide'),
('US','fulfillment','large_standard', 4, 8, 'flat', 3.90, NULL, '2026-01-15', 'rocketsource.io via guide'),
('US','fulfillment','large_standard', 8, 12, 'flat', 4.15, NULL, '2026-01-15', 'rocketsource.io via guide'),
('US','fulfillment','large_standard', 12, 16, 'flat', 4.55, NULL, '2026-01-15', 'rocketsource.io via guide'),
('US','fulfillment','large_standard', 16, 24, 'flat', 5.05, NULL, '2026-01-15', 'rocketsource.io via guide'),
('US','fulfillment','large_standard', 24, 32, 'flat', 5.40, NULL, '2026-01-15', 'rocketsource.io via guide'),
('US','fulfillment','large_standard', 32, 40, 'flat', 5.70, NULL, '2026-01-15', 'rocketsource.io via guide'),
('US','fulfillment','large_standard', 40, 48, 'flat', 6.05, NULL, '2026-01-15', 'rocketsource.io via guide');

-- ---- Other US fee types ----
INSERT INTO kb_fee_rates (marketplace, fee_type, rate_type, rate_value, notes, effective_date, source) VALUES
('US','fuel_surcharge','percent', 0.035, 'Applied on top of the FBA fulfillment fee itself, from 2026-04-17', '2026-04-17', 'Amazon-FBA-Product-Research-Playbook.md'),
('US','subscription','flat', 39.99, 'Professional selling plan, monthly', '2026-01-15', 'sell.amazon.com'),
('US','low_price_fba_discount','flat', 0.86, 'Average per-unit discount for items priced under $10', '2026-01-15', 'Amazon-FBA-Product-Research-Playbook.md'),
('US','inbound_placement','flat', 0.90, 'Mid-point of $0.21-$1.58/unit; $0 if using Amazon-Optimized 5+ location split', '2026-01-15', 'Amazon-FBA-Product-Research-Playbook.md'),
('US','overmax_handling','flat', 21.00, 'Extra-large items >96in longest side or >130in length+girth; range $17-$25/unit', '2026-01-15', 'Amazon-FBA-Product-Research-Playbook.md'),
('US','sipp_packaging_penalty','flat', 2.07, 'Bulky items not enrolled in SIPP (ships-in-product-packaging)', '2026-01-15', 'Amazon-FBA-Product-Research-Playbook.md'),
('US','inbound_defect_fee','flat', 0.60, 'Per unit, triggered by labeling/barcode errors', '2026-01-15', 'amazon_fba_complete_guide.md');

-- ---- Storage fees (per cubic foot / month) ----
INSERT INTO kb_fee_rates (marketplace, fee_type, category, rate_type, rate_value, notes, effective_date, source) VALUES
('US','storage','jan_sep', 'flat', 0.87, 'Standard size, per cu ft per month', '2026-01-15', 'server/fba-router.ts baseline'),
('US','storage','oct_dec', 'flat', 2.40, 'Peak season, per cu ft per month', '2026-01-15', 'server/fba-router.ts baseline'),
('UK','storage','jan_sep', 'flat', 0.76, 'GBP per cu ft per month, other standard items', '2026-01-15', 'blue30.co.uk'),
('UK','storage','oct_dec', 'flat', 1.37, 'GBP per cu ft per month, Q4', '2026-01-15', 'blue30.co.uk');

-- ---- Aged inventory surcharge thresholds ----
INSERT INTO kb_fee_rates (marketplace, fee_type, notes, rate_type, rate_value, effective_date, source) VALUES
('US','aged_inventory','Threshold moved from 271 to 181 days; new 456+ day tier added', 'flat', 0.50, '2026-01-15', 'Amazon-FBA-Product-Research-Playbook.md');

-- ------------------------------------------------------------
-- 13-point scoring rubric (matches the fields already used in
-- db/schema.ts:productScores and server/analysis-router.ts)
-- ------------------------------------------------------------
INSERT INTO kb_scoring_rubric (criterion_key, criterion_label_bn, criterion_label_en, weight, display_order, scoring_logic) VALUES
('priceScore','প্রাইজ স্কোর','Price Score',10,1,
  '[{"min":20,"max":35,"score":10,"note":"Sweet spot: $20-35"},{"min":15,"max":50,"score":8,"note":"Acceptable range"},{"min":50,"max":80,"score":5,"note":"Higher scrutiny, more returns"},{"min":0,"max":15,"score":3,"note":"Too cheap, fees eat margin"}]'),
('sizeWeightScore','সাইজ/ওজন','Size / Weight Score',10,2,
  '[{"max_lb":1,"score":10,"note":"Small standard, cheapest fulfillment"},{"max_lb":2,"score":8,"note":"Large standard low tier"},{"max_lb":3,"score":6,"note":"Getting fee-heavy"},{"min_lb":3,"score":3,"note":"Oversize risk"}]'),
('marketSizeScore','মার্কেট সাইজ','Market Size (BSR-based)',10,3,
  '[{"bsr_max":5000,"score":9},{"bsr_max":20000,"score":8},{"bsr_max":50000,"score":6},{"bsr_max":999999,"score":4}]'),
('reviewBarrierScore','রিভিউ ব্যারিয়ার','Review Barrier Score',10,4,
  '[{"reviews_max":50,"score":10,"note":"Low barrier to entry"},{"reviews_max":150,"score":8},{"reviews_max":500,"score":5},{"reviews_max":999999,"score":3,"note":"Entrenched competitors"}]'),
('differentiationScore','ডিফারেন্সিয়েশন','Differentiation Score',10,5,
  '[{"note":"Derived from 1-3 star review mining: count concrete, buildable improvements identified (min 2-3 = high score)"}]'),
('seasonalityScore','সিজনালিটি','Seasonality Score',10,6,
  '[{"note":"Year-round demand = 8-10; single 6-week seasonal spike = 3-5 unless intentionally a secondary seasonal SKU"}]'),
('complexityScore','কমপ্লেক্সিটি','Complexity Score',10,7,
  '[{"base":10,"deduct_if_battery":3,"deduct_if_electronic":3,"deduct_if_fragile":2,"floor":2}]'),
('returnRateScore','রিটার্ন রেট','Return Rate Score',10,8,
  '[{"note":"Non-fragile, simple, low-complexity products score high; avoid categories above the returns-processing-fee threshold"}]'),
('brandDominanceScore','ব্র্যান্ড ডোমিনেন্স','Brand Dominance Score',10,9,
  '[{"top10_share_max":0.40,"score":9,"note":"No single brand >40% of top 10"},{"top10_share_min":0.60,"score":3,"note":"1 brand owns 60%+"}]'),
('trendScore','ট্রেন্ড','Trend Score (Google Trends slope, 24mo)',10,10,
  '[{"note":"Flat-to-rising 24-month slope = high score; single-spike shape = low score"}]'),
('defensibilityScore','ডিফেন্সিবিলিটি','Defensibility Score',10,11,
  '[{"note":"Multiple viable competitors (not one runaway winner) with no exclusive-supplier/patent moat = higher score"}]'),
('manufacturabilityScore','ম্যানুফ্যাকচারেবিলিটি','Manufacturability Score',10,12,
  '[{"note":"Simple to tool up, low MOQ risk, multiple willing suppliers on Alibaba/1688 = higher score"}]'),
('marginScore','নেট মার্জিন','Net Margin Score',10,13,
  '[{"margin_min":0.30,"score":9,"note":"Clears 30%+ net margin after full fee stack"},{"margin_min":0.20,"score":7},{"margin_min":0.0,"score":5},{"margin_max":0.0,"score":0,"note":"Unprofitable at any realistic price"}]');

-- ------------------------------------------------------------
-- Restricted / gated categories
-- ------------------------------------------------------------
INSERT INTO kb_restricted_categories (category, gate_type, requirements, approval_timeline, marketplace) VALUES
('Beauty & Personal Care','category_gate','Ingredient lists, safety docs, distributor invoices','1-3 weeks','US'),
('Dietary Supplements','category_gate','ISO/IEC 17025 lab CoA, FDA registration','14-30 days','US'),
('Electronics (batteries/wireless)','product_gate','FCC ID, UL listing, safety certifications','2-4 weeks','US'),
('Grocery & Gourmet Food','category_gate','FDA registration, nutritional labels, 50+ day shelf life','2-4 weeks','US'),
('Health & Personal Care','category_gate','FDA registration, labeling compliance','1-3 weeks','US'),
('Jewelry','category_gate','Material tests, lead results, invoices','1-2 weeks','US'),
('Medical Devices','category_gate','FDA 510(k), quality certifications','45-90 days','US'),
('Textiles (children''s)','subcategory_restriction','Safety/flame tests, CPSC compliance','2-4 weeks','US');

-- ------------------------------------------------------------
-- Playbook methodology chunks (used to ground AI prompts;
-- keep each row focused so it can be selectively retrieved)
-- ------------------------------------------------------------
INSERT INTO kb_playbook (category, title, content, tags, source_doc) VALUES

('niche_discovery','Universal screening criteria (Phase 2 filter)',
'Apply these thresholds before deep-diving a candidate product: Selling price $15-75 (ideal $25-50); weight <1lb ideal, 3lb max; monthly demand 200-5,000+ units (ideal 750-1,500); top-5 review count under 300 (max 1,000); 4-25+ sellers on page 1 with no single brand controlling more than 40% of listings; year-round demand preferred over single 6-week seasonal spikes; simple, non-electronic, non-fragile products preferred; category must be open (not gated); target net margin 20% minimum, 25-35% ideal.',
'["screening","filters","beginner"]','amazon_fba_complete_guide.md'),

('niche_discovery','Free niche discovery methods (ranked by effort)',
'1) Amazon search-bar autocomplete for real high-volume long-tail queries. 2) Amazon Best Sellers / Movers & Shakers / New Releases, drilled 3-5 subcategories deep. 3) "Customers also bought" / "frequently bought together" chains, followed 3-4 levels deep. 4) Google Trends cross-referenced against Amazon search results (2-step validation). 5) Keepa free browser extension for historical BSR/price/offer-count charts on any ASIN. 6) Reddit "recommend a X" threads for unfiltered pain points. 7) TikTok Creative Center trending-hashtag "Commerce" filter — TikTok virality typically leads Amazon saturation by 6-10 weeks. 8) Alibaba/1688 "hot products" sections reveal what factories are already tooled up to produce cheaply.',
'["discovery","free_tools"]','Zero-Cost Amazon FBA Product Research & Sourcing Blueprint'),

('validation','Sales-volume estimation — three free methods, triangulated',
'Method 1 (999 Cart, ~10-15% error): add item to cart, set qty to 999, Amazon reveals true stock; repeat 24h later, delta = daily sales. Only works while stock < ~1,000 units and seller has not set a max-order-quantity block. Method 2 (BSR-to-sales, ~25-40% error): use free calculators (Jungle Scout/Helium10/AMZScout free tiers) or the rough benchmark table (BSR 1-1000 -> 3,000-10,000+ units/mo; 1,000-5,000 -> 1,000-3,000; 5,000-10,000 -> 500-1,000; 10,000-30,000 -> 200-500; 30,000-50,000 -> 100-200; 50,000-100,000 -> 50-100). Always use MAIN category BSR, never subcategory BSR. Method 3 (Review velocity, ~40-60% error): new reviews in 30 days / category review-rate (Electronics 1-2%, consumables 0.5-1%, general 1-3%) = estimated monthly units. Trust an estimate only when 2+ methods agree within ~50%.',
'["sales_estimate","bsr","validation"]','amazon_fba_complete_guide.md'),

('validation','Review authenticity red flags',
'Clustered review dates (50 reviews in one week, then silence); repetitive templated language across reviews; >30% unverified purchases; review-to-sales ratio implying >10-20% of buyers reviewed (normal is 1-3%); reviewer profiles with 20+ five-star reviews in a single week; disconnect between 4.5-star average and critical review text ("works okay but..."). Use reviewmeta.com (free) to see an "adjusted rating" after filtering manipulated reviews.',
'["reviews","fraud_detection"]','amazon_fba_complete_guide.md'),

('validation','Listing-age / product-maturity assessment',
'Estimate a listing''s true age via: (1) "Date First Available" field, (2) Wayback Machine earliest snapshot of the ASIN URL, (3) oldest review date sorted oldest-first, (4) Keepa''s full historical BSR/price chart. Cross-check all four — if "Date First Available" says 2019 but Keepa''s BSR chart only shows activity starting 2025, the listing was likely dormant or hijacked; do not treat its apparent competitive strength as durable. A 3+ year old listing with steadily climbing reviews indicates durable, validated demand. A 3-month old listing already at 200+ reviews is either an exceptional organic winner or review-manipulated.',
'["listing_age","maturity","keepa"]','Amazon-FBA-Product-Research-Playbook.md'),

('competition','Competitive landscape checks',
'Count total relevant listings on page 1 and review-count concentration (a few listings holding 90% of reviews = hard entry without a real differentiation angle). Check whether top listings are Brand Registered with A+ Content (harder to displace, can Report/challenge more easily). Note price spread on page 1 — wide spread = room to position, narrow spread = commodity/thin margin. Read the most recent 50 reviews of the top 3 competitors and categorize every negative review; a recurring complaint shared by many reviewers is a ready-made product-improvement and listing-differentiation angle.',
'["competition","differentiation"]','amazon_fba_complete_guide.md'),

('profitability','Master profitability formula',
'Net Profit / unit = Sale Price - Referral Fee (8-15% of sale price, category-dependent) - FBA Fulfillment Fee (size/weight/price-tier based, + 3.5% fuel surcharge from 2026-04-17) - Landed COGS (unit cost + freight + duty) - Monthly Storage Fee (amortized per unit sold) - Estimated Returns Processing Fee (if above category threshold) - Estimated PPC/ad spend per unit (build in ~10-15% of sale price for launch phase). Target >=25-30% net margin at the planned sale price BEFORE committing to a purchase order; always confirm with Amazon''s free Seller Central Revenue Calculator, since exact fee tables vary by sub-category.',
'["profitability","formula","fba_fees"]','Amazon-FBA-Product-Research-Playbook.md'),

('pricing','Competitive pricing / positioning strategy',
'Segment page-1 competitors into budget (bottom 25% price), mid-market (middle 50%), premium (top 25%) tiers. Value-entrant positioning: price 5-10% under mid-market average when top listings rate below ~4.3 stars (unmet quality gap). Premium-entrant positioning: price above mid-market only with a genuinely differentiated feature bundle, backed by strong photography/A+ content. Match pricing (pricing at mid-market average and winning purely on listing quality/keywords) is the riskiest strategy since it competes on visibility alone. Always confirm the chosen price clears target margin using Amazon''s free Revenue Calculator.',
'["pricing","positioning"]','Amazon-FBA-Product-Research-Playbook.md'),

('sourcing','Alibaba + 1688 dual-platform sourcing workflow',
'Start on Alibaba.com (English, Trade Assurance, export-ready suppliers familiar with FBA prep) and request quotes from 10-15 suppliers including EXW and FOB pricing, MOQ tiers (e.g. 200/500/1,000+), lead time, and FBA-labeling capability. Cross-reference the same product on 1688.com (Chinese domestic pricing, typically 10-30% lower) via Google Translate/image search purely for price-benchmarking leverage — most 1688 suppliers do not handle export or FBA compliance directly. Vet suppliers via: Verified/Gold Supplier badge + 3+ years on platform, Trade Assurance enabled, business-license cross-check, on-site inspection report, references, and response time. Always order paid or free samples before any bulk order. Negotiate on seven dimensions, not just unit price: price tiers, MOQ, payment terms (standard 30/70), lead time, packaging, FBA labeling, and pre-shipment inspection.',
'["sourcing","alibaba","negotiation"]','Amazon-FBA-Product-Research-Playbook.md'),

('shipping','FBA prep compliance requirements (2026)',
'Amazon no longer provides in-house prep/labeling services for US FBA shipments (as of 2026-01-01) — every unit must arrive fully prepped. Seven requirements: (1) FNSKU label 1x2in, 300 DPI, Code 128, matte white stock, on a flat surface with 1/8in quiet zone; (2) poly bag >=1.5mil with suffocation warning if opening >=5in; (3) box max 25in per side, max 50 lbs; (4) all manufacturer barcodes covered; (5) physical contents must exactly match the Seller Central shipping plan; (6) choose the "Amazon-Optimized" 5+ location shipment split to avoid the inbound placement fee; (7) verify labeling before shipment leaves the factory — labeling errors trigger the ~$0.60/unit Inbound Defect Fee.',
'["shipping","fba_prep","compliance"]','amazon_fba_complete_guide.md'),

('inventory','Reorder point and safety stock formula',
'Reorder Point = (Average Daily Sales x Total Lead Time in Days) + Safety Stock, where Safety Stock = Average Daily Sales x (Maximum Lead Time - Average Lead Time). Example: 15 units/day average sales, 60-day average lead time, 75-day worst-case lead time -> Safety Stock = 15 x 15 = 225 units; Reorder Point = (15 x 60) + 225 = 1,125 units. Place the next purchase order the moment FBA inventory drops to the Reorder Point, not at an arbitrary low-stock warning. Monitor IPI score (target >400), Days of Supply (target 30-60), and Sell-Through Rate (target >2.0) weekly in Seller Central.',
'["inventory","reorder_point"]','amazon_fba_complete_guide.md'),

('compliance','Ethical data-collection note',
'Amazon''s Terms of Service restrict automated scraping. The safer free/open-source data paths are: (a) the official free Amazon Product Advertising API (requires an Associates account), (b) manual reading of pages by a human, or (c) the free Keepa browser extension, which operates client-side rather than via server scraping. Always re-check current ToS before building any automated collection pipeline.',
'["compliance","scraping","legal"]','Amazon-FBA-Product-Research-Playbook.md');

-- ------------------------------------------------------------
-- Log this seed as a revision
-- ------------------------------------------------------------
INSERT INTO kb_revisions (table_name, summary, revised_by) VALUES
('kb_fee_rates,kb_scoring_rubric,kb_playbook,kb_restricted_categories',
 'Initial seed from the 3 attached FBA playbook documents (2026 fee snapshot).',
 'initial_migration');

-- ------------------------------------------------------------
-- Helpful read views for the app layer
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW kb_current_us_fulfillment_fees AS
SELECT size_tier, weight_min_oz, weight_max_oz, rate_value AS fee_usd, notes
FROM kb_fee_rates
WHERE marketplace = 'US' AND fee_type = 'fulfillment'
ORDER BY size_tier, weight_min_oz;

CREATE OR REPLACE VIEW kb_current_referral_fees AS
SELECT marketplace, category, price_max, rate_value AS rate, notes
FROM kb_fee_rates
WHERE fee_type = 'referral'
ORDER BY marketplace, category;
