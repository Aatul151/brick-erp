import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './models/schemaIndex.js',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host:process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  },
});
