import type { Deck } from '@prisma/client';
import { DeckRepository } from '../../infra/prisma/repositories/deckRepository.js';
import { CardService } from './cardService.js';

export class DeckService {
	constructor(
		private readonly deckRepository: DeckRepository,
		private readonly cardService: CardService
	) {}

	async ensureStarterDeck(playerId: number): Promise<Deck> {
		const existingDeck = await this.deckRepository.findByPlayerId(playerId);
		if (existingDeck) {
			return existingDeck;
		}

		const starterDeckCardIds = await this.cardService.getStarterDeckCardIds();
		return this.deckRepository.createStarterDeck(playerId, starterDeckCardIds);
	}

	async getDeck(playerId: number): Promise<{ deck: Deck; cards: string[] }> {
		const deck = await this.ensureStarterDeck(playerId);
		const lookup = await this.cardService.getLookupByIds(deck.cardsJson as string[]);
		const cards = (deck.cardsJson as string[]).map((cardId) => lookup(cardId).name);
		return { deck, cards };
	}
}
