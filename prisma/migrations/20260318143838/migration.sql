-- CreateEnum
CREATE TYPE "CardType" AS ENUM ('UNIT', 'BUFF');

-- CreateEnum
CREATE TYPE "EffectType" AS ENUM ('GUARD_PASSIVE', 'PACK_ATTACK', 'HATCH', 'EVOLVE', 'BUFF_ATTACK', 'BUFF_HEALTH');

-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('PASSIVE', 'ON_PLAY', 'TURN_START_OWNER', 'ON_DEATH');

-- CreateEnum
CREATE TYPE "TargetType" AS ENUM ('SELF', 'ALLY_UNIT', 'ENEMY_UNIT', 'ENEMY_HERO', 'NONE');

-- CreateTable
CREATE TABLE "CardEffect" (
    "id" SERIAL NOT NULL,
    "cardId" INTEGER NOT NULL,
    "effectType" "EffectType" NOT NULL,
    "triggerType" "TriggerType" NOT NULL,
    "targetType" "TargetType" NOT NULL,
    "value" INTEGER,
    "durationEffect" INTEGER,
    "params" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CardEffect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CardType" NOT NULL,
    "cost" INTEGER NOT NULL,
    "attack" INTEGER,
    "health" INTEGER,
    "species" TEXT,
    "abilityText" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CardEffect_cardId_triggerType_idx" ON "CardEffect"("cardId", "triggerType");

-- CreateIndex
CREATE INDEX "CardEffect_effectType_idx" ON "CardEffect"("effectType");

-- CreateIndex
CREATE UNIQUE INDEX "Card_slug_key" ON "Card"("slug");

-- CreateIndex
CREATE INDEX "Card_type_isActive_idx" ON "Card"("type", "isActive");

-- AddForeignKey
ALTER TABLE "CardEffect" ADD CONSTRAINT "CardEffect_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
