import type { CardDefinition, CardInstance } from './card.js';
import type { PlayerState, RegisteredPlayer } from './player.js';
import { CARD_MAP } from '../cards/cards.js';

export interface MatchState {
	id: string;
	chatId: number;
	players: [PlayerState, PlayerState];
	activePlayerIndex: 0 | 1;
	turn: number;
	winnerId?: number;
	battleMessageId?: number;
	log: string[];
	pendingAttack?: {
		attackerId: string;
	};
	pendingPlay?: {
		cardId: string;
		cardType: 'mutation';
	};
}

export interface EngineResult {
	ok: boolean;
	message: string;
}

const BOARD_LIMIT = 5;
const STARTING_HEALTH = 30;
const STARTING_HAND = 3;
const MAX_ENERGY = 10;

let instanceCounter = 1;

export function createMatch(
	chatId: number,
	left: RegisteredPlayer,
	right: RegisteredPlayer
): MatchState {
	// Каждый матч хранит собственные копии колоды и состояния поля, чтобы прототип работал полностью в памяти.
	const players: [PlayerState, PlayerState] = [buildPlayerState(left), buildPlayerState(right)];

	const match: MatchState = {
		id: `match-${chatId}-${Date.now()}`,
		chatId,
		players,
		activePlayerIndex: 0,
		turn: 1,
		log: [
			`${players[0].displayName} сражается против ${players[1].displayName}.`,
			`${players[0].displayName} ходит первым.`
		]
	};

	for (const player of match.players) {
		for (let i = 0; i < STARTING_HAND; i += 1) {
			drawCard(player);
		}
	}

	startTurn(match, 0);
	return match;
}

function buildPlayerState(player: RegisteredPlayer): PlayerState {
	const deck = shuffle(player.deck).map((definitionId) =>
		createCardInstance(definitionId, player.id)
	);
	return {
		id: player.id,
		username: player.username,
		displayName: player.displayName,
		health: STARTING_HEALTH,
		maxEnergy: 0,
		energy: 0,
		deck,
		hand: [],
		board: [],
		discard: []
	};
}

function shuffle<T>(items: T[]): T[] {
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
}

function createCardInstance(definitionId: string, ownerId: number): CardInstance {
	const definition = mustCard(definitionId);
	return {
		instanceId: `card-${instanceCounter++}`,
		definitionId,
		ownerId,
		attack: definition.attack,
		health: definition.health,
		maxHealth: definition.health,
		canAttack: false,
		hasAttacked: false,
		turnsInPlay: 0,
		hatchIn: definition.hatchTurns
	};
}

export function getPlayer(match: MatchState, playerId: number): PlayerState | undefined {
	return match.players.find((player) => player.id === playerId);
}

export function getOpponent(match: MatchState, playerId: number): PlayerState | undefined {
	return match.players.find((player) => player.id !== playerId);
}

export function getActivePlayer(match: MatchState): PlayerState {
	return match.players[match.activePlayerIndex];
}

export function drawCard(player: PlayerState): CardInstance | undefined {
	const card = player.deck.shift();
	if (!card) {
		return undefined;
	}
	player.hand.push(card);
	return card;
}

export function startTurn(match: MatchState, playerIndex: 0 | 1): void {
	const player = match.players[playerIndex];
	const opponent = match.players[playerIndex === 0 ? 1 : 0];

	match.activePlayerIndex = playerIndex;
	match.pendingAttack = undefined;
	match.pendingPlay = undefined;

	player.maxEnergy = Math.min(MAX_ENERGY, player.maxEnergy + 1);
	player.energy = player.maxEnergy;
	drawCard(player);

	for (const card of player.board) {
		const definition = mustCard(card.definitionId);
		card.turnsInPlay += 1;
		card.hasAttacked = false;
		// Динозавры просыпаются в начале хода владельца, а яйца остаются неактивными.
		card.canAttack = definition.ability !== 'egg';
	}

	resolveEggs(match, player, opponent);
}

