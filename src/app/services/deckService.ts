import type { Deck } from '@prisma/client';
import { STARTER_DECK_CARD_IDS, STARTER_CARD_MAP } from '../../../cards/starterCards.js';
import { DeckRepository } from '../../infra/prisma/repositories/deckRepository.js';

export class DeckService {
	constructor(private readonly deckRepository: DeckRepository) {}

	async ensureStarterDeck(playerId: number): Promise<Deck> {
		const existingDeck = await this.deckRepository.findByPlayerId(playerId);
		if (existingDeck) {
			return existingDeck;
		}

		return this.deckRepository.createStarterDeck(playerId, STARTER_DECK_CARD_IDS);
	}

	async getDeck(playerId: number): Promise<{ deck: Deck; cards: string[] }> {
		const deck = await this.ensureStarterDeck(playerId);
		const cards = (deck.cardsJson as string[]).map(
			(cardId) => STARTER_CARD_MAP.get(cardId)?.name ?? cardId
		);
		return { deck, cards };
	}
}
