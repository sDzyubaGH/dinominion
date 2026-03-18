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

		for (const ability of card.abilities ?? []) {
			if (ability.type === 'guard') {
				effects.push({
					cardId: persistedCard.id,
					effectType: 'GUARD_PASSIVE',
					triggerType: 'PASSIVE',
					targetType: 'NONE',
					sortOrder: effects.length
				});
				continue;
			}

			if (ability.type === 'pack') {
				effects.push({
					cardId: persistedCard.id,
					effectType: 'PACK_ATTACK',
					triggerType: 'PASSIVE',
					targetType: 'SELF',
					value: ability.attackBonus,
					sortOrder: effects.length,
					params: {
						minAllies: ability.minAllies,
						sameSpecies: ability.sameSpecies
					}
				});
				continue;
			}

			if (ability.type === 'hatch') {
				effects.push({
					cardId: persistedCard.id,
					effectType: 'HATCH',
					triggerType: 'TURN_START_OWNER',
					targetType: 'SELF',
					durationEffect: ability.afterOwnerTurns,
					sortOrder: effects.length,
					params: {
						intoSlug: ability.into
					}
				});
			}
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
