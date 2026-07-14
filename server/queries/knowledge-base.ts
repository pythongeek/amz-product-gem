import { getDb } from "./connection";
import { kbFeeRates, kbScoringRubric, kbPlaybook, kbRestrictedCategories } from "@db/schema";
import { eq } from "drizzle-orm";
import type { KbFeeRate, KbScoringRubric, KbPlaybook, KbRestrictedCategory } from "@db/schema";

// Simple in-process cache with TTL (15 minutes)
const CACHE_TTL = 15 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

let feeRatesCache: CacheEntry<KbFeeRate[]> | null = null;
let scoringRubricCache: CacheEntry<KbScoringRubric[]> | null = null;
let playbookCache: Map<string, CacheEntry<KbPlaybook[]>> = new Map();
let restrictedCategoriesCache: CacheEntry<KbRestrictedCategory[]> | null = null;

async function getCached<T>(
  cacheGetter: () => Promise<T>,
  cacheRef: { value: CacheEntry<T> | null }
): Promise<T> {
  const now = Date.now();
  if (cacheRef.value && cacheRef.value.expiry > now) {
    return cacheRef.value.data;
  }
  const data = await cacheGetter();
  cacheRef.value = {
    data,
    expiry: Date.now() + CACHE_TTL,
  };
  return data;
}

export async function getAllFeeRates(): Promise<KbFeeRate[]> {
  const cacheWrapper = {
    get value() { return feeRatesCache; },
    set value(v) { feeRatesCache = v; }
  };
  return getCached(async () => {
    const db = getDb();
    return db.select().from(kbFeeRates);
  }, cacheWrapper);
}

// Clear cache helper (called on admin updates)
export function clearKbCache() {
  feeRatesCache = null;
  scoringRubricCache = null;
  playbookCache.clear();
  restrictedCategoriesCache = null;
}

export async function getFeeRates(
  marketplace: string,
  feeType: string
): Promise<KbFeeRate[]> {
  const allRates = await getAllFeeRates();
  const now = new Date();

  // 1. Filter by marketplace, fee type and effective date <= now
  const activeRates = allRates.filter(rate => {
    if (rate.marketplace.toUpperCase() !== marketplace.toUpperCase()) return false;
    if (rate.feeType !== feeType) return false;
    
    const effDate = new Date(rate.effectiveDate);
    if (effDate > now) return false;

    return true;
  });

  // 2. Select only the latest rate version for each unique specification group
  const latestSpecMap = new Map<string, KbFeeRate>();
  for (const rate of activeRates) {
    const key = `${rate.category || ""}-${rate.sizeTier || ""}-${rate.priceMin || ""}-${rate.priceMax || ""}-${rate.weightMinOz || ""}-${rate.weightMaxOz || ""}`;
    const existing = latestSpecMap.get(key);
    if (!existing || new Date(rate.effectiveDate).getTime() > new Date(existing.effectiveDate).getTime()) {
      latestSpecMap.set(key, rate);
    }
  }

  return Array.from(latestSpecMap.values());
}

/**
 * Helper to match a specific fee rate for FBA calculator or AI prompt
 */
export async function matchFeeRate(
  marketplace: string,
  feeType: string,
  category?: string | null,
  weightOz?: number | null,
  price?: number | null,
  sizeTier?: string | null
): Promise<KbFeeRate | null> {
  const rates = await getFeeRates(marketplace, feeType);
  if (rates.length === 0) return null;

  const sortedRates = [...rates].sort((a, b) => 
    new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
  );

  const matching = sortedRates.filter(rate => {
    if (category && rate.category && rate.category.toLowerCase() !== category.toLowerCase()) {
      return false;
    }
    
    if (sizeTier && rate.sizeTier && rate.sizeTier !== sizeTier) {
      return false;
    }

    if (weightOz !== undefined && weightOz !== null) {
      if (rate.weightMinOz !== null && Number(rate.weightMinOz) > weightOz) return false;
      if (rate.weightMaxOz !== null && Number(rate.weightMaxOz) < weightOz) return false;
    }

    if (price !== undefined && price !== null) {
      if (rate.priceMin !== null && Number(rate.priceMin) > price) return false;
      if (rate.priceMax !== null && Number(rate.priceMax) < price) return false;
    }

    return true;
  });

  if (matching.length === 0) {
    return sortedRates.find(r => !r.category || r.category === 'most_categories') || sortedRates[0] || null;
  }

  return matching[0];
}

export async function getScoringRubric(): Promise<KbScoringRubric[]> {
  const cacheWrapper = {
    get value() { return scoringRubricCache; },
    set value(v) { scoringRubricCache = v; }
  };
  return getCached(async () => {
    const db = getDb();
    return db.select().from(kbScoringRubric).orderBy(kbScoringRubric.displayOrder);
  }, cacheWrapper);
}

export async function getPlaybookChunks(category: string, limit = 3): Promise<KbPlaybook[]> {
  const now = Date.now();
  const cachedCategory = playbookCache.get(category);
  if (cachedCategory && cachedCategory.expiry > now) {
    return cachedCategory.data.slice(0, limit);
  }

  const db = getDb();
  const chunks = await db
    .select()
    .from(kbPlaybook)
    .where(eq(kbPlaybook.category, category))
    .limit(limit);

  playbookCache.set(category, {
    data: chunks,
    expiry: Date.now() + CACHE_TTL,
  });

  return chunks;
}

export async function isRestrictedCategory(name: string, marketplace = "US"): Promise<boolean> {
  const cacheWrapper = {
    get value() { return restrictedCategoriesCache; },
    set value(v) { restrictedCategoriesCache = v; }
  };
  const restricted = await getCached(async () => {
    const db = getDb();
    return db.select().from(kbRestrictedCategories);
  }, cacheWrapper);

  return restricted.some(r => 
    r.category.toLowerCase() === name.toLowerCase() && 
    (r.marketplace ?? "US").toUpperCase() === marketplace.toUpperCase()
  );
}

export async function getRestrictedCategoryDetails(name: string, marketplace = "US"): Promise<KbRestrictedCategory | null> {
  const cacheWrapper = {
    get value() { return restrictedCategoriesCache; },
    set value(v) { restrictedCategoriesCache = v; }
  };
  const restricted = await getCached(async () => {
    const db = getDb();
    return db.select().from(kbRestrictedCategories);
  }, cacheWrapper);

  return restricted.find(r => 
    r.category.toLowerCase() === name.toLowerCase() && 
    (r.marketplace ?? "US").toUpperCase() === marketplace.toUpperCase()
  ) || null;
}
