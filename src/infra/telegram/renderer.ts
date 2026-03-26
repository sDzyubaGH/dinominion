import type { Player } from '@prisma/client';
import { getAvailableActions } from '../../core/engine/gameEngine.js';
import { getUnitAttack, getUnitCurrentHealth, hasAbility } from '../../core/engine/rules.js';
import type { CardDefinition } from '../../core/entities/Card.js';
import type { BattleState } from '../../core/types/BattleState.js';

function displayName(player: Player): string {
	return player.username ? `@${player.username}` : `tg:${player.telegramId.toString()}`;
}

export function renderRecentEvents(state: BattleState, limit = 2): string {
	const safeLimit = Math.max(1, limit)
	const recent = state.log.slice(0, safeLimit);

	if (recent.length === 0) {
		return '• Бой начался.'
	}

	return recent.map((event) => `${event}`).join('\n')
}

export function renderBattleLogPage(state: BattleState, page: number, pageSize = 15): string {
	const safePageSize = Math.max(1, pageSize);
	const totalEvents = state.log.length;
	const totalPages = Math.max(1, Math.ceil(totalEvents / safePageSize));
	const safePage = Math.min(Math.max(0, page), totalPages - 1);

	const start = safePage * safePageSize;
	const end = start + safePageSize;
	const events = state.log.slice(start, end);

	const lines = ['Ход боя', `Страница ${safePage + 1}/${totalPages}`, ''];

	if (events.length === 0) {
		lines.push('Лог пуст.');
	} else {
		for (const [index, event] of events.entries()) {
			lines.push(`${start + index + 1}. ${event}`);
		}
	}

	return lines.join('\n');
}

export function renderBattleText(
	state: BattleState,
	player1: Player,
	player2: Player,
	cardLookup: (cardId: string) => CardDefinition
): string {
	const currentPlayer = state.players[state.currentPlayerId];
	const first = state.players[player1.id];
	const second = state.players[player2.id];
	const winnerPlayer =
		state.winnerId === player1.id ? player1 : state.winnerId === player2.id ? player2 : null;

	return [
		'🦖 Dino Clash',
		'',
		`Ход: ${displayName(currentPlayer.id === player1.id ? player1 : player2)}`,
		`Энергия: ${currentPlayer.energy}/${currentPlayer.maxEnergy}`,
		'',
		renderParticipant(first, player1, cardLookup),
		'',
		renderParticipant(second, player2, cardLookup),
		'',
		'Последние события:',
		renderRecentEvents(state, 2),
		state.status === 'finished' && winnerPlayer
			? `Победитель: ${displayName(winnerPlayer)}`
			: ''
	].join('\n');
}

export function renderHandText(
	state: BattleState,
	viewerId: number,
	cardLookup: (cardId: string) => CardDefinition
): string {
	const player = state.players[viewerId];
	const lines = [`Рука: ${player.hand.length} карт`];

	for (const [index, card] of player.hand.entries()) {
		const definition = cardLookup(card.cardId);
		lines.push(
			`${index + 1}. ${definition.name} | Стоимость ${definition.cost} | ${definition.attack}/${definition.health}${
				definition.abilityText ? ` | ${definition.abilityText}` : ''
			}`
		);
	}

	return lines.join('\n');
}

export function renderActionSummary(
	state: BattleState,
	viewerId: number,
	cardLookup: (cardId: string) => CardDefinition
): string {
	const available = getAvailableActions(state, viewerId, cardLookup);
	return [
		`Можно сыграть карт: ${available.playableCardIds.length}`,
		`Готовых атакующих: ${available.attackers.length}`,
		available.canEndTurn ? 'Ход можно завершить' : 'Ожидание хода соперника'
	].join('\n');
}

function renderParticipant(
	participant: BattleState['players'][number],
	player: Player,
	cardLookup: (cardId: string) => CardDefinition
): string {
	return [
		displayName(player),
		`❤️ ${participant.health} HP`,
		'Поле:',
		participant.board.length === 0
			? '- пусто'
			: participant.board
					.map((unit, index) => {
						const definition = cardLookup(unit.cardId);
						const hatchEffect = unit.effects?.find((effect) => effect.type === 'hatch');
						if (hatchEffect) {
							return `${index + 1}. ${definition.name} (вылупится через ${hatchEffect.turnsRemaining})`;
						}

						const attack = getUnitAttack(participant, unit, cardLookup);
						const health = getUnitCurrentHealth(definition, unit);
						const guard = hasAbility(definition, 'guard') ? ' [Охрана]' : '';
						return `${index + 1}. ${definition.name} ${attack}/${health}${guard}`;
					})
					.join('\n'),
		`Карт в руке: ${participant.hand.length}`
	].join('\n');
}
