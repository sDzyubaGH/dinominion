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
	  }
	| {
			type: 'play_targets';
			cardInstanceId: number;
	  }
	| {
			type: 'log';
			page: number;
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
				const actions = getAvailableActions(state, viewerId, cardLookup);
				const targetsForCard = actions.targetsByPlayableCardId[card.instanceId] ?? [];
				const isTargetedPlay = targetsForCard.length > 0;
				const definition = cardLookup(card.cardId);
				keyboard
					.text(
						`${definition.name} (${definition.cost})`,
						isTargetedPlay ? `b:pt:${card.instanceId}` : `b:p:${card.instanceId}`
					).row();
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

	if (mode.type === 'play_targets') {
		if (!isCurrentPlayer) {
			return keyboard.text('Назад', 'b:h');
		}
	
		const actions = getAvailableActions(state, viewerId, cardLookup);
		const targets = actions.targetsByPlayableCardId[mode.cardInstanceId] ?? [];
	
		for (const target of targets) {
			if (target.type === 'unit') {
				const opponentId = Object.keys(state.players).find((id) => Number(id) !== viewerId);
				const opponentBoard = opponentId ? state.players[Number(opponentId)].board : [];
				const unit = opponentBoard.find((u) => u.instanceId === target.unitId);
				if (!unit) continue;
	
				keyboard
					.text(cardLookup(unit.cardId).name, `b:pu:${mode.cardInstanceId}:${unit.instanceId}`)
					.row();
			}
		}
	
		return keyboard.text('Назад', 'b:h');
	}

	if (mode.type === 'log') {
		const totalEvents = state.log.length;
		const pageSize = 15;
		const totalPages = Math.max(1, Math.ceil(totalEvents / pageSize));
		const page = Math.min(Math.max(0, mode.page), totalPages - 1);

		if (page > 0) {
			keyboard.text('⬅️', `b:lp:${page}`).row();
		}
		if (page < totalPages - 1) {
			keyboard.text('➡️', `b:ln:${page}`).row();
		}

		return keyboard.text('Назад', 'b:b');
	}

	keyboard.text('Посмотреть руку', 'b:h').row();
	keyboard.text('Ход боя', 'b:l:0').row();
	if (isCurrentPlayer) {
		keyboard.text('Атаковать', 'b:a').row();
		keyboard.text('Завершить ход', 'b:e').row();
	}

	return keyboard;
}
