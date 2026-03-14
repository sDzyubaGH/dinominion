import type { Deck } from '@prisma/client';
import { prisma } from '../client.js';

export class DeckRepository {
	async findByPlayerId(playerId: string): Promise<Deck | null> {
		return prisma.deck.findUnique({
			where: { playerId }
		});
	}

	async createStarterDeck(playerId: string, cards: string[]): Promise<Deck> {
		return prisma.deck.create({
			data: {
				playerId,
				name: 'Стартовая колода',
				cardsJson: cards
			}
		});
	}
}
