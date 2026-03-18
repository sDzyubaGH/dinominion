import { STARTER_CARDS, STARTER_DECK_CARD_IDS } from '../../../cards/starterCards.js';
import { collectBattleCardIds, createCardLookup } from '../../core/cardCatalog.js';
import type { CardDefinition } from '../../core/entities/Card.js';
import type { BattleState } from '../../core/types/BattleState.js';
import { CardRepository } from '../../infra/prisma/repositories/cardRepository.js';

export class CardService {
	constructor(private readonly cardRepository: CardRepository) {}

	async ensureSeedCards(): Promise<void> {
		await this.cardRepository.upsertDefinitions(STARTER_CARDS);
	}

	async getStarterDeckCardIds(): Promise<string[]> {
		await this.ensureSeedCards();
		return [...STARTER_DECK_CARD_IDS];
	}

	async getAllCards(): Promise<CardDefinition[]> {
		await this.ensureSeedCards();
		return this.cardRepository.findAllActive();
	}

	async getCardsByIds(cardIds: string[]): Promise<CardDefinition[]> {
		await this.ensureSeedCards();
		const uniqueIds = [...new Set(cardIds)];
		if (uniqueIds.length === 0) {
			return [];
		}

		const cards = await this.cardRepository.findManyByIds(uniqueIds);
		const foundIds = new Set(cards.map((card) => card.id));
		const missingCardId = uniqueIds.find((cardId) => !foundIds.has(cardId));
		if (missingCardId) {
			throw new Error(`Card not found: ${missingCardId}`);
		}
		return cards;
	}

	async getLookupByIds(cardIds: string[]): Promise<(cardId: string) => CardDefinition> {
		return createCardLookup(await this.getCardsByIds(cardIds));
	}

	async getLookupForBattleState(
		state: BattleState
	): Promise<(cardId: string) => CardDefinition> {
		return this.getLookupByIds(collectBattleCardIds(state));
	}
}
