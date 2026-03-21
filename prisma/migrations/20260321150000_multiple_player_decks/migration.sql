-- AlterTable
ALTER TABLE "Player" ADD COLUMN "currentDeckId" INTEGER;

-- DropIndex
DROP INDEX "Deck_playerId_key";

-- CreateIndex
CREATE INDEX "Deck_playerId_idx" ON "Deck"("playerId");

-- Backfill current deck from existing single-deck setup
UPDATE "Player" p
SET "currentDeckId" = d."id"
FROM "Deck" d
WHERE d."playerId" = p."id" AND p."currentDeckId" IS NULL;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_currentDeckId_fkey" FOREIGN KEY ("currentDeckId") REFERENCES "Deck"("id") ON DELETE SET NULL ON UPDATE CASCADE;
