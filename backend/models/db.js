import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({
    path: join(__dirname, "..", "..", ".env"),
});

import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "./schemaIndex.js";

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD ?? "",
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Ensure all dates are stored and read in UTC
pool.on("connect", (client) => {
    client.query("SET time zone 'UTC'");
});

export const db = drizzle(pool, {
    schema,
});

export const testConnection = async () => {
    try {
        const client = await pool.connect();
        await client.query("SELECT NOW()");
        client.release();
        console.log("DB | Database connection successful");
        return true;
    } catch (error) {
        console.error("DB | Database connection failed:", error.message);
        return false;
    }
};
