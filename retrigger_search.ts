import { config } from 'dotenv';
config();
import { getDb } from './server/queries/connection.js';
import { keywordSearches, keywordSearchListings } from '@db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { fetchListingsForKeyword } from './server/lib/amazon-paapi.js';
import { assessMarket, scoreListing, mapToKeywordSearchListing } from './server/lib/listing-analysis.js';
import { buildGroundedSystemPrompt, callAIWithFallback } from './server/lib/ai-provider.js';
import { env } from './server/lib/env.js';

async function test() {
  console.log("Scraper API Key in env:", env.scraperApiKey ? "SET" : "NOT SET");
  console.log("Process.env.SCRAPER_API_KEY:", process.env.SCRAPER_API_KEY ? "SET" : "NOT SET");
  
  process.exit(0);
}

test().catch(console.error);
