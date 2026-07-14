# FBA AI Research Platform — Production Readiness Plan

**Scope:** Turn the existing "AMZ Product Gem" repo (Vite + React 19 + tRPC + Hono + Drizzle/Postgres on Supabase + Vercel) into a production-grade Amazon FBA research tool for beginner-to-pro sellers, grounded in the three attached playbooks and a persistent, queryable knowledge base instead of hardcoded/half-random logic.

---

## 0. What's already there (repo assessment)

**Working foundations**
- Auth: Supabase OAuth (GitHub/Google) + a separate admin JWT flow (`server/kimi/auth.ts`, `server/lib/admin-auth.ts`, `server/context.ts`).
- Data model: `db/schema.ts` already has `products`, `productScores` (13-point), `reports`, `fbaCalculations`, `alerts`, `launchStrategies`, `researchJobs` — this maps cleanly onto the playbooks' methodology.
- Async pipeline: `researchJobs` queue + `server/cron-router.ts`, polled by cron-job.org (bypasses Vercel's 10s function limit) — good architecture for AI calls that take >10s.
- AI integration: `server/lib/ai.ts` calls MiniMax (Anthropic-compatible `/v1/messages`) with a Bangla system prompt.
- Full shadcn/ui component library already installed (40+ components) — no UI-kit work needed.
- tRPC end-to-end typing between `server/router.ts` and `src/providers/trpc.tsx`.

**Critical gaps found (in priority order)**

1. **No real product data source.** `server/analysis-router.ts::generateMockProductData` and `server/cron-router.ts`'s score generation both use `Math.random()`. The "13-point score" and "grade" the user sees are *not derived from the playbooks' formulas at all* — they're random numbers dressed up in a nice UI. This is the single biggest gap between "looks like a research tool" and "is a research tool."
2. **Fee data is hardcoded and drifting.** `server/fba-router.ts` has `REFERRAL_FEES`, `FBA_FEES_2026`, `STORAGE_FEES_2026` as static TS objects. They partially match the playbooks, partially don't (e.g. missing UK/EU, missing fuel surcharge, missing inbound placement/aged inventory/SIPP fees the playbooks call out). Every fee update requires a code deploy.
3. **Secrets committed to the repo.** `scripts/trigger-research.sh` and `CRON_SETUP.md` contain a literal cron-job.org API key (`WJnmdRwO6iHDH7NIlyYadsQzniVxFctEDLKVZEtExoE=`). `supabase-schema.sql` ships a *known* bcrypt hash for `admin/admin123`. Both must be rotated/removed before anything resembling "production."
4. **`alert-router.ts::checkChanges`** generates alerts from `Math.random() > 0.7` — not real price/BSR delta detection, because there's no stored historical snapshot to diff against.
5. **No SP-API / scraping-free real-time product lookup.** The playbooks are explicit that scraping violates ToS; the legitimate free paths are the Product Advertising API (Associates account) or manual/Keepa-assisted entry. The app currently has *no* ingestion path at all — `Research.tsx` just sends a title/URL string into an LLM prompt.
6. **`db/schema.ts.backup`, `env.ts` duplication, `contracts/types.ts` re-exporting the whole schema** — minor cleanup debt, not blocking.
7. **Two duplicate `/api/debug/create-test-job` routes** in `server/boot.ts` and unauthenticated debug endpoints exposed under `/api/debug/*` in production — must be gated behind admin auth or removed before launch.
8. **i18n:** UI is Bangla-only, hardcoded per-page. Fine as a market choice, but no language toggle exists despite `Settings.tsx` implying broader ambitions.

This plan fixes these in dependency order — the knowledge base (Part 1) has to exist before the scoring/fee engines (Part 2–3) can consume it.

---

## Part 1 — Knowledge base in Supabase (do this first)

**Why:** every playbook fact currently either lives nowhere (scoring logic) or lives twice — once in a markdown file you read, once (partially, staling) in TypeScript. One source of truth fixes both.

### 1.1 Run the migration
`supabase-knowledge-base.sql` (delivered alongside this plan) creates and seeds:

| Table | Purpose |
|---|---|
| `kb_fee_rates` | Every referral/fulfillment/storage/surcharge fee from the 3 docs, versioned by `effective_date`, queryable by marketplace + category + weight/price band |
| `kb_scoring_rubric` | The 13 scoring criteria as machine-readable JSON bands (`scoring_logic`) instead of the `Math.floor(Math.random()*5)+5` placeholders |
| `kb_playbook` | Chunked methodology text (niche discovery, validation, sourcing, pricing, shipping, inventory, compliance) tagged for retrieval |
| `kb_restricted_categories` | The gated-category table (Beauty, Supplements, Electronics w/ battery, etc.) |
| `kb_revisions` | Audit trail so you know when fee data was last refreshed |

Run it via Supabase SQL Editor, same way `supabase-schema.sql` and `supabase-migration-admin-fk.sql` were run. It's idempotent (`CREATE TABLE IF NOT EXISTS`) except the `INSERT`s — wrap in a `DO $$ ... ON CONFLICT DO NOTHING $$` or just run once and rely on `kb_revisions` to track it (recommended: add a unique constraint per table before re-running in CI).

### 1.2 Add Drizzle schema mirrors
Add to `db/schema.ts`:
```ts
export const kbFeeRates = pgTable("kb_fee_rates", { /* mirror columns */ });
export const kbScoringRubric = pgTable("kb_scoring_rubric", { /* ... */ });
export const kbPlaybook = pgTable("kb_playbook", { /* ... */ });
export const kbRestrictedCategories = pgTable("kb_restricted_categories", { /* ... */ });
```
Run `npm run db:generate` to reconcile — since the SQL migration already created the tables by hand, use `drizzle-kit introspect` or simply hand-write the schema to match (the columns are listed in the SQL file's `CREATE TABLE` statements).

### 1.3 Build a `server/queries/knowledge-base.ts` accessor layer
```ts
export async function getFeeRates(marketplace: string, feeType: string) { ... }
export async function getScoringRubric() { ... }
export async function getPlaybookChunks(category: string, limit = 3) { ... }
export async function isRestrictedCategory(name: string) { ... }
```
Cache in-process (these change rarely) with a 15-minute TTL — avoid hitting Postgres on every request.

### 1.4 Admin UI to edit the KB (no-code fee updates)
Add an `/admin/knowledge-base` page (reuse the existing admin JWT auth) with a simple table editor for `kb_fee_rates` — this is what makes fee updates a form submission instead of a deploy. Minimum viable version: a tRPC `admin.kb.*` router (list/update/insert) + a shadcn `Table` + `Dialog` form. This directly answers the "so the system can use it easily" part of the request.

---

## Part 2 — Wire the AI pipeline to the knowledge base (RAG-lite)

**File:** `server/lib/ai.ts`

Replace the static `BANGLA_SYSTEM_PROMPT` string with a **prompt builder** that pulls current facts before every call:

```ts
export async function buildGroundedSystemPrompt(marketplace: string) {
  const fees = await getFeeRates(marketplace, "referral");
  const fulfillment = await getFeeRates(marketplace, "fulfillment");
  const playbook = await getPlaybookChunks("profitability", 2);
  return `${BANGLA_SYSTEM_PROMPT}

  ## গ্রাউন্ডেড ডেটা (${marketplace}, as of ${today}):
  রেফারেল ফি: ${JSON.stringify(fees)}
  ফুলফিলমেন্ট ফি: ${JSON.stringify(fulfillment)}
  প্রফিটেবিলিটি ফর্মুলা: ${playbook.map(p=>p.content).join("\n")}

  নিয়ম: উপরের ডেটা ছাড়া অন্য কোনো ফি সংখ্যা অনুমান করবেন না। যদি তথ্য না থাকে, "নিশ্চিত না" লিখুন।`;
}
```
Call this in `server/cron-router.ts` and `server/analysis-router.ts` instead of the static constant. This is the single highest-leverage change: it stops the LLM from hallucinating fee numbers and forces it to cite the same figures the calculator uses, so the AI report and the FBA Calculator never disagree.

---

## Part 3 — Replace random scoring with real rubric-driven scoring

**File:** `server/cron-router.ts` (the `scores` object with `Math.floor(Math.random()...)`) and `server/analysis-router.ts::validateProduct`.

1. Require real inputs before scoring: price, weight, category, BSR, review count, seller count, has_battery/electronic/fragile flags. Today `Research.tsx` only collects a title/URL/keyword — extend the intake form (see Part 5) to collect these, or (Part 4) fetch them.
2. Write `server/lib/scoring.ts`:
   ```ts
   export async function scoreProduct(input: ProductInput) {
     const rubric = await getScoringRubric();
     // apply each criterion's scoring_logic bands against the input
     // return { scores, totalScore, grade, recommendation }
   }
   ```
3. Grade thresholds already exist in `cron-router.ts` (`>=100 A`, `>=70 B`, else `C`) — keep them, just feed them real totals.
4. `analysis-router.ts::validateProduct` already has real formula stubs (`calculatePriceScore`, `calculateMarketSizeScore`, etc.) — good instinct, just needs to (a) pull thresholds from `kb_scoring_rubric` instead of inline magic numbers, and (b) actually get called from the main research flow instead of sitting unused as a "legacy" endpoint.

---

## Part 4 — Real product data ingestion (the actual research part)

This is the part the playbooks spend the most words on, and the part the app is currently missing entirely. Ship it in three tiers so beginners aren't blocked while pro users get automation:

**Tier 1 — Manual entry (ship first, zero legal/API risk)**
Extend `Research.tsx`'s form: price, weight, BSR, review count, rating, seller count, category, battery/electronic/fragile checkboxes. This alone makes Part 3's real scoring possible immediately. Add a "Paste from Keepa" helper text pointing users at the free Keepa extension per the playbooks' guidance (`kb_playbook` category `validation`).

**Tier 2 — Amazon Product Advertising API (free, ToS-compliant, requires an Associates account)**
Add `server/lib/amazon-paapi.ts` using the official PA-API v5 (needs `AWS_ACCESS_KEY`, `AWS_SECRET_KEY`, `ASSOCIATE_TAG` env vars — add to `env.ts`/`.env.example`). Given an ASIN, auto-fill price/title/image/rating/review count. This directly satisfies the playbooks' "compliance" note (`kb_playbook` row tagged `scraping,legal`) — it's the *only* automated ingestion path they endorse.

**Tier 3 — BYO data / CSV import for pros**
Let power users bulk-import a CSV (ASIN, price, BSR, reviews...) they've compiled themselves via Keepa/Helium10/manual research — a `product.bulkImport` tRPC mutation, reusing the existing `xlsx`/CSV skill patterns already in this environment. This serves the "pro" end of "beginner to pro" without the app needing a paid data subscription itself.

**Do not** add HTML scraping of amazon.com — it's explicitly flagged as a ToS violation in the sourced playbooks and would jeopardize the whole product.

---

## Part 5 — FBA Calculator: fee-table-driven, not hardcoded

**File:** `server/fba-router.ts`

Replace `REFERRAL_FEES`, `FBA_FEES_2026`, `STORAGE_FEES_2026` constants with calls to `getFeeRates()`:
```ts
const referralRate = await getFeeRates(marketplace, "referral", category);
const fulfillmentFee = await getFeeRates(marketplace, "fulfillment", null, weightOz);
```
Add the fee lines the playbooks call out that the current calculator is missing: inbound placement fee, fuel surcharge (3.5%, from 2026-04-17), aged-inventory surcharge, low-price FBA discount for sub-$10 items, SIPP packaging penalty for bulky non-enrolled items. Surface each as its own line in the `Calculator.tsx` breakdown UI (the UI already has a clean per-line breakdown pattern — just add rows).

Add a **stress test** button per the playbooks' "Margin Stress Test": recompute margin under +10% FBA fees, +15% supplier cost, a 20%-off promo, and 25% ACoS simultaneously — flag red/yellow/green.

---

## Part 6 — Alerts: real deltas, not `Math.random()`

**File:** `server/alert-router.ts`

1. Add a `product_snapshots` table (price, bsr, reviewCount, capturedAt) — one row per product per cron run.
2. `checkChanges` compares the latest snapshot to the previous one; if `|Δprice| > 2%` → `price_drop` alert, if `|ΔBSR| > 20%` → `bsr_change`, if `ΔreviewCount > 0` → `new_review`. This only becomes possible once Part 4 gives the app a real, refreshable data source per product (Tier 2 PA-API refresh on a schedule, or a "refresh now" button hitting Tier 1/2 manually).
3. Keep the existing cursor-based batching logic in `checkChanges` — it's solid, just swap the mock-change generator for the real diff.

---

## Part 7 — Security & config hardening (do before any public launch)

1. **Rotate and remove the cron-job.org API key** from `CRON_SETUP.md` and `scripts/trigger-research.sh`; move it to Vercel env vars only (`CRON_JOBS_ORG_API_KEY` already exists in `server/lib/env.ts` — good, just stop also hardcoding it in tracked files).
2. **Force-reset the default admin password** on first production deploy — `supabase-schema.sql` ships a known `admin/admin123` hash; `admin-router.ts::ensureDefaultAdmin` already supports resetting it, so call it once with a *new* secret password and never re-run with the shipped default.
3. **Gate or remove `/api/debug/*` routes** in `server/boot.ts` — wrap them in `if (!env.isProduction)` or require the admin JWT.
4. **Rotate `JWT_SECRET`** away from the fallback literal `"fba-research-secret-key-change-in-production"` in `env.ts` — add a startup assertion that throws if `NODE_ENV==='production'` and this fallback is still in use.
5. **`src/lib/admin-auth.ts`** stores the admin token in `localStorage` — acceptable for an internal admin panel but document the XSS exposure; consider migrating to an httpOnly cookie like the Supabase session already does (`getSessionCookieOptions` pattern in `server/lib/cookies.ts` is right there to reuse).
6. Add `CRON_SECRET`, `MINIMAX_API_KEY`, `AWS_ACCESS_KEY`/`AWS_SECRET_KEY` (PA-API) to `.env.example` with placeholder values only — already mostly done, just add the PA-API ones from Part 4.

---

## Part 8 — Beginner → Pro UX layering

The playbooks are explicit that beginners and pros need different depths of the same data. Map that onto existing UI:

- **Beginner mode (default):** `Research.tsx`'s existing quick-templates ("বিগিনার ফ্রেন্ডলি", etc.) stay as the default entry; `ResearchResults.tsx`'s verdict hero + score breakdown is already the right shape — just needs Part 3's real numbers behind it. Add inline tooltips quoting the relevant `kb_playbook` chunk next to each of the 13 scores (e.g. hovering "রিভিউ ব্যারিয়ার" shows the playbook's exact threshold text) — this turns the score card into a teaching tool, matching the "beginner to pro" goal.
- **Pro mode:** expose the Tier 3 CSV bulk import, the fee-table admin editor (read-only for non-admins, but a "view current fee assumptions" panel so pros can audit the calculator), and the Margin Stress Test from Part 5.
- Add a `Settings.tsx` toggle (`experienceLevel` field already exists on `users` table!) that hides advanced panels for `beginner` and shows them for `advanced` — zero new schema needed, just conditional rendering keyed off `user.experienceLevel`.

---

## Part 9 — Testing & monitoring

1. Unit tests for `server/lib/scoring.ts` and the fee-lookup functions (Vitest is already configured, `npm run test`, tests currently live under `server/**/*.test.ts` — add `server/lib/scoring.test.ts`, `server/lib/fee-rates.test.ts`).
2. Add a `kb_revisions`-aware health check: `/api/debug/kb-status` (admin-gated) that reports how stale the fee data is (`now() - max(effective_date)`), so you get a visible warning when the 2026 fee snapshot needs refreshing.
3. Wire Vercel's built-in function logs / or a lightweight Sentry DSN for the `callAIWithFallback` failure path — right now an AI failure just marks the job `failed` with no alerting.

---

## Part 10 — Keeping the knowledge base current

The seeded fee data is a snapshot from the attached playbooks (2026-01-15 / 2026-04-17 effective dates). Amazon updates these at least annually:
1. Quarterly, re-check Seller Central's Fee Preview report and the public "About Amazon" fee-update posts; insert new rows into `kb_fee_rates` with a fresh `effective_date` rather than overwriting old rows (keeps history for `kb_revisions` audit).
2. The admin KB editor from Part 1.4 is the intended update mechanism — no code deploy needed for a fee change, only for a new fee *type*.
3. Because `kb_fee_rates` is versioned by `effective_date`, `getFeeRates()` should always select `WHERE effective_date <= now() ORDER BY effective_date DESC LIMIT 1` per (marketplace, fee_type, category, size_tier) — implement that as the canonical query so old and new rates can coexist during a transition period.

---

## Suggested execution order (stepwise)

1. Run `supabase-knowledge-base.sql` in Supabase SQL Editor. *(delivered file)*
2. Add Drizzle mirrors + `server/queries/knowledge-base.ts` accessor layer.
3. Security pass: rotate cron-job.org key, reset admin password, gate debug routes, fix `JWT_SECRET` fallback. *(Part 7 — do this regardless of what else ships, it's currently exploitable)*
4. Wire `server/lib/ai.ts` to build grounded prompts from the KB. *(Part 2)*
5. Build `server/lib/scoring.ts`; swap `Math.random()` scoring in `cron-router.ts`/`analysis-router.ts` for real rubric-driven scoring. *(Part 3)*
6. Extend `Research.tsx` intake form for manual product data entry. *(Part 4, Tier 1)*
7. Rebuild `fba-router.ts` off `kb_fee_rates`; add the missing fee lines + stress test to `Calculator.tsx`. *(Part 5)*
8. Add PA-API integration for ASIN auto-fill. *(Part 4, Tier 2)*
9. Add `product_snapshots` + real alert diffing. *(Part 6)*
10. Add CSV bulk import + fee-table admin editor + experience-level UI gating. *(Part 4 Tier 3, Part 1.4, Part 8)*
11. Tests + KB-staleness health check + error alerting. *(Part 9)*
12. Ongoing: quarterly KB refresh cadence. *(Part 10)*

Steps 1–3 are the prerequisite foundation (data + security); steps 4–9 make the product actually do what it claims to do; steps 10–12 are the polish that differentiates beginner vs. pro and keeps it accurate over time.
