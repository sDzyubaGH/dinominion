import { InlineKeyboard } from 'grammy';
import {
	attackTarget,
	endTurn,
	evolveCard,
	getActivePlayer,
	getEffectiveAttack,
	getOpponent,
	getPlayer,
	playCard,
	setPendingAttack,
	type MatchState,
	mustCard
} from './gameEngine.js';
import type { CardInstance } from './card.js';

export function renderBattlefield(match: MatchState): string {
	const active = getActivePlayer(match);
	const opponent = getOpponent(match, active.id)!;

	const lines = [
		`Dinominion`,
		`Ход ${match.turn}`,
		'',
		`Противник: ${opponent.displayName} | Здоровье ${opponent.health} | Энергия ${opponent.energy}/${opponent.maxEnergy}`,
		boardLine(opponent.board, opponent),
		'',
		`Активная сторона: ${active.displayName} | Здоровье ${active.health} | Энергия ${active.energy}/${active.maxEnergy}`,
		boardLine(active.board, active),
		'',
		`Рука: ${active.hand.length} карт`,
		`Рука противника: ${opponent.hand.length} карт`,
		'',
		`Активный игрок: ${active.displayName}`,
		match.pendingAttack
			? 'Выберите цель для атаки ниже.'
			: match.pendingPlay
				? 'Выберите цель для мутации ниже.'
				: 'Выберите действие ниже.',
		'',
		'Последние события:',
		...match.log.slice(0, 5).map((entry) => `- ${entry}`)
	];

	if (match.winnerId) {
		const winner = match.players.find((player) => player.id === match.winnerId);
		lines.push('', `Победитель: ${winner?.displayName ?? 'Неизвестно'}`);
	}

	return lines.join('\n');
}

function boardLine(board: CardInstance[], owner: MatchState['players'][number]): string {
	if (board.length === 0) {
		return 'Поле: пусто';
	}
	return `Поле: ${board
		.map((card, index) => {
			const definition = mustCard(card.definitionId);
			const extra =
				definition.ability === 'egg' && card.hatchIn !== undefined
					? ` Яйцо(${card.hatchIn})`
					: definition.ability === 'taunt'
						? ' Провокация'
						: '';
			const effectiveAttack = getEffectiveAttack(owner, card);
			return `${index + 1}. ${definition.name} ${effectiveAttack}/${card.health}${extra}`;
		})
		.join(' | ')}`;
}

export function buildBattleKeyboard(match: MatchState, viewerId: number): InlineKeyboard {
	const keyboard = new InlineKeyboard();
	const active = getActivePlayer(match);
	const player = getPlayer(match, viewerId);
	const opponent = getOpponent(match, viewerId);

	if (!player || !opponent) {
		return keyboard.text('Нет активного матча', 'noop');
	}

	if (match.winnerId) {
		return keyboard.text('Матч завершен', 'noop');
	}

	if (active.id !== viewerId) {
		return keyboard.text('Ожидание соперника', 'noop');
	}

	if (match.pendingPlay) {
		for (const target of player.board) {
			keyboard
				.text(
					`Мутировать ${mustCard(target.definitionId).name}`,
					action('play', player.id, match.pendingPlay.cardId, target.instanceId)
				)
				.row();
		}
		return keyboard.text('Отмена', action('cancel', player.id));
	}

	if (match.pendingAttack) {
		const taunts = opponent.board.filter(
			(card) => mustCard(card.definitionId).ability === 'taunt'
		);
		const attacker = player.board.find(
			(card) => card.instanceId === match.pendingAttack?.attackerId
		);
		const attackerDef = attacker ? mustCard(attacker.definitionId) : undefined;

		for (const defender of opponent.board) {
			if (
				taunts.length > 0 &&
				!taunts.some((card) => card.instanceId === defender.instanceId)
			) {
				continue;
			}
			keyboard
				.text(
					`Атаковать ${mustCard(defender.definitionId).name}`,
					action('target', player.id, defender.instanceId)
				)
				.row();
		}

		if (taunts.length === 0 || attackerDef?.ability === 'direct_strike') {
			keyboard.text('Атаковать командира', action('target', player.id, 'hero')).row();
		}
		return keyboard.text('Отмена', action('cancel', player.id));
	}

	for (const card of player.hand) {
		const definition = mustCard(card.definitionId);
		const label = `Сыграть ${definition.name} (${definition.energyCost})`;
		keyboard.text(label, action('play', player.id, card.instanceId)).row();
	}

	for (const card of player.board) {
		const definition = mustCard(card.definitionId);
		if (card.canAttack && !card.hasAttacked && definition.ability !== 'egg') {
			keyboard
				.text(`Атаковать ${definition.name}`, action('attack', player.id, card.instanceId))
				.row();
		}
		if (definition.ability === 'evolve') {
			keyboard
				.text(`Эволюция ${definition.name}`, action('evolve', player.id, card.instanceId))
				.row();
		}
	}

	keyboard.text('Завершить ход', action('end', player.id));
	return keyboard;
}

function action(kind: string, playerId: number, value?: string, extra?: string): string {
	return ['battle', kind, playerId, value ?? '', extra ?? ''].join(':');
}

export function handleBattleAction(match: MatchState, actorId: number, payload: string[]): string {
	const [, kind, playerIdRaw, value, extra] = payload;
	const ownerId = Number(playerIdRaw);

	if (ownerId !== actorId) {
		return 'Этими кнопками может пользоваться только активный игрок.';
	}

	switch (kind) {
		case 'play':
			return playCard(match, actorId, value, extra).message;
		case 'attack':
			return setPendingAttack(match, actorId, value).message;
		case 'target':
			return attackTarget(match, actorId, value).message;
		case 'evolve':
			return evolveCard(match, actorId, value).message;
		case 'end':
			return endTurn(match, actorId).message;
		case 'cancel':
			match.pendingAttack = undefined;
			match.pendingPlay = undefined;
			return 'Выбор сброшен.';
		default:
			return 'Неизвестное действие.';
	}
}
