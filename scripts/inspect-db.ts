import { getRawPool } from "../server/queries/connection.js";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const pool = getRawPool();
  const client = pool;
  try {
    console.log("Querying table columns for 'research_jobs'...");
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'research_jobs';
    `);
    console.log("Columns of 'research_jobs' table:");
    console.log(res.rows);
  } catch (err: any) {
    console.error("Inspect error:", err.message);
  } finally {
    await pool.end();
  }
}

main();
