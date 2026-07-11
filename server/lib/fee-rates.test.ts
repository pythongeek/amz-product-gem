import { vi, describe, it, expect } from "vitest";

// Define the mock rates data
const mockRatesData = [
  // US Referral fees (Standard vs Newer Version)
  {
    id: 1,
    marketplace: "US",
    feeType: "referral",
    category: "electronics",
    sizeTier: null,
    weightMinOz: null,
    weightMaxOz: null,
    priceMin: null,
    priceMax: null,
    rateType: "percent",
    rateValue: "0.08",
    effectiveDate: "2025-01-15",
  },
  {
    id: 2,
    marketplace: "US",
    feeType: "referral",
    category: "electronics",
    sizeTier: null,
    weightMinOz: null,
    weightMaxOz: null,
    priceMin: null,
    priceMax: null,
    rateType: "percent",
    rateValue: "0.09", // Updated rate in 2026
    effectiveDate: "2026-01-15",
  },
  // Future referral rate (should be excluded)
  {
    id: 3,
    marketplace: "US",
    feeType: "referral",
    category: "electronics",
    sizeTier: null,
    weightMinOz: null,
    weightMaxOz: null,
    priceMin: null,
    priceMax: null,
    rateType: "percent",
    rateValue: "0.10",
    effectiveDate: "2030-01-15",
  },
  // US Referral default
  {
    id: 4,
    marketplace: "US",
    feeType: "referral",
    category: "most_categories",
    sizeTier: null,
    weightMinOz: null,
    weightMaxOz: null,
    priceMin: null,
    priceMax: null,
    rateType: "percent",
    rateValue: "0.15",
    effectiveDate: "2026-01-15",
  },
  // US Fulfillment Standard tiers
  {
    id: 5,
    marketplace: "US",
    feeType: "fulfillment",
    category: null,
    sizeTier: "small_standard",
    weightMinOz: "0.00",
    weightMaxOz: "12.00",
    priceMin: null,
    priceMax: null,
    rateType: "flat",
    rateValue: "3.22",
    effectiveDate: "2026-01-15",
  },
  {
    id: 6,
    marketplace: "US",
    feeType: "fulfillment",
    category: null,
    sizeTier: "small_standard",
    weightMinOz: "12.00",
    weightMaxOz: "16.00",
    priceMin: null,
    priceMax: null,
    rateType: "flat",
    rateValue: "3.40",
    effectiveDate: "2026-01-15",
  },
];

// Mock the database connection to return our mock rates data
vi.mock("../queries/connection", () => {
  return {
    getDb: vi.fn(() => ({
      select: () => ({
        from: () => Promise.resolve(mockRatesData),
      }),
    })),
  };
});

// Import the actual lookup functions after mocking connection
import { getFeeRates, matchFeeRate } from "../queries/knowledge-base";

describe("Fee Lookup & Versioning Logic", () => {
  it("deduplicates co-existing versioned rates, selecting the latest active rate", async () => {
    // Both 2025 and 2026 rates exist, 2026-01-15 is active, 2030-01-15 is future
    const rates = await getFeeRates("US", "referral");
    
    // Find active rate for electronics
    const electronicsRate = rates.find(r => r.category === "electronics");
    expect(electronicsRate).toBeDefined();
    expect(electronicsRate?.rateValue).toBe("0.09"); // 2026 rate
  });

  it("filters out rates with future effective dates", async () => {
    const rates = await getFeeRates("US", "referral");
    const futureRate = rates.find(r => r.rateValue === "0.10");
    expect(futureRate).toBeUndefined();
  });

  it("correctly matches fulfillment fees based on weight limits", async () => {
    // 8oz standard fits into small_standard <= 12oz group
    const fee1 = await matchFeeRate("US", "fulfillment", null, 8, null, "small_standard");
    expect(fee1).toBeDefined();
    expect(fee1?.rateValue).toBe("3.22");

    // 14oz fits into 12-16oz group
    const fee2 = await matchFeeRate("US", "fulfillment", null, 14, null, "small_standard");
    expect(fee2).toBeDefined();
    expect(fee2?.rateValue).toBe("3.40");
  });

  it("falls back to most_categories if no category match is found", async () => {
    const matched = await matchFeeRate("US", "referral", "toys_games", null, 25);
    expect(matched).toBeDefined();
    expect(matched?.category).toBe("most_categories");
    expect(matched?.rateValue).toBe("0.15");
  });
});
