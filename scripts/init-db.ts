import { getRawPool } from "../server/queries/connection.js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function main() {
  console.log("Initializing database connection...");
  const pool = getRawPool();
  const client = await pool.connect();
  try {
    console.log("Reading supabase-schema.sql...");
    const schemaSql = fs.readFileSync(path.join(process.cwd(), "supabase-schema.sql"), "utf8");
    console.log("Executing supabase-schema.sql...");
    await client.query(schemaSql);
    console.log("supabase-schema.sql executed successfully!");

    console.log("Reading supabase-knowledge-base.sql...");
    const kbSql = fs.readFileSync(path.join(process.cwd(), "supabase-knowledge-base.sql"), "utf8");
    console.log("Executing supabase-knowledge-base.sql...");
    await client.query(kbSql);
    console.log("supabase-knowledge-base.sql executed successfully!");

    console.log("Database schema and knowledge base initialized successfully!");
  } catch (err: any) {
    console.error("Error during database initialization:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
