import type { Deck } from '@prisma/client';
import { prisma } from '../client.js';

export class DeckRepository {
	async findByPlayerId(playerId: number): Promise<Deck | null> {
		return prisma.deck.findUnique({
			where: { playerId }
		});
	}

	async updateName(playerId: number, name: string): Promise<Deck> {
		return prisma.deck.update({
			where: { playerId },
			data: { name }
		});
	}

	async createStarterDeck(playerId: number, cards: string[]): Promise<Deck> {
		return prisma.deck.create({
			data: {
				playerId,
				name: 'Стартовая колода',
				cardsJson: cards
			}
		});
	}
}
