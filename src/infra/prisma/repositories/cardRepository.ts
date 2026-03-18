import { Prisma, type Card } from '@prisma/client';
import type { CardDefinition } from '../../../core/entities/Card.js';
import { prisma } from '../client.js';

export class CardRepository {
	async findAllActive(): Promise<CardDefinition[]> {
		const cards = await prisma.card.findMany({
			where: { isActive: true },
			orderBy: { id: 'asc' }
		});
		return cards.map(toDefinition);
	}

	async findManyByIds(cardIds: string[]): Promise<CardDefinition[]> {
		const cards = await prisma.card.findMany({
			where: {
				slug: { in: cardIds },
				isActive: true
			}
		});
		return cards.map(toDefinition);
	}

	async upsertDefinitions(cards: CardDefinition[]): Promise<void> {
		await prisma.$transaction(
			cards.map((card) =>
				prisma.card.upsert({
					where: { slug: card.id },
					update: {
						name: card.name,
						cost: card.cost,
						attack: card.attack,
						health: card.health,
						species: card.species,
						abilityText: card.abilityText ?? null,
						abilities: (card.abilities ?? []) as unknown as Prisma.InputJsonValue,
						isActive: true
					},
					create: {
						slug: card.id,
						name: card.name,
						cost: card.cost,
						attack: card.attack,
						health: card.health,
						species: card.species,
						abilityText: card.abilityText ?? null,
						abilities: (card.abilities ?? []) as unknown as Prisma.InputJsonValue,
						isActive: true
					}
				})
			)
		);
	}
}

function toDefinition(card: Card): CardDefinition {
	return {
		id: card.slug,
		name: card.name,
		cost: card.cost,
		attack: card.attack,
		health: card.health,
		species: card.species,
		abilityText: card.abilityText ?? undefined,
		abilities: card.abilities as unknown as CardDefinition['abilities']
	};
}
