import 'reflect-metadata';
import { DataSource } from 'typeorm';

export const createDataSource = (databaseUrl: string): DataSource =>
  new DataSource({
    type: 'postgres',
    url: databaseUrl,
    entities: [],
    migrations: [`${import.meta.dirname}/migrations/*.{js,ts}`],
    synchronize: false,
    logging: false,
  });
