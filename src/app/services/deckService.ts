import type { Deck } from '@prisma/client';
import { STARTER_DECK_CARD_IDS } from '../../../cards/starterCards.js';
import type { CardDefinition } from '../../core/entities/Card.js';
import { DeckRepository } from '../../infra/prisma/repositories/deckRepository.js';
import { CardCatalogService } from './cardCatalogService.js';
import { CollectionService } from './collectionService.js';

export class DeckService {
	constructor(
		private readonly deckRepository: DeckRepository,
		private readonly cardCatalogService: CardCatalogService,
		private readonly collectionService: CollectionService
	) {}

	async ensureStarterDeck(playerId: number): Promise<Deck> {
		const existingDeck = await this.deckRepository.findByPlayerId(playerId);
		if (existingDeck) {
			return existingDeck;
		}

		await this.collectionService.ensureStarterCollection(playerId);
		await this.collectionService.assertHasCards(playerId, STARTER_DECK_CARD_IDS);
		return this.deckRepository.createStarterDeck(playerId, STARTER_DECK_CARD_IDS);
	}

	async getDeck(playerId: number): Promise<{
		deck: Deck;
		totalCards: number;
		groupedCards: Array<{
			cardId: string;
			count: number;
			definition: CardDefinition;
		}>;
	}> {
		const deck = await this.ensureStarterDeck(playerId);
		const cardIds = deck.cardsJson as string[];
		const lookup = await this.cardCatalogService.getLookup();
		const counts = new Map<string, number>();

		for (const cardId of cardIds) {
			counts.set(cardId, (counts.get(cardId) ?? 0) + 1);
		}

		return {
			deck,
			totalCards: cardIds.length,
			groupedCards: [...counts.entries()].map(([cardId, count]) => ({
				cardId,
				count,
				definition: lookup(cardId)
			}))
		};
	}

	async renameDeck(playerId: number, nextName: string): Promise<Deck> {
		const trimmedName = nextName.trim();
		if (!trimmedName) {
			throw new Error('Название колоды не может быть пустым.');
		}

		await this.ensureStarterDeck(playerId);
		return this.deckRepository.updateName(playerId, trimmedName);
	}

	async updateCards(playerId: number, cardIds: string[]): Promise<Deck> {
		await this.ensureStarterDeck(playerId);
		await this.collectionService.assertHasCards(playerId, cardIds);
		return this.deckRepository.updateCards(playerId, cardIds);
	}
}
