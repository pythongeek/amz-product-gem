import { config } from 'dotenv';
config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import pg from 'pg';

const { Client } = pg;
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log("Connected to database.");
  
  try {
    const res = await client.query(`
      ALTER TABLE keyword_search_listings 
      ADD COLUMN IF NOT EXISTS per_listing_verdict_reason text;
    `);
    console.log("Column added or already exists:", res.command);
  } catch (e) {
    console.error("Error adding column:", e);
  } finally {
    await client.end();
  }
}

main();
