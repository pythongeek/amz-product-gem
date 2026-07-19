import { config } from 'dotenv';
config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { getDb } from './server/queries/connection.js';
import { keywordSearchListings } from './db/schema.js';

async function main() {
  const db = getDb();
  console.log("Trying to insert dummy listing...");
  try {
    await db.insert(keywordSearchListings).values({
      searchId: 7, // Ensure searchId exists in your local DB
      position: 1,
      asin: "B0TEST",
      title: "Test Title",
      brand: "TestBrand",
      price: "19.99",
      rating: "4.5",
      reviewCount: 100,
      imageUrl: "http://example.com/image.jpg",
      isSponsored: false,
      isAmazonChoice: false,
      isPrime: true,
      perListingScore: 50,
      perListingVerdict: "vulnerable",
      perListingVerdictReason: "This is a test reason that might be long",
    });
    console.log("Insert successful!");
  } catch (e) {
    console.error("Insert failed:", e);
  }
  process.exit(0);
}
main();
