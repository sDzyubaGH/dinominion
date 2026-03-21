import { STARTER_COLLECTION_CARD_IDS } from '../../../cards/starterCards.js';
import { CardRepository } from '../../infra/prisma/repositories/cardRepository.js';
import { PlayerCardRepository } from '../../infra/prisma/repositories/playerCardRepository.js';

export class CollectionService {
	constructor(
		private readonly playerCardRepository: PlayerCardRepository,
		private readonly cardRepository: CardRepository
	) {}

	async ensureStarterCollection(playerId: number): Promise<void> {
		const desiredCounts = countCardIds(STARTER_COLLECTION_CARD_IDS);
		const cards = await this.cardRepository.findManyBySlugs([...desiredCounts.keys()]);
		const cardsBySlug = new Map(cards.map((card) => [card.slug, card]));
		const missingCardId = [...desiredCounts.keys()].find((cardId) => !cardsBySlug.has(cardId));

		if (missingCardId) {
			throw new Error(`Unknown starter card: ${missingCardId}`);
		}

		const existingCards = await this.playerCardRepository.findManyByPlayerId(playerId);
		const existingBySlug = new Map(existingCards.map((playerCard) => [playerCard.card.slug, playerCard]));

		for (const [cardId, quantity] of desiredCounts.entries()) {
			const existing = existingBySlug.get(cardId);
			if ((existing?.quantity ?? 0) >= quantity) {
				continue;
			}

			const card = cardsBySlug.get(cardId);
			if (!card) {
				throw new Error(`Unknown starter card: ${cardId}`);
			}

			await this.playerCardRepository.upsertQuantity(playerId, card.id, quantity);
		}
	}

	async assertHasCards(playerId: number, cardIds: string[]): Promise<void> {
		const requiredCounts = countCardIds(cardIds);
		const ownedCards = await this.playerCardRepository.findManyByPlayerId(playerId);
		const ownedBySlug = new Map(ownedCards.map((playerCard) => [playerCard.card.slug, playerCard]));
		const missingCardId = [...requiredCounts.entries()].find(([cardId, quantity]) => {
			return (ownedBySlug.get(cardId)?.quantity ?? 0) < quantity;
		})?.[0];

		if (!missingCardId) {
			return;
		}

		const card = ownedBySlug.get(missingCardId)?.card;
		throw new Error(
			`Недостаточно копий карты: ${card?.name ?? missingCardId}.`
		);
	}
}

function countCardIds(cardIds: string[]): Map<string, number> {
	const counts = new Map<string, number>();

	for (const cardId of cardIds) {
		counts.set(cardId, (counts.get(cardId) ?? 0) + 1);
	}

	return counts;
}
