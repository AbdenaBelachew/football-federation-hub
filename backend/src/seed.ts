import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pgDb } from "./db/postgres.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seedPostgres() {
  console.log("Seeding PostgreSQL federation-db...");
  try {
    const sqlPath = path.resolve(__dirname, "../data/pg_seed.sql");
    const sql = fs.readFileSync(sqlPath, "utf-8");
    await pgDb.query(sql);
    console.log("✅ PostgreSQL federation-db successfully seeded with clubs, players, matches, users, and competitions!");
    process.exit(0);
  } catch (err: any) {
    console.error("❌ Seeding failed:", err.message);
    process.exit(1);
  }
}

seedPostgres();
