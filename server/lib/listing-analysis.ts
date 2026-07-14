import { KeywordSearchListing } from "@db/schema";

// Input type for the analysis functions
export interface ListingInput {
  asin: string;
  title: string;
  brand?: string;
  price: number;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  isPrime?: boolean;
}

// Market-level assessment interface
export interface MarketAssessment {
  totalListings: number;
  avgPrice: number;
  avgReviewCount: number;
  topBrandShare: number;          // 0-1
  priceSpreadRatio: number;
  reviewCountGiniLike: number;    // concentration measure across listings
  marketVerdict: "green" | "yellow" | "red";
  marketVerdictReason: string;    // short Bangla-ready reason string
  bestOpportunityAsin: string | null;
}

// Per-listing score result
export interface ListingScore {
  score: number;
  verdict: "strong" | "vulnerable" | "avoid";
  reason: string;
}

/**
 * Assess the overall market for a keyword search
 * @param listings - Array of listings from the search
 * @param totalResultCount - Total number of listings for this keyword (from PA-API)
 * @returns MarketAssessment object
 */
export function assessMarket(listings: ListingInput[], totalResultCount: number): MarketAssessment {
  if (listings.length === 0) {
    return {
      totalListings: totalResultCount,
      avgPrice: 0,
      avgReviewCount: 0,
      topBrandShare: 0,
      priceSpreadRatio: 0,
      reviewCountGiniLike: 0,
      marketVerdict: "red",
      marketVerdictReason: "কোনো লিস্টিং পাওয়া যায়নি",
      bestOpportunityAsin: null,
    };
  }

  // Calculate descriptive stats
  const prices = listings.map(l => l.price).filter(p => p > 0);
  const reviewCounts = listings.map(l => l.reviewCount).filter(r => r > 0);
  const brands = listings.map(l => l.brand).filter(b => b);

  const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const avgReviewCount = reviewCounts.reduce((sum, r) => sum + r, 0) / reviewCounts.length;

  // Calculate brand concentration (top brand's share of listings)
  const brandCounts: Record<string, number> = {};
  brands.forEach(brand => {
    brandCounts[brand] = (brandCounts[brand] || 0) + 1;
  });
  const topBrand = Object.entries(brandCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const topBrandShare = topBrand ? brandCounts[topBrand] / listings.length : 0;

  // Calculate price spread ratio (max-min)/median
  const sortedPrices = [...prices].sort((a, b) => a - b);
  const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];
  const priceSpreadRatio = medianPrice > 0 ? (sortedPrices[sortedPrices.length - 1] - sortedPrices[0]) / medianPrice : 0;

  // Calculate review count concentration (Gini-like coefficient)
  const sortedReviews = [...reviewCounts].sort((a, b) => a - b);
  const meanReviews = avgReviewCount;
  const reviewDifferences = sortedReviews.map(r => Math.abs(r - meanReviews));
  const meanDifference = reviewDifferences.reduce((sum, d) => sum + d, 0) / reviewDifferences.length;
  const reviewCountGiniLike = meanReviews > 0 ? meanDifference / meanReviews : 0;

  // Determine market verdict
  let marketVerdict: "green" | "yellow" | "red" = "green";
  let marketVerdictReason = "সুযোগ ভালো";

  if (topBrandShare > 0.6 || avgReviewCount > 2000) {
    marketVerdict = "red";
    marketVerdictReason = topBrandShare > 0.6 ? "ব্র্যান্ড ডমিনেটেড মার্কেট" : "অত্যধিক প্রতিযোগিতা";
  } else if (topBrandShare > 0.4 || reviewCountGiniLike > 0.5 || avgReviewCount > 500) {
    marketVerdict = "yellow";
    marketVerdictReason = topBrandShare > 0.4 ? "ব্র্যান্ডের প্রভাব আছে" : "প্রতিযোগিতা মাঝারি";
  }

  // Find best opportunity (highest scoring listing that's not the current #1 by reviews)
  const sortedByReviews = [...listings].sort((a, b) => b.reviewCount - a.reviewCount);
  const topListingByReviews = sortedByReviews[0];

  const scoredListings = listings.map(listing => {
    const score = scoreListing(listing, {
      medianReviews: avgReviewCount,
      medianPrice: avgPrice,
      topBrand: topBrand || "",
    });
    return { ...listing, score: score.score };
  }).sort((a, b) => b.score - a.score);

  const bestOpportunity = scoredListings.find(l => l.asin !== topListingByReviews.asin) || scoredListings[0];

  return {
    totalListings: totalResultCount,
    avgPrice,
    avgReviewCount,
    topBrandShare,
    priceSpreadRatio,
    reviewCountGiniLike,
    marketVerdict,
    marketVerdictReason,
    bestOpportunityAsin: bestOpportunity?.asin || null,
  };
}

