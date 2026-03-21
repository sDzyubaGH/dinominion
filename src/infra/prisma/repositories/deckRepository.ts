import type { Card, Deck, DeckCard } from '@prisma/client';
import { prisma } from '../client.js';

export type DeckWithCards = Deck & {
	cards: Array<DeckCard & { card: Card }>;
};

export class DeckRepository {
	async findByPlayerId(playerId: number): Promise<DeckWithCards | null> {
		return prisma.deck.findUnique({
			where: { playerId },
			include: {
				cards: {
					include: {
						card: true
					},
					orderBy: {
						position: 'asc'
					}
				}
			}
		});
	}

	async updateName(playerId: number, name: string): Promise<Deck> {
		return prisma.deck.update({
			where: { playerId },
			data: { name }
		});
	}

	async updateCards(playerId: number, cards: string[]): Promise<Deck> {
		const deck = await this.findByPlayerId(playerId);
		if (!deck) {
			throw new Error('Deck not found.');
		}

		const catalogCards = await prisma.card.findMany({
			where: {
				slug: {
					in: [...new Set(cards)]
				}
			}
		});
		const cardIdsBySlug = new Map(catalogCards.map((card) => [card.slug, card.id]));
		const missingCardId = cards.find((cardId) => !cardIdsBySlug.has(cardId));
		if (missingCardId) {
			throw new Error(`Unknown card: ${missingCardId}`);
		}

		return prisma.$transaction(async (tx) => {
			await tx.deckCard.deleteMany({
				where: { deckId: deck.id }
			});

			if (cards.length > 0) {
				await tx.deckCard.createMany({
					data: cards.map((cardId, position) => ({
						deckId: deck.id,
						cardId: cardIdsBySlug.get(cardId) as number,
						position
					}))
				});
			}

			return tx.deck.update({
				where: { playerId },
				data: {}
			});
		});
	}

	async createStarterDeck(playerId: number, cards: string[]): Promise<Deck> {
		const catalogCards = await prisma.card.findMany({
			where: {
				slug: {
					in: [...new Set(cards)]
				}
			}
		});
		const cardIdsBySlug = new Map(catalogCards.map((card) => [card.slug, card.id]));
		const missingCardId = cards.find((cardId) => !cardIdsBySlug.has(cardId));
		if (missingCardId) {
			throw new Error(`Unknown card: ${missingCardId}`);
		}

		return prisma.deck.create({
			data: {
				playerId,
				name: 'Стартовая колода',
				cards: {
					create: cards.map((cardId, position) => ({
						cardId: cardIdsBySlug.get(cardId) as number,
						position
					}))
				}
			}
		});
	}
}
