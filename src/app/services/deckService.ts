import type { Deck } from '@prisma/client';
import { STARTER_DECKS } from '../../../cards/starterCards.js';
import type { CardDefinition } from '../../core/entities/Card.js';
import { DeckRepository, type DeckWithCards } from '../../infra/prisma/repositories/deckRepository.js';
import { CardCatalogService } from './cardCatalogService.js';
import { CollectionService } from './collectionService.js';

export class DeckService {
	constructor(
		private readonly deckRepository: DeckRepository,
		private readonly cardCatalogService: CardCatalogService,
		private readonly collectionService: CollectionService
	) {}

	async ensureStarterDecks(playerId: number): Promise<DeckWithCards[]> {
		await this.collectionService.ensureStarterCollection(playerId);
		const existingDecks = await this.deckRepository.findManyByPlayerId(playerId);
		const existingByName = new Set(existingDecks.map((deck) => deck.name));

		for (const deck of STARTER_DECKS) {
			if (existingByName.has(deck.name)) {
				continue;
			}

			await this.collectionService.assertHasCards(playerId, deck.cardIds);
			await this.deckRepository.createDeck(playerId, deck.name, deck.cardIds);
		}

		const decks = await this.deckRepository.findManyByPlayerId(playerId);
		const currentDeck = await this.deckRepository.findCurrentByPlayerId(playerId);
		if (!currentDeck && decks[0]) {
			await this.deckRepository.setCurrentDeck(playerId, decks[0].id);
		}

		return this.deckRepository.findManyByPlayerId(playerId);
	}

	async getDeck(playerId: number): Promise<{
		deck: DeckWithCards;
		totalCards: number;
		decks: Array<{
			id: number;
			name: string;
			isCurrent: boolean;
		}>;
		groupedCards: Array<{
			cardId: string;
			count: number;
			definition: CardDefinition;
		}>;
	}> {
		await this.ensureStarterDecks(playerId);
		const deck = await this.deckRepository.findCurrentByPlayerId(playerId);
		const allDecks = await this.deckRepository.findManyByPlayerId(playerId);
		if (!deck) {
			throw new Error('Current deck not found.');
		}

		const cardIds = deck.cards.map((card) => card.card.slug);
		const lookup = await this.cardCatalogService.getLookup();
		const counts = new Map<string, number>();

		for (const cardId of cardIds) {
			counts.set(cardId, (counts.get(cardId) ?? 0) + 1);
		}

		return {
			deck,
			totalCards: cardIds.length,
			decks: allDecks.map((item) => ({
				id: item.id,
				name: item.name,
				isCurrent: item.id === deck.id
			})),
			groupedCards: [...counts.entries()].map(([cardId, count]) => ({
				cardId,
				count,
				definition: lookup(cardId)
			}))
		};
	}

	async renameDeck(playerId: number, deckId: number, nextName: string): Promise<Deck> {
		const trimmedName = nextName.trim();
		if (!trimmedName) {
			throw new Error('Название колоды не может быть пустым.');
		}

		await this.ensureStarterDecks(playerId);
		return this.deckRepository.updateName(deckId, playerId, trimmedName);
	}

	async switchCurrentDeck(playerId: number, deckId: number): Promise<void> {
		await this.ensureStarterDecks(playerId);
		await this.deckRepository.setCurrentDeck(playerId, deckId);
	}

	async updateCards(playerId: number, deckId: number, cardIds: string[]): Promise<Deck> {
		await this.ensureStarterDecks(playerId);
		await this.collectionService.assertHasCards(playerId, cardIds);
		return this.deckRepository.updateCards(deckId, playerId, cardIds);
	}
}
