import type { CardDefinition } from './entities/Card.js';
import type { BattleState } from './types/BattleState.js';

export function createCardLookup(cards: CardDefinition[]): (cardId: string) => CardDefinition {
	const cardMap = new Map(cards.map((card) => [card.id, card]));

	return (cardId: string) => {
		const card = cardMap.get(cardId);
		if (!card) {
			throw new Error(`Unknown card: ${cardId}`);
		}
		return card;
	};
}

export function collectBattleCardIds(state: BattleState): string[] {
	const ids = new Set<string>();

	for (const player of Object.values(state.players)) {
		for (const cardId of player.deck) {
			ids.add(cardId);
		}

		for (const card of player.hand) {
			ids.add(card.cardId);
		}

		for (const unit of player.board) {
			ids.add(unit.cardId);
			for (const effect of unit.effects ?? []) {
				if (effect.type === 'hatch') {
					ids.add(effect.into);
				}
			}
		}
	}

	return [...ids];
}
