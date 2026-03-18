import { PrismaClient, type Prisma } from '@prisma/client';
import { STARTER_CARDS } from '../cards/starterCards.js';

const prisma = new PrismaClient();

async function main(): Promise<void> {
	for (const card of STARTER_CARDS) {
		const persistedCard = await prisma.card.upsert({
			where: { slug: card.id },
			update: {
				name: card.name,
				type: 'UNIT',
				cost: card.cost,
				attack: card.attack,
				health: card.health,
				species: card.species,
				abilityText: card.abilityText ?? null,
				isActive: true
			},
			create: {
				slug: card.id,
				name: card.name,
				type: 'UNIT',
				cost: card.cost,
				attack: card.attack,
				health: card.health,
				species: card.species,
				abilityText: card.abilityText ?? null,
				isActive: true
			}
		});

		await prisma.cardEffect.deleteMany({
			where: { cardId: persistedCard.id }
		});

		const effects: Prisma.CardEffectCreateManyInput[] = [];

		if (card.keywords?.includes('guard')) {
			effects.push({
				cardId: persistedCard.id,
				effectType: 'GUARD_PASSIVE',
				triggerType: 'PASSIVE',
				targetType: 'NONE',
				sortOrder: 0
			});
		}

		if (card.egg) {
			effects.push({
				cardId: persistedCard.id,
				effectType: 'HATCH',
				triggerType: 'TURN_START_OWNER',
				targetType: 'SELF',
				sortOrder: 0,
				params: {
					hatchesIntoCardId: card.egg.hatchesIntoCardId,
					turnsToHatch: card.egg.turnsToHatch
				}
			});
		}

		if (effects.length > 0) {
			await prisma.cardEffect.createMany({
				data: effects
			});
		}
	}

	console.log(`Seed complete: ${STARTER_CARDS.length} cards synced.`);
}

main()
	.catch((error) => {
		console.error('Seed failed', error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
