import { Pool } from 'pg';
import { config } from '../config.js';

const pool = new Pool({
  connectionString: config.DATABASE_URL,
});

export const pgDb = {
  query: (text: string, params?: any[]) => pool.query(text, params),
};
