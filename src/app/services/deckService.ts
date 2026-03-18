import type { Deck } from '@prisma/client';
import { DeckRepository } from '../../infra/prisma/repositories/deckRepository.js';
import { CardCatalogService } from './cardCatalogService.js';

const STARTER_DECK_CARD_SLUGS: string[] = [
	'forest-raptor',
	'forest-raptor',
	'alpha-raptor',
	'ridge-triceratops',
	'ridge-triceratops',
	'horned-guardian',
	'horned-guardian',
	'cliff-stalker',
	'marsh-hunter',
	'marsh-hunter',
	'ancient-egg',
	'reedback-brute'
];

export class DeckService {
	constructor(
		private readonly deckRepository: DeckRepository,
		private readonly cardCatalogService: CardCatalogService
	) {}

	async ensureStarterDeck(playerId: number): Promise<Deck> {
		const existingDeck = await this.deckRepository.findByPlayerId(playerId);
		if (existingDeck) {
			return existingDeck;
		}

		return this.deckRepository.createStarterDeck(playerId, STARTER_DECK_CARD_SLUGS);
	}

	async getDeck(playerId: number): Promise<{ deck: Deck; cards: string[] }> {
		const deck = await this.ensureStarterDeck(playerId);
		const cards = await Promise.all(
			(deck.cardsJson as string[]).map((cardId) => this.cardCatalogService.getCardName(cardId))
		);
		return { deck, cards };
	}
}
