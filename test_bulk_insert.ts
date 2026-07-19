import { config } from 'dotenv';
config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { getDb } from './server/queries/connection.js';
import { keywordSearchListings } from './db/schema.js';
import { fetchListingsWithScraperAPI } from './server/lib/amazon-paapi.js';
import { env } from './server/lib/env.js';
import { scoreListing, assessMarket, mapToKeywordSearchListing } from './server/lib/listing-analysis.js';

async function main() {
  const db = getDb();
  console.log("Fetching ScraperAPI data...");
  const result = await fetchListingsWithScraperAPI("Portable Cornhole Board Set", "US", 1, env.scraperApiKey);
  
  const marketAssessment = assessMarket(result.items, result.totalResultCount);
  const topBrand = "TestBrand";
  
  const listingsToInsert = result.items.map((item, index) => {
    const scoreResult = scoreListing(item, {
      medianReviews: marketAssessment.avgReviewCount,
      medianPrice: marketAssessment.avgPrice,
      topBrand: topBrand,
    });
    return mapToKeywordSearchListing(item, 7, index + 1, scoreResult.score, scoreResult.verdict, scoreResult.reason);
  });
  
  console.log(`Inserting ${listingsToInsert.length} items...`);
  try {
    await db.insert(keywordSearchListings).values(listingsToInsert);
    console.log("Bulk insert successful!");
  } catch (e) {
    console.error("Bulk insert failed:", e);
  }
  process.exit(0);
}
main();
