import type { Card, Deck, DeckCard } from '@prisma/client';
import { prisma } from '../client.js';

export type DeckWithCards = Deck & {
	cards: Array<DeckCard & { card: Card }>;
};

export class DeckRepository {
	async findById(id: number): Promise<DeckWithCards | null> {
		return prisma.deck.findUnique({
			where: { id },
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

	async findManyByPlayerId(playerId: number): Promise<DeckWithCards[]> {
		return prisma.deck.findMany({
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
			},
			orderBy: {
				createdAt: 'asc'
			}
		});
	}

	async findCurrentByPlayerId(playerId: number): Promise<DeckWithCards | null> {
		const player = await prisma.player.findUnique({
			where: { id: playerId },
			select: {
				currentDeckId: true
			}
		});
		if (!player?.currentDeckId) {
			return null;
		}

		const deck = await this.findById(player.currentDeckId);
		return deck?.playerId === playerId ? deck : null;
	}

	async setCurrentDeck(playerId: number, deckId: number): Promise<void> {
		const deck = await prisma.deck.findFirst({
			where: {
				id: deckId,
				playerId
			},
			select: {
				id: true
			}
		});
		if (!deck) {
			throw new Error('Deck not found.');
		}

		await prisma.player.update({
			where: { id: playerId },
			data: {
				currentDeckId: deck.id
			}
		});
	}

	async updateName(deckId: number, playerId: number, name: string): Promise<Deck> {
		const deck = await prisma.deck.findFirst({
			where: {
				id: deckId,
				playerId
			},
			select: {
				id: true
			}
		});
		if (!deck) {
			throw new Error('Deck not found.');
		}

		return prisma.deck.update({
			where: { id: deckId },
			data: { name }
		});
	}

	async updateCards(deckId: number, playerId: number, cards: string[]): Promise<Deck> {
		const deck = await prisma.deck.findFirst({
			where: {
				id: deckId,
				playerId
			},
			select: {
				id: true
			}
		});
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
				where: { id: deckId },
				data: {}
			});
		});
	}

	async createDeck(playerId: number, name: string, cards: string[]): Promise<Deck> {
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
				name,
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
