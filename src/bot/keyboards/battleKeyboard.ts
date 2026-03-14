import { InlineKeyboard } from 'grammy';
import { getAvailableActions } from '../../domain/engine/gameEngine.js';
import type { BattleState } from '../../domain/types/BattleState.js';
import { STARTER_CARD_MAP } from '../../../cards/starterCards.js';

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
			attackerId: string;
	  };

export function createBattleKeyboard(
	state: BattleState,
	viewerId: string,
	mode: BattleViewMode
): InlineKeyboard {
	const keyboard = new InlineKeyboard();
	const battleId = state.battleId;
	const isCurrentPlayer = state.currentPlayerId === viewerId && state.status === 'active';

	if (mode.type === 'hand') {
		const player = state.players[viewerId];
		if (isCurrentPlayer) {
			for (const card of player?.hand ?? []) {
				const definition = STARTER_CARD_MAP.get(card.cardId);
				if (!definition) {
					continue;
				}
				keyboard
					.text(
						`${definition.name} (${definition.cost})`,
						`battle:${battleId}:play:${card.instanceId}`
					)
					.row();
			}
		}
		return keyboard
			.text('Назад', `battle:${battleId}:back`)
			.text('Обновить бой', `battle:${battleId}:refresh`);
	}

	if (mode.type === 'attackers') {
		const actions = getAvailableActions(state, viewerId, mustCard);
		if (isCurrentPlayer) {
			for (const attackerId of actions.attackers) {
				const unit = state.players[viewerId]?.board.find(
					(card) => card.instanceId === attackerId
				);
				if (!unit) {
					continue;
				}
				keyboard
					.text(mustCard(unit.cardId).name, `battle:${battleId}:attacker:${attackerId}`)
					.row();
			}
		}
		return keyboard
			.text('Назад', `battle:${battleId}:back`)
			.text('Обновить бой', `battle:${battleId}:refresh`);
	}

	if (mode.type === 'targets') {
		if (!isCurrentPlayer) {
			return keyboard
				.text('Назад', `battle:${battleId}:back`)
				.text('Обновить бой', `battle:${battleId}:refresh`);
		}

		const actions = getAvailableActions(state, viewerId, mustCard);
		const targets = actions.targetsByAttacker[mode.attackerId] ?? [];
		const opponentId = Object.keys(state.players).find((playerId) => playerId !== viewerId);
		const opponentBoard = opponentId ? state.players[opponentId].board : [];

		for (const target of targets) {
			if (target.type === 'hero') {
				keyboard
					.text('Герой противника', `battle:${battleId}:target:hero:${mode.attackerId}`)
					.row();
				continue;
			}

			const unit = opponentBoard.find((card) => card.instanceId === target.unitId);
			if (!unit) {
				continue;
			}
			keyboard
				.text(
					mustCard(unit.cardId).name,
					`battle:${battleId}:target:unit:${mode.attackerId}:${unit.instanceId}`
				)
				.row();
		}

		return keyboard
			.text('Назад', `battle:${battleId}:attack`)
			.text('Обновить бой', `battle:${battleId}:refresh`);
	}

	keyboard.text('Посмотреть руку', `battle:${battleId}:hand`).row();
	if (isCurrentPlayer) {
		keyboard.text('Атаковать', `battle:${battleId}:attack`).row();
		keyboard.text('Завершить ход', `battle:${battleId}:end`).row();
	}
	keyboard.text('Обновить бой', `battle:${battleId}:refresh`);

	return keyboard;
}

function mustCard(cardId: string) {
	const card = STARTER_CARD_MAP.get(cardId);
	if (!card) {
		throw new Error(`Unknown card: ${cardId}`);
	}
	return card;
}