/**
 * Score an individual listing relative to the market
 * @param listing - The listing to score
 * @param marketStats - Market statistics from assessMarket
 * @returns ListingScore object
 */
export function scoreListing(
  listing: ListingInput,
  marketStats: { medianReviews: number; medianPrice: number; topBrand: string }
): ListingScore {
  let score = 50;
  const reasons: string[] = [];

  // Fewer reviews than the market median = lower barrier to unseat -> good "opportunity" signal
  if (listing.reviewCount < marketStats.medianReviews * 0.5) {
    score += 15;
    reasons.push("গড়ের চেয়ে কম রিভিউ — প্রবেশ সহজ");
  }

  // Rating below 4.3 with high review count = exploitable quality gap
  if (listing.rating < 4.3 && listing.reviewCount > marketStats.medianReviews) {
    score += 15;
    reasons.push("উচ্চ রিভিউ কিন্তু রেটিং কম — কোয়ালিটি গ্যাপ আছে");
  }

  // Price significantly below market average = potential value play
  if (listing.price < marketStats.medianPrice * 0.8) {
    score += 10;
    reasons.push("গড় প্রাইসের চেয়ে কম — ভ্যালু প্লে")
  }

  // Price significantly above market average = potential premium opportunity
  if (listing.price > marketStats.medianPrice * 1.2) {
    score += 5;
    reasons.push("গড় প্রাইসের চেয়ে বেশি — প্রিমিয়াম সুযোগ")
  }

  // Same brand as the dominant player -> penalize (already-crowded corner)
  if (listing.brand && listing.brand === marketStats.topBrand) {
    score -= 20;
    reasons.push("ডমিনেন্ট ব্র্যান্ডের অংশ");
  }

  // Extremely high review count = essentially unbeatable as a direct copy target
  if (listing.reviewCount > marketStats.medianReviews * 3) {
    score -= 25;
    reasons.push("অত্যধিক রিভিউ — সরাসরি প্রতিযোগিতা এড়ানো ভালো");
  }

  // Low rating with high review count = quality issues
  if (listing.rating < 3.5 && listing.reviewCount > marketStats.medianReviews) {
    score -= 15;
    reasons.push("কম রেটিং — কোয়ালিটি সমস্যা");
  }

  // Prime eligibility = positive signal
  if (listing.isPrime) {
    score += 5;
    reasons.push("প্রাইম এলিজিবল — ভালো সিগন্যাল");
  }

  // Cap score at 100 and floor at 0
  score = Math.max(0, Math.min(100, score));

  // Determine verdict based on score
  let verdict: "strong" | "vulnerable" | "avoid";
  if (score >= 65) {
    verdict = "strong";
  } else if (score >= 40) {
    verdict = "vulnerable";
  } else {
    verdict = "avoid";
  }

  return {
    score,
    verdict,
    reason: reasons.length > 0 ? reasons.join("; ") : "স্ট্যান্ডার্ড লিস্টিং"
  };
}

/**
 * Convert a PAAPISearchResult item to a database-ready KeywordSearchListing
 * @param item - PAAPI search result item
 * @param searchId - The keyword search ID
 * @param position - The position in the search results
 * @param score - The calculated score for this listing
 * @param verdict - The calculated verdict for this listing
 * @returns KeywordSearchListing object
 */
export function mapToKeywordSearchListing(
  item: ListingInput,
  searchId: number,
  position: number,
  score: number,
  verdict: string
): KeywordSearchListing {
  return {
    searchId,
    position,
    asin: item.asin,
    title: item.title,
    brand: item.brand,
    price: item.price,
    rating: item.rating,
    reviewCount: item.reviewCount,
    imageUrl: item.imageUrl,
    isSponsored: false, // PA-API doesn't provide this, default to false
    isAmazonChoice: false, // PA-API doesn't provide this, default to false
    isPrime: item.isPrime || false,
    perListingScore: score,
    perListingVerdict: verdict as "strong" | "vulnerable" | "avoid",
  };
}