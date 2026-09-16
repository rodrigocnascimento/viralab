import { createDataSource } from './index.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const dataSource = createDataSource(databaseUrl);
await dataSource.initialize();
await dataSource.undoLastMigration();
console.log('Reverted the last migration.');
await dataSource.destroy();
