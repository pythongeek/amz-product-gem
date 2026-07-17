import { getDb } from './server/queries/connection.js';
import { researchJobs, keywordSearches } from '@db/schema.js';
import { eq } from 'drizzle-orm';

async function test() {
  const db = getDb();
  
  const pendingResearch = await db.select().from(researchJobs).where(eq(researchJobs.status, 'pending'));
  const runningResearch = await db.select().from(researchJobs).where(eq(researchJobs.status, 'running'));
  const failedResearch = await db.select().from(researchJobs).where(eq(researchJobs.status, 'failed'));
  
  console.log("Research Jobs:", {
    pending: pendingResearch.length,
    running: runningResearch.length,
    failed: failedResearch.length,
  });

  const pendingKeyword = await db.select().from(keywordSearches).where(eq(keywordSearches.status, 'pending'));
  const runningKeyword = await db.select().from(keywordSearches).where(eq(keywordSearches.status, 'running'));
  const failedKeyword = await db.select().from(keywordSearches).where(eq(keywordSearches.status, 'failed'));

  console.log("Keyword Searches:", {
    pending: pendingKeyword.length,
    running: runningKeyword.length,
    failed: failedKeyword.length,
  });
  
  if (failedResearch.length > 0) {
    console.log("First failed research error:", failedResearch[0].error);
  }
  if (failedKeyword.length > 0) {
    console.log("First failed keyword search error:", failedKeyword[0].error);
  }
  
  process.exit(0);
}

test().catch(console.error);
