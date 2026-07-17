import { getDb } from './server/queries/connection.js';
import { keywordSearches, keywordSearchListings } from '@db/schema.js';
import { desc, eq } from 'drizzle-orm';

async function test() {
  const db = getDb();
  
  const latestSearches = await db.select().from(keywordSearches).orderBy(desc(keywordSearches.createdAt)).limit(1);
  if (latestSearches.length === 0) {
    console.log("No keyword searches found.");
    process.exit(0);
  }

  const search = latestSearches[0];
  console.log("Latest Search:", {
    id: search.id,
    keyword: search.keyword,
    status: search.status,
    totalResultCount: search.totalResultCount,
  });

  const listings = await db.select().from(keywordSearchListings).where(eq(keywordSearchListings.searchId, search.id)).limit(10);
  console.log("Sample listings for this search:");
  for (const item of listings) {
    console.log(`- [${item.asin}] Score: ${item.perListingScore} | Verdict: ${item.perListingVerdict} | Title: ${item.title.substring(0, 50)}...`);
  }

  process.exit(0);
}

test().catch(console.error);
