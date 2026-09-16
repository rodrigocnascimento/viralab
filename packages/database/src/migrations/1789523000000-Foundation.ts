import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Foundation1789523000000 implements MigrationInterface {
  name = 'Foundation1789523000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "foundation_health" ("id" integer PRIMARY KEY, "created_at" timestamptz NOT NULL DEFAULT now())`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "foundation_health"');
  }
}
