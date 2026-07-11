import { vi, describe, it, expect } from "vitest";
import { scoreProduct, extractSpecsFromReport } from "./scoring";

// Mock the database queries to make it a true unit test
vi.mock("../queries/knowledge-base", () => {
  return {
    getScoringRubric: vi.fn(async () => [
      {
        criterionKey: "priceScore",
        scoringLogic: [
          { min: 20, max: 35, score: 10, note: "Sweet spot: $20-35" },
          { min: 15, max: 50, score: 8, note: "Acceptable range" },
          { min: 0, max: 15, score: 3, note: "Too cheap" },
        ],
      },
      {
        criterionKey: "sizeWeightScore",
        scoringLogic: [
          { max_lb: 1, score: 10, note: "Small standard" },
          { max_lb: 3, score: 6, note: "Large standard" },
        ],
      },
      {
        criterionKey: "marketSizeScore",
        scoringLogic: [
          { bsr_max: 5000, score: 9 },
          { bsr_max: 20000, score: 8 },
        ],
      },
      {
        criterionKey: "reviewBarrierScore",
        scoringLogic: [
          { reviews_max: 50, score: 10 },
          { reviews_max: 150, score: 8 },
        ],
      },
      {
        criterionKey: "complexityScore",
        scoringLogic: [
          { base: 10, deduct_if_battery: 3, deduct_if_electronic: 3, deduct_if_fragile: 2, floor: 2 },
        ],
      },
      {
        criterionKey: "brandDominanceScore",
        scoringLogic: [],
      },
      {
        criterionKey: "marginScore",
        scoringLogic: [
          { margin_min: 0.30, score: 9 },
          { margin_min: 0.20, score: 7 },
        ],
      },
    ]),
    matchFeeRate: vi.fn(async (marketplace, feeType) => {
      if (feeType === "referral") return { rateValue: "0.15" };
      if (feeType === "fulfillment") return { rateValue: "3.86" };
      if (feeType === "fuel_surcharge") return { rateValue: "0.035" };
      return null;
    }),
  };
});

describe("Scoring Heuristics", () => {
  it("calculates correct grade and recommendation for premium score", async () => {
    const input = {
      price: 25,
      weight: 0.5,
      bsr: 3000,
      reviewCount: 40,
      sellerCount: 8,
      category: "most_categories",
      hasBattery: false,
      isElectronic: false,
      isFragile: false,
      marketplace: "US",
    };

    const result = await scoreProduct(input);
    expect(result.totalScore).toBeGreaterThanOrEqual(70);
    expect(result.grade).toBeDefined();
    expect(result.recommendation).toBeDefined();
  });

  it("penalizes complexity appropriately (electronic, fragile, battery)", async () => {
    const simpleProduct = {
      price: 25,
      weight: 0.5,
      bsr: 3000,
      reviewCount: 40,
      sellerCount: 8,
      category: "most_categories",
      hasBattery: false,
      isElectronic: false,
      isFragile: false,
    };

    const complexProduct = {
      ...simpleProduct,
      hasBattery: true,
      isElectronic: true,
      isFragile: true,
    };

    const simpleRes = await scoreProduct(simpleProduct);
    const complexRes = await scoreProduct(complexProduct);

    expect(complexRes.scores.complexityScore).toBeLessThan(simpleRes.scores.complexityScore);
  });
});

describe("Specs Extraction", () => {
  it("extracts core details from text report comments", () => {
    const mockReport = `
      এস্টিমেটেড প্রাইজ | $24.99
      অ্যাভারেজ রিভিউ | 150
      কম্পিটিটর সংখ্যা | 6
      BSR | 12,500
      ক্যাটাগরি | ইলেকট্রনিক্স
    `;
    const specs = extractSpecsFromReport(mockReport);
    expect(specs.price).toBe(24.99);
    expect(specs.reviewCount).toBe(150);
    expect(specs.sellerCount).toBe(6);
    expect(specs.bsr).toBe(12500);
    expect(specs.category).toBe("electronics");
  });
});
