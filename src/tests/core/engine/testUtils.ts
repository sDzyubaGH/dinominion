import { STARTER_CARDS } from '../../../../cards/starterCards.js';
import { createCardLookup } from '../../../core/cardCatalog.js';
import { createInitialBattleState } from '../../../core/engine/gameEngine.js';
import type { BattleState } from '../../../core/types/BattleState.js';

export const testCardLookup = createCardLookup(STARTER_CARDS);

export function createTestBattleState(params?: {
	player1Deck?: string[];
	player2Deck?: string[];
	startingPlayerId?: number;
}): BattleState {
	return createInitialBattleState({
		battleId: 1,
		player1Id: 1,
		player2Id: 2,
		player1Deck: params?.player1Deck ?? ['forest-raptor', 'alpha-raptor', 'ancient-egg', 'marsh-hunter'],
		player2Deck: params?.player2Deck ?? ['horned-guardian', 'ridge-triceratops', 'marsh-hunter', 'cliff-stalker'],
		startingPlayerId: params?.startingPlayerId ?? 1,
		cardLookup: testCardLookup
	});
}

export function findHandCardInstanceId(state: BattleState, playerId: number, cardId: string): number {
	const card = state.players[playerId]?.hand.find((item) => item.cardId === cardId);
	if (!card) {
		throw new Error(`Card ${cardId} not found in player ${playerId} hand.`);
	}
	return card.instanceId;
}

export function findBoardUnitInstanceId(state: BattleState, playerId: number, cardId: string): number {
	const unit = state.players[playerId]?.board.find((item) => item.cardId === cardId);
	if (!unit) {
		throw new Error(`Card ${cardId} not found on player ${playerId} board.`);
	}
	return unit.instanceId;
}
