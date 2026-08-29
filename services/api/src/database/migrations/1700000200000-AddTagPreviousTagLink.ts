/**
 * Purpose: Adds the lifecycle link a replacement tag needs to its
 * predecessor — the concrete "REPORTED_LOST -> REPLACED" relationship
 * (docs/THREAT_MODEL.md §3.2 still governs activation itself: this link
 * is metadata/lineage only, never a substitute for PIN verification).
 * Responsibilities: `previousTagId` on `tags`, nullable, set only when
 * TagsService.activate() is called with a `replacesTagId` that points to
 * a tag the same authenticated owner already had reported lost — see
 * tags.service.ts for the validation.
 * Security: This column carries no authority of its own — a tag with
 * previousTagId set still requires its own independent PIN to activate.
 * It exists purely so "which tag replaced which" is queryable/auditable
 * after the fact, rather than only reconstructable from separate audit
 * log rows.
 * Related: database/entities/tag.entity.ts, modules/tags/tags.service.ts.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTagPreviousTagLink1700000200000 implements MigrationInterface {
  name = 'AddTagPreviousTagLink1700000200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tags
        ADD COLUMN "previousTagId" UUID REFERENCES tags(id) ON DELETE SET NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tags
        DROP COLUMN "previousTagId";
    `);
  }
}
