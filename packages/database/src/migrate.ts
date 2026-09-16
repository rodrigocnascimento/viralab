import { createDataSource } from './index.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const dataSource = createDataSource(databaseUrl);
await dataSource.initialize();
const migrations = await dataSource.runMigrations();
console.log(`Applied ${migrations.length} migration(s).`);
await dataSource.destroy();