function resolveEggs(match: MatchState, player: PlayerState, opponent: PlayerState): void {
	// Таймер яйца уменьшается только на ходах владельца, после чего оно заменяется вылупившимся динозавром.
	for (const card of [...player.board]) {
		const definition = mustCard(card.definitionId);
		if (definition.ability !== 'egg' || card.hatchIn === undefined) {
			continue;
		}
		card.hatchIn -= 1;
		if (card.hatchIn <= 0 && definition.hatchesInto) {
			const index = player.board.findIndex(
				(boardCard) => boardCard.instanceId === card.instanceId
			);
			if (index >= 0) {
				const hatched = createCardInstance(definition.hatchesInto, player.id);
				hatched.canAttack = false;
				hatched.turnsInPlay = 0;
				player.board.splice(index, 1, hatched);
				match.log.unshift(
					`У ${player.displayName} ${definition.name} вылупляется в ${mustCard(hatched.definitionId).name}.`
				);
			}
		}
	}

	// Оставляем сигнатуру симметричной для возможных будущих эффектов.
	void opponent;
}

export function endTurn(match: MatchState, playerId: number): EngineResult {
	const player = getPlayer(match, playerId);
	if (!player) {
		return { ok: false, message: 'Игрок не участвует в этом матче.' };
	}
	if (getActivePlayer(match).id !== playerId) {
		return { ok: false, message: 'Сейчас не ваш ход.' };
	}

	resolveEndTurnEffects(match, player);
	if (match.winnerId) {
		return { ok: true, message: 'Матч уже завершен.' };
	}

	const nextIndex = match.activePlayerIndex === 0 ? 1 : 0;
	match.turn += 1;
	startTurn(match, nextIndex);
	match.log.unshift(`${match.players[nextIndex].displayName} начинает ход ${match.turn}.`);
	return { ok: true, message: 'Ход завершен.' };
}

function resolveEndTurnEffects(match: MatchState, player: PlayerState): void {
	for (const card of player.board) {
		const definition = mustCard(card.definitionId);
		if (definition.ability === 'end_turn_heal_1') {
			player.health = Math.min(STARTING_HEALTH, player.health + 1);
			match.log.unshift(`${definition.name} лечит ${player.displayName} на 1 здоровье.`);
		}
	}
}

export function playCard(
	match: MatchState,
	playerId: number,
	cardInstanceId: string,
	targetId?: string
): EngineResult {
	const player = getPlayer(match, playerId);
	const opponent = getOpponent(match, playerId);
	if (!player || !opponent) {
		return { ok: false, message: 'Не удалось найти игроков матча.' };
	}
	if (getActivePlayer(match).id !== playerId) {
		return { ok: false, message: 'Сейчас не ваш ход.' };
	}

	const handIndex = player.hand.findIndex((card) => card.instanceId === cardInstanceId);
	if (handIndex < 0) {
		return { ok: false, message: 'Этой карты нет у вас в руке.' };
	}

	const card = player.hand[handIndex];
	const definition = mustCard(card.definitionId);

	if (player.energy < definition.energyCost) {
		return { ok: false, message: 'Недостаточно энергии.' };
	}

	if (definition.type === 'dinosaur' && player.board.length >= BOARD_LIMIT) {
		return { ok: false, message: 'Ваша сторона поля заполнена.' };
	}

	if (definition.type === 'mutation') {
		// Мутации разыгрываются в два шага: сначала выбирается карта, затем союзная цель.
		if (!targetId) {
			match.pendingPlay = { cardId: cardInstanceId, cardType: 'mutation' };
			return { ok: true, message: 'Выберите своего динозавра для мутации.' };
		}
		const target = player.board.find((boardCard) => boardCard.instanceId === targetId);
		if (!target) {
			return { ok: false, message: 'Нельзя применить мутацию к этой цели.' };
		}
		player.energy -= definition.energyCost;
		player.hand.splice(handIndex, 1);
		applyMutation(match, player, card, target);
		player.discard.push(card);
		match.pendingPlay = undefined;
		cleanupDeaths(match);
		return { ok: true, message: `Карта ${definition.name} применена.` };
	}

	player.energy -= definition.energyCost;
	player.hand.splice(handIndex, 1);

	if (definition.type === 'catastrophe') {
		applyCatastrophe(match, player, opponent, card);
		player.discard.push(card);
		cleanupDeaths(match);
		return { ok: true, message: `${definition.name} обрушивается на поле боя.` };
	}

	const summon = { ...card, canAttack: false, hasAttacked: false, turnsInPlay: 0 };
	player.board.push(summon);
	match.log.unshift(`${player.displayName} разыгрывает ${definition.name}.`);
	applyOnPlayEffects(match, player, opponent, summon);
	cleanupDeaths(match);
	return { ok: true, message: `${definition.name} выходит на поле.` };
}

