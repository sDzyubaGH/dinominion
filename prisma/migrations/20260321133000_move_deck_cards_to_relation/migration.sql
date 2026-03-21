-- CreateTable
CREATE TABLE "DeckCard" (
    "id" SERIAL NOT NULL,
    "deckId" INTEGER NOT NULL,
    "cardId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeckCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeckCard_deckId_idx" ON "DeckCard"("deckId");

-- CreateIndex
CREATE INDEX "DeckCard_cardId_idx" ON "DeckCard"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "DeckCard_deckId_position_key" ON "DeckCard"("deckId", "position");

-- Backfill existing deck contents from Deck.cardsJson
INSERT INTO "DeckCard" ("deckId", "cardId", "position")
SELECT
    d."id",
    c."id",
    cards.ordinality::INTEGER - 1
FROM "Deck" d
CROSS JOIN LATERAL jsonb_array_elements_text(d."cardsJson") WITH ORDINALITY AS cards(value, ordinality)
JOIN "Card" c ON c."slug" = cards.value;

-- AlterTable
ALTER TABLE "Deck" DROP COLUMN "cardsJson";

-- AddForeignKey
ALTER TABLE "DeckCard" ADD CONSTRAINT "DeckCard_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeckCard" ADD CONSTRAINT "DeckCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
