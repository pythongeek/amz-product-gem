import { getScoringRubric, matchFeeRate } from "../queries/knowledge-base";

export interface ProductInput {
  price: number;
  weight?: number; // in lbs
  bsr: number;
  reviewCount: number;
  sellerCount: number;
  category?: string;
  hasBattery?: boolean;
  isElectronic?: boolean;
  isFragile?: boolean;
  marketplace?: string;
  rating?: number;
  salesEstimate?: number;
}

export function extractSpecsFromReport(content: string): ProductInput {
  const specs: ProductInput = {
    price: 25,
    weight: 1,
    bsr: 15000,
    reviewCount: 120,
    sellerCount: 8,
    category: "most_categories",
    hasBattery: false,
    isElectronic: false,
    isFragile: false,
  };

  try {
    // Extract price
    const priceMatch = content.match(/এস্টিমেটেড প্রাইজ\s*\|\s*\$?\s*([0-9.]+)/i) || 
                       content.match(/price\s*:\s*\$?\s*([0-9.]+)/i);
    if (priceMatch) specs.price = parseFloat(priceMatch[1]);

    // Extract reviews
    const reviewsMatch = content.match(/অ্যাভারেজ রিভিউ\s*\|\s*([0-9,]+)/i) || 
                         content.match(/reviews?\s*:\s*([0-9,]+)/i);
    if (reviewsMatch) specs.reviewCount = parseInt(reviewsMatch[1].replace(/,/g, ""));

    // Extract seller count
    const sellerMatch = content.match(/কম্পিটিটর সংখ্যা\s*\|\s*([0-9,]+)/i) || 
                        content.match(/sellers?\s*:\s*([0-9,]+)/i);
    if (sellerMatch) specs.sellerCount = parseInt(sellerMatch[1].replace(/,/g, ""));

    // Extract BSR
    const bsrMatch = content.match(/BSR\s*\|\s*([0-9,]+)/i) || 
                     content.match(/BSR\s*:\s*([0-9,]+)/i);
    if (bsrMatch) specs.bsr = parseInt(bsrMatch[1].replace(/,/g, ""));

    // Extract category
    const categoryMatch = content.match(/ক্যাটাগরি\s*\|\s*([^\n|]+)/i) || 
                          content.match(/category\s*:\s*([^\n]+)/i);
    if (categoryMatch) {
      const cat = categoryMatch[1].trim().toLowerCase();
      if (cat.includes("electronic") || cat.includes("ইলেকট্রনিক্স")) specs.category = "electronics";
      else if (cat.includes("home") || cat.includes("kitchen") || cat.includes("হোম")) specs.category = "home_kitchen";
      else if (cat.includes("clothing") || cat.includes("ক্লোথিং")) specs.category = "clothing";
      else if (cat.includes("jewelry") || cat.includes("জুয়েলারি")) specs.category = "jewelry";
    }

    // Deduce electronic/battery/fragile from content
    if (/battery|ব্যাটারি|চার্জার/i.test(content)) specs.hasBattery = true;
    if (/electronic|ইলেকট্রনিক|ডিভাইস/i.test(content)) specs.isElectronic = true;
    if (/glass|ceramic|fragile|কাঁচ|ভঙ্গুর/i.test(content)) specs.isFragile = true;

    // Extract rating
    const ratingMatch = content.match(/রেটিং\s*\|\s*([0-9.]+)/i) || 
                        content.match(/rating\s*:\s*([0-9.]+)/i);
    if (ratingMatch) specs.rating = parseFloat(ratingMatch[1]);

    // Extract sales estimate
    const salesMatch = content.match(/মাসিক সেলস\s*\|\s*([0-9,]+)/i) || 
                       content.match(/monthly sales\s*:\s*([0-9,]+)/i) ||
                       content.match(/sales\s*:\s*([0-9,]+)/i);
    if (salesMatch) specs.salesEstimate = parseInt(salesMatch[1].replace(/,/g, ""));

  } catch (err) {
    console.warn("Failed to extract specs from report:", err);
  }

  return specs;
}