function applyOnPlayEffects(
	match: MatchState,
	player: PlayerState,
	opponent: PlayerState,
	card: CardInstance
): void {
	const definition = mustCard(card.definitionId);
	if (definition.ability === 'battlecry_face_2') {
		opponent.health -= 2;
		match.log.unshift(`${definition.name} рычит и наносит 2 урона.`);
	}
	if (definition.ability === 'battlecry_ping_enemy_minion') {
		const target = opponent.board[0];
		if (target) {
			target.health -= 1;
			match.log.unshift(
				`${definition.name} наносит 1 урон по ${mustCard(target.definitionId).name}.`
			);
		}
	}
	updateWinner(match);
}

function applyMutation(
	match: MatchState,
	player: PlayerState,
	mutation: CardInstance,
	target: CardInstance
): void {
	target.attack += 2;
	target.health += 2;
	target.maxHealth += 2;
	match.log.unshift(
		`${player.displayName} применяет ${mustCard(mutation.definitionId).name} на ${mustCard(target.definitionId).name}.`
	);
}

function applyCatastrophe(
	match: MatchState,
	player: PlayerState,
	opponent: PlayerState,
	catastrophe: CardInstance
): void {
	for (const card of [...player.board, ...opponent.board]) {
		card.health -= 2;
	}
	match.log.unshift(`${player.displayName} вызывает ${mustCard(catastrophe.definitionId).name}.`);
}

export function setPendingAttack(
	match: MatchState,
	playerId: number,
	attackerId: string
): EngineResult {
	const player = getPlayer(match, playerId);
	if (!player) {
		return { ok: false, message: 'Игрок не найден.' };
	}
	if (getActivePlayer(match).id !== playerId) {
		return { ok: false, message: 'Сейчас не ваш ход.' };
	}
	const attacker = player.board.find((card) => card.instanceId === attackerId);
	if (!attacker) {
		return { ok: false, message: 'Атакующий не найден.' };
	}
	const definition = mustCard(attacker.definitionId);
	if (!attacker.canAttack || attacker.hasAttacked || definition.ability === 'egg') {
		return { ok: false, message: 'Этот динозавр сейчас не может атаковать.' };
	}
	match.pendingAttack = { attackerId };
	return { ok: true, message: 'Выберите цель.' };
}

export function attackTarget(match: MatchState, playerId: number, targetId: string): EngineResult {
	const player = getPlayer(match, playerId);
	const opponent = getOpponent(match, playerId);
	if (!player || !opponent) {
		return { ok: false, message: 'Не удалось найти игроков матча.' };
	}
	if (getActivePlayer(match).id !== playerId) {
		return { ok: false, message: 'Сейчас не ваш ход.' };
	}
	if (!match.pendingAttack) {
		return { ok: false, message: 'Сначала выберите атакующего.' };
	}

	const attacker = player.board.find(
		(card) => card.instanceId === match.pendingAttack?.attackerId
	);
	if (!attacker) {
		match.pendingAttack = undefined;
		return { ok: false, message: 'Атакующий уже исчез с поля.' };
	}

	const attackerDefinition = mustCard(attacker.definitionId);
	const taunts = opponent.board.filter((card) => mustCard(card.definitionId).ability === 'taunt');
	const attackingFace = targetId === 'hero';

	if (attackingFace) {
		// Летуны с прямым ударом могут обойти защитников, остальные обязаны учитывать провокацию.
		if (taunts.length > 0 && attackerDefinition.ability !== 'direct_strike') {
			return { ok: false, message: 'Путь преграждает динозавр с провокацией.' };
		}
		opponent.health -= getEffectiveAttack(player, attacker);
		attacker.hasAttacked = true;
		attacker.canAttack = false;
		match.log.unshift(
			`${mustCard(attacker.definitionId).name} кусает вражеского командира на ${getEffectiveAttack(player, attacker)}.`
		);
		match.pendingAttack = undefined;
		updateWinner(match);
		return { ok: true, message: 'Атака выполнена.' };
	}

	const defender = opponent.board.find((card) => card.instanceId === targetId);
	if (!defender) {
		return { ok: false, message: 'Цель не найдена.' };
	}
	if (taunts.length > 0 && !taunts.some((card) => card.instanceId === defender.instanceId)) {
		return { ok: false, message: 'Сначала нужно атаковать динозавра с провокацией.' };
	}

	const attackerDamage = getEffectiveAttack(player, attacker);
	const defenderDamage = getEffectiveAttack(opponent, defender);
	defender.health -= attackerDamage;
	attacker.health -= defenderDamage;
	attacker.hasAttacked = true;
	attacker.canAttack = false;
	match.log.unshift(
		`${mustCard(attacker.definitionId).name} атакует ${mustCard(defender.definitionId).name}.`
	);
	match.pendingAttack = undefined;
	cleanupDeaths(match);
	return { ok: true, message: 'Атака выполнена.' };
}

