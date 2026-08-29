/**
 * Purpose: Extends `vehicles` with the detail fields the owner app's
 * vehicle record needs to be useful beyond a bare display label + plate
 * (docs/API.md already promised GET/PATCH/DELETE /owner/vehicles/:id;
 * this migration is the data side of finally implementing that surface).
 * Responsibilities: Adds variant, manufacturingYear, fuelType, vinNumber,
 * engineNumber — all nullable, matching the existing make/model/color
 * columns' style (plaintext, optional, never used as a lookup key).
 * Security: None of these are encrypted like plateNumber — unlike the
 * plate, they're not used anywhere else in the system for owner lookup,
 * so they follow the make/model/color precedent rather than the
 * plateNumberEncrypted/plateLookupHash one.
 * Related: database/entities/vehicle.entity.ts, packages/api-contracts/src/vehicle.ts.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVehicleDetailFields1700000100000 implements MigrationInterface {
  name = 'AddVehicleDetailFields1700000100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vehicles
        ADD COLUMN variant VARCHAR(40),
        ADD COLUMN "manufacturingYear" SMALLINT,
        ADD COLUMN "fuelType" VARCHAR(20),
        ADD COLUMN "vinNumber" VARCHAR(32),
        ADD COLUMN "engineNumber" VARCHAR(32);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vehicles
        DROP COLUMN variant,
        DROP COLUMN "manufacturingYear",
        DROP COLUMN "fuelType",
        DROP COLUMN "vinNumber",
        DROP COLUMN "engineNumber";
    `);
  }
}
