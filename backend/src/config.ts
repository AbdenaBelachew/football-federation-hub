import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
  port: parseInt(process.env.PORT || "5001", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  apiPrefix: process.env.API_PREFIX || "/api",
  jwtSecret: process.env.JWT_SECRET || "federation-super-secret-jwt-key-2026-football-hub",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  DATABASE_URL: process.env.DATABASE_URL || "",
  dbFilePath: process.env.DB_FILE_PATH
    ? path.resolve(process.cwd(), process.env.DB_FILE_PATH)
    : path.resolve(__dirname, "../data/federation_db.json"),
};
