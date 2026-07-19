import { config } from 'dotenv';
config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { getDb } from './server/queries/connection.js';
import { keywordSearches, keywordSearchListings } from '@db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { fetchListingsForKeyword } from './server/lib/amazon-paapi.js';
import { assessMarket, scoreListing, mapToKeywordSearchListing } from './server/lib/listing-analysis.js';

async function test() {
  const db = getDb();
  
  const searchId = 7;
  const keyword = "Portable Cornhole Board Set";
  const marketplace = "US";

  console.log("Processing search", searchId, keyword);
  const result = await fetchListingsForKeyword(keyword, marketplace);

  const marketAssessment = assessMarket(result.items, result.totalResultCount);

  const brands = result.items.map((l: any) => l.brand).filter((b: any) => b);
  const brandCounts: Record<string, number> = {};
  brands.forEach((brand: string) => {
    brandCounts[brand] = (brandCounts[brand] || 0) + 1;
  });
  const topBrand = Object.entries(brandCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

  const listingsToInsert = result.items.map((item: any, index: number) => {
    const scoreResult = scoreListing(item, {
      medianReviews: marketAssessment.avgReviewCount,
      medianPrice: marketAssessment.avgPrice,
      topBrand: topBrand,
    });
    return mapToKeywordSearchListing(item, searchId, index + 1, scoreResult.score, scoreResult.verdict, scoreResult.reason);
  });

  try {
    await db.insert(keywordSearchListings).values(listingsToInsert);
    console.log("Insert successful!");
  } catch (err) {
    console.error("Failed to insert:", err);
  }
  process.exit(0);
}

test().catch(console.error);