export function evolveCard(
	match: MatchState,
	playerId: number,
	cardInstanceId: string
): EngineResult {
	const player = getPlayer(match, playerId);
	if (!player) {
		return { ok: false, message: 'Игрок не найден.' };
	}
	if (getActivePlayer(match).id !== playerId) {
		return { ok: false, message: 'Сейчас не ваш ход.' };
	}
	const target = player.board.find((card) => card.instanceId === cardInstanceId);
	if (!target) {
		return { ok: false, message: 'Этого динозавра нет на вашем поле.' };
	}

	const definition = mustCard(target.definitionId);
	if (
		definition.ability !== 'evolve' ||
		!definition.evolvesTo ||
		definition.evolveCost === undefined
	) {
		return { ok: false, message: 'Этот динозавр не может эволюционировать.' };
	}
	if (player.energy < definition.evolveCost) {
		return { ok: false, message: 'Недостаточно энергии для эволюции.' };
	}

	const next = mustCard(definition.evolvesTo);
	player.energy -= definition.evolveCost;
	target.definitionId = next.id;
	target.attack = next.attack;
	target.health = Math.min(
		next.health,
		Math.max(1, target.health + (next.health - definition.health))
	);
	target.maxHealth = next.health;
	target.canAttack = false;
	target.hasAttacked = true;
	target.evolvedFrom = definition.id;
	match.log.unshift(`${definition.name} у ${player.displayName} эволюционирует в ${next.name}.`);
	return { ok: true, message: `${next.name} появляется на поле.` };
}

function cleanupDeaths(match: MatchState): void {
	for (const player of match.players) {
		const survivors: CardInstance[] = [];
		for (const card of player.board) {
			if (card.health > 0) {
				survivors.push(card);
			} else {
				player.discard.push(card);
				match.log.unshift(`${mustCard(card.definitionId).name} погибает.`);
			}
		}
		player.board = survivors;
	}
	updateWinner(match);
}

function updateWinner(match: MatchState): void {
	const loser = match.players.find((player) => player.health <= 0);
	if (!loser) {
		return;
	}
	const winner = match.players.find((player) => player.id !== loser.id);
	match.winnerId = winner?.id;
	if (winner) {
		match.log.unshift(`${winner.displayName} побеждает в матче.`);
	}
}

export function getEffectiveAttack(owner: PlayerState, card: CardInstance): number {
	const definition = mustCard(card.definitionId);
	let attack = card.attack;

	if (definition.ability === 'pack_fury' && definition.species) {
		// Бонус стаи считается на лету, поэтому он сам исчезает, если стая распадается.
		const allies = owner.board.filter(
			(ally) => mustCard(ally.definitionId).species === definition.species
		);
		if (allies.length >= 2) {
			attack += 1;
		}
	}

	return attack;
}

export function mustCard(cardId: string): CardDefinition {
	const definition = CARD_MAP.get(cardId);
	if (!definition) {
		throw new Error(`Неизвестная карта: ${cardId}`);
	}
	return definition;
}
