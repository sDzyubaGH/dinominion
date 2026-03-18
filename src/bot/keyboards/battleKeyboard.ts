import { InlineKeyboard } from 'grammy';
import { getAvailableActions } from '../../core/engine/gameEngine.js';
import type { CardDefinition } from '../../core/entities/Card.js';
import type { BattleState } from '../../core/types/BattleState.js';

export type BattleViewMode =
	| {
			type: 'default';
	  }
	| {
			type: 'hand';
	  }
	| {
			type: 'attackers';
	  }
	| {
			type: 'targets';
			attackerId: number;
	  };

export function createBattleKeyboard(
	state: BattleState,
	viewerId: number,
	mode: BattleViewMode,
	cardLookup: (cardId: string) => CardDefinition
): InlineKeyboard {
	const keyboard = new InlineKeyboard();
	const isCurrentPlayer = state.currentPlayerId === viewerId && state.status === 'active';

	if (mode.type === 'hand') {
		const player = state.players[viewerId];
		if (isCurrentPlayer) {
			for (const card of player?.hand ?? []) {
				const definition = cardLookup(card.cardId);
				keyboard.text(`${definition.name} (${definition.cost})`, `b:p:${card.instanceId}`).row();
			}
		}
		return keyboard.text('Назад', 'b:b');
	}

	if (mode.type === 'attackers') {
		const actions = getAvailableActions(state, viewerId, cardLookup);
		if (isCurrentPlayer) {
			for (const attackerId of actions.attackers) {
				const unit = state.players[viewerId]?.board.find(
					(card) => card.instanceId === attackerId
				);
				if (!unit) {
					continue;
				}
				keyboard.text(cardLookup(unit.cardId).name, `b:aa:${attackerId}`).row();
			}
		}
		return keyboard.text('Назад', 'b:b');
	}

	if (mode.type === 'targets') {
		if (!isCurrentPlayer) {
			return keyboard.text('Назад', 'b:b');
		}

		const actions = getAvailableActions(state, viewerId, cardLookup);
		const targets = actions.targetsByAttacker[mode.attackerId] ?? [];
		const opponentId = Object.keys(state.players).find(
			(playerId) => Number(playerId) !== viewerId
		);
		const opponentBoard = opponentId ? state.players[Number(opponentId)].board : [];

		for (const target of targets) {
			if (target.type === 'hero') {
				keyboard.text('Герой противника', `b:th:${mode.attackerId}`).row();
				continue;
			}

			const unit = opponentBoard.find((card) => card.instanceId === target.unitId);
			if (!unit) {
				continue;
			}
			keyboard
				.text(cardLookup(unit.cardId).name, `b:tu:${mode.attackerId}:${unit.instanceId}`)
				.row();
		}

		return keyboard.text('Назад', 'b:a');
	}

	keyboard.text('Посмотреть руку', 'b:h').row();
	if (isCurrentPlayer) {
		keyboard.text('Атаковать', 'b:a').row();
		keyboard.text('Завершить ход', 'b:e').row();
	}

	return keyboard;
}