export async function scoreProduct(input: ProductInput) {
  const rubric = await getScoringRubric();
  
  // Initialize default scores matching schema fields
  const scores = {
    priceScore: 7,
    sizeWeightScore: 7,
    marketSizeScore: 6,
    reviewBarrierScore: 6,
    differentiationScore: 7,
    seasonalityScore: 8,
    complexityScore: 8,
    returnRateScore: 8,
    brandDominanceScore: 6,
    trendScore: 7,
    defensibilityScore: 7,
    manufacturabilityScore: 7,
    marginScore: 7,
  };

  // 1. Calculate Grounded Margin if price is provided
  let netMargin = 0;
  const marketplace = input.marketplace || "US";
  if (input.price && input.price > 0) {
    try {
      const refRate = await matchFeeRate(marketplace, "referral", input.category, null, input.price);
      const referralRate = refRate ? Number(refRate.rateValue) : 0.15; // default 15%
      const referralFee = input.price * referralRate;

      const weightOz = (input.weight ?? 1) * 16;
      const fulRate = await matchFeeRate(marketplace, "fulfillment", null, weightOz);
      let fulfillmentFee = fulRate ? Number(fulRate.rateValue) : 4.50; // default $4.50

      const fuelRate = await matchFeeRate(marketplace, "fuel_surcharge");
      if (fuelRate) {
        fulfillmentFee += fulfillmentFee * Number(fuelRate.rateValue);
      }

      const landedCogs = input.price * 0.25; // 25% cogs default
      const storageFee = 0.15; // default $0.15 storage
      const netProfit = input.price - referralFee - fulfillmentFee - landedCogs - storageFee;
      netMargin = netProfit / input.price;
    } catch (err) {
      console.warn("Failed to calculate grounded margin in scoring:", err);
      // Fallback
      if (input.price >= 25 && input.price <= 50) netMargin = 0.32;
      else if (input.price >= 15 && input.price <= 80) netMargin = 0.22;
      else netMargin = 0.12;
    }
  }

  // Process rubric logic dynamically if available
  for (const item of rubric) {
    const key = item.criterionKey as keyof typeof scores;
    const logic = item.scoringLogic;
    
    if (!logic || !Array.isArray(logic)) continue;

    if (key === "priceScore") {
      const match = logic.find((band: any) => input.price >= (band.min ?? 0) && input.price <= (band.max ?? Infinity));
      if (match) scores.priceScore = match.score;
    } 
    else if (key === "sizeWeightScore") {
      const weight = input.weight ?? 1; // lbs
      const match = logic.find((band: any) => {
        if (band.max_lb !== undefined && weight <= band.max_lb) return true;
        if (band.min_lb !== undefined && weight >= band.min_lb) return true;
        return false;
      });
      if (match) scores.sizeWeightScore = match.score;
    }
    else if (key === "marketSizeScore") {
      const match = logic.find((band: any) => input.bsr <= (band.bsr_max ?? Infinity));
      if (match) scores.marketSizeScore = match.score;
    }
    else if (key === "reviewBarrierScore") {
      const match = logic.find((band: any) => input.reviewCount <= (band.reviews_max ?? Infinity));
      if (match) scores.reviewBarrierScore = match.score;
    }
    else if (key === "complexityScore") {
      const complexLogic = logic[0];
      if (complexLogic) {
        let base = complexLogic.base ?? 10;
        if (input.hasBattery) base -= (complexLogic.deduct_if_battery ?? 3);
        if (input.isElectronic) base -= (complexLogic.deduct_if_electronic ?? 3);
        if (input.isFragile) base -= (complexLogic.deduct_if_fragile ?? 2);
        scores.complexityScore = Math.max(base, complexLogic.floor ?? 2);
      }
    }
    else if (key === "brandDominanceScore") {
      if (input.sellerCount > 15) scores.brandDominanceScore = 9;
      else if (input.sellerCount > 10) scores.brandDominanceScore = 8;
      else if (input.sellerCount > 5) scores.brandDominanceScore = 6;
      else scores.brandDominanceScore = 3;
    }
    else if (key === "marginScore") {
      const match = logic.find((band: any) => {
        if (band.margin_min !== undefined && netMargin >= band.margin_min) return true;
        if (band.margin_max !== undefined && netMargin <= band.margin_max) return true;
        return false;
      });
      if (match) scores.marginScore = match.score;
    }
    else if (key === "manufacturabilityScore") {
      scores.manufacturabilityScore = input.price > 15 ? 8 : 6;
    }
    else if (key === "returnRateScore") {
      let rScore = 9;
      if (input.isFragile) rScore -= 2;
      if (input.isElectronic) rScore -= 1;
      scores.returnRateScore = rScore;
    }
  }

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const grade = totalScore >= 100 ? "A" : totalScore >= 70 ? "B" : "C";
  const recommendation =
    grade === "A"
      ? "যান (GO) — ভাল সুযোগ"
      : grade === "B"
      ? "সতর্কতা (CAUTION) — ঝুঁকি আছে"
      : "বর্জন (FAIL) — এড়িয়ে চলুন";

  return {
    scores,
    totalScore,
    grade,
    recommendation,
  };
}
