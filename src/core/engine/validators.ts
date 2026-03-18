import type { CardDefinition } from '../entities/Card.js';
import type { BattleState } from '../types/BattleState.js';
import type { GameAction } from '../types/GameAction.js';
import { MAX_BOARD_SIZE, getOpponent, hasAbility, hasGuardOnBoard } from './rules.js';

export function validateAction(
	state: BattleState,
	action: GameAction,
	cardLookup: (cardId: string) => CardDefinition
): string | null {
	if (state.status !== 'active') {
		return 'Бой уже завершен.';
	}

	const player = state.players[action.playerId];
	if (!player) {
		return 'Игрок не участвует в этом бою.';
	}

	if (state.currentPlayerId !== action.playerId) {
		return 'Сейчас не ваш ход.';
	}

	if (action.type === 'play_card') {
		const handCard = player.hand.find((card) => card.instanceId === action.cardInstanceId);
		if (!handCard) {
			return 'Карта не найдена в руке.';
		}

		const definition = cardLookup(handCard.cardId);
		if (player.energy < definition.cost) {
			return 'Недостаточно энергии.';
		}
		if (player.board.length >= MAX_BOARD_SIZE) {
			return 'Поле заполнено.';
		}
	}

	if (action.type === 'attack') {
		const attacker = player.board.find((unit) => unit.instanceId === action.attackerId);
		if (!attacker) {
			return 'Атакующий не найден.';
		}
		if (!attacker.canAttack) {
			return 'Этот динозавр сейчас не может атаковать.';
		}

		const opponent = getOpponent(state, action.playerId);
		const guards = opponent.board.filter((unit) => hasAbility(cardLookup(unit.cardId), 'guard'));

		if (action.target.type === 'hero' && guards.length > 0) {
			return 'Сначала нужно атаковать существ с охраной.';
		}

		if (action.target.type === 'unit') {
			const targetUnitId = action.target.unitId;
			const target = opponent.board.find((unit) => unit.instanceId === targetUnitId);
			if (!target) {
				return 'Цель не найдена.';
			}
			if (
				hasGuardOnBoard(opponent.board, cardLookup) &&
				!guards.some((unit) => unit.instanceId === target.instanceId)
			) {
				return 'Сначала нужно атаковать существ с охраной.';
			}
		}
	}

	return null;
}
