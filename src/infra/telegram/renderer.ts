import type { Player } from '@prisma/client';
import { getAvailableActions } from '../../core/engine/gameEngine.js';
import { getUnitAttack, getUnitCurrentHealth, hasAbility } from '../../core/engine/rules.js';
import type { CardDefinition } from '../../core/entities/Card.js';
import type { BattleState } from '../../core/types/BattleState.js';

function displayName(player: Player): string {
	return player.username ? `@${player.username}` : `tg:${player.telegramId.toString()}`;
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
		`Событие: ${state.log[0] ?? 'Бой начался.'}`,
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
