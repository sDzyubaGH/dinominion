/*
  Warnings:

  - The primary key for the `Battle` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Battle` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `winnerId` column on the `Battle` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Deck` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Deck` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Player` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Player` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `player1Id` on the `Battle` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `player2Id` on the `Battle` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `currentTurnPlayerId` on the `Battle` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `playerId` on the `Deck` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `telegramId` on the `Player` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "Battle" DROP CONSTRAINT "Battle_player1Id_fkey";

-- DropForeignKey
ALTER TABLE "Battle" DROP CONSTRAINT "Battle_player2Id_fkey";

-- DropForeignKey
ALTER TABLE "Battle" DROP CONSTRAINT "Battle_winnerId_fkey";

-- DropForeignKey
ALTER TABLE "Deck" DROP CONSTRAINT "Deck_playerId_fkey";

-- AlterTable
ALTER TABLE "Battle" DROP CONSTRAINT "Battle_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "player1Id",
ADD COLUMN     "player1Id" INTEGER NOT NULL,
DROP COLUMN "player2Id",
ADD COLUMN     "player2Id" INTEGER NOT NULL,
DROP COLUMN "winnerId",
ADD COLUMN     "winnerId" INTEGER,
DROP COLUMN "currentTurnPlayerId",
ADD COLUMN     "currentTurnPlayerId" INTEGER NOT NULL,
ADD CONSTRAINT "Battle_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Deck" DROP CONSTRAINT "Deck_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "playerId",
ADD COLUMN     "playerId" INTEGER NOT NULL,
ADD CONSTRAINT "Deck_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Player" DROP CONSTRAINT "Player_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "telegramId",
ADD COLUMN     "telegramId" BIGINT NOT NULL,
ADD CONSTRAINT "Player_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "Battle_player1Id_status_idx" ON "Battle"("player1Id", "status");

-- CreateIndex
CREATE INDEX "Battle_player2Id_status_idx" ON "Battle"("player2Id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Deck_playerId_key" ON "Deck"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_telegramId_key" ON "Player"("telegramId");

-- AddForeignKey
ALTER TABLE "Deck" ADD CONSTRAINT "Deck_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
