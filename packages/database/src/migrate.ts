import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const client = postgres(databaseUrl, { max: 1, prepare: false });
const db = drizzle(client);

try {
  await migrate(db, { migrationsFolder: new URL('../drizzle', import.meta.url).pathname });
  console.log('Database migrations completed');
} finally {
  await client.end();
}
