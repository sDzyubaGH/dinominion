import type { CardDefinition, HandCard, UnitEffectState, UnitState } from '../entities/Card.js';
import type { BattleParticipantState, BattleState } from '../types/BattleState.js';
import type { GameAction } from '../types/GameAction.js';
import {
	MAX_ENERGY,
	STARTING_HEALTH,
	getOpponent,
	getUnitAttack,
	getUnitCurrentHealth,
	hasAbility
} from './rules.js';
import { validateAction } from './validators.js';

interface InitialBattleInput {
	battleId: number;
	player1Id: number;
	player2Id: number;
	player1Deck: string[];
	player2Deck: string[];
	startingPlayerId: number;
	cardLookup: (cardId: string) => CardDefinition;
}

export interface EngineResult {
	ok: boolean;
	state: BattleState;
	error?: string;
}

export function createInitialBattleState(input: InitialBattleInput): BattleState {
	const state: BattleState = {
		battleId: input.battleId,
		turn: 1,
		currentPlayerId: input.startingPlayerId,
		status: 'active',
		nextCardInstanceId: 1,
		log: ['Бой начался.'],
		players: {
			[input.player1Id]: createParticipant(input.player1Id, input.player1Deck),
			[input.player2Id]: createParticipant(input.player2Id, input.player2Deck)
		}
	};

	drawCards(state, input.player1Id, 3);
	drawCards(state, input.player2Id, 4);
	startTurn(state, input.startingPlayerId, input.cardLookup);

	return state;
}

export function applyAction(
	state: BattleState,
	action: GameAction,
	cardLookup: (cardId: string) => CardDefinition
): EngineResult {
	const error = validateAction(state, action, cardLookup);
	if (error) {
		return { ok: false, state, error };
	}

	const nextState = cloneState(state);

	if (action.type === 'play_card') {
		applyPlayCard(nextState, action.playerId, action.cardInstanceId, cardLookup);
	}

	if (action.type === 'attack') {
		applyAttack(nextState, action.playerId, action.attackerId, action.target, cardLookup);
	}

	if (action.type === 'end_turn') {
		resolveEndTurn(nextState, cardLookup);
	}

	return { ok: true, state: nextState };
}

export function resolveEndTurn(
	state: BattleState,
	cardLookup: (cardId: string) => CardDefinition
): BattleState {
	const nextPlayerId = Object.keys(state.players).find(
		(playerId) => Number(playerId) !== state.currentPlayerId
	);
	if (!nextPlayerId) {
		throw new Error('Соперник не найден.');
	}

	state.currentPlayerId = Number(nextPlayerId);
	state.turn += 1;
	startTurn(state, Number(nextPlayerId), cardLookup);
	state.log.unshift(`Ход переходит к игроку ${Number(nextPlayerId)}.`);
	return state;
}

export function getAvailableActions(
	state: BattleState,
	playerId: number,
	cardLookup: (cardId: string) => CardDefinition
): {
	canEndTurn: boolean;
	playableCardIds: number[];
	attackers: number[];
	targetsByAttacker: Record<number, Array<{ type: 'hero' } | { type: 'unit'; unitId: number }>>;
} {
	const player = state.players[playerId];
	if (!player || state.currentPlayerId !== playerId || state.status !== 'active') {
		return {
			canEndTurn: false,
			playableCardIds: [],
			attackers: [],
			targetsByAttacker: {}
		};
	}

	const playableCardIds = player.hand
		.filter((card) => {
			const definition = cardLookup(card.cardId);
			return definition.cost <= player.energy && player.board.length < 3;
		})
		.map((card) => card.instanceId);

	const opponent = getOpponent(state, playerId);
	const guards = opponent.board.filter((unit) => hasAbility(cardLookup(unit.cardId), 'guard'));
	const attackers = player.board.filter((unit) => unit.canAttack).map((unit) => unit.instanceId);
	const targetsByAttacker: Record<
		number,
		Array<{ type: 'hero' } | { type: 'unit'; unitId: number }>
	> = {};

	for (const attackerId of attackers) {
		targetsByAttacker[attackerId] = [
			...(guards.length > 0 ? guards : opponent.board).map((unit) => ({
				type: 'unit' as const,
				unitId: unit.instanceId
			})),
			...(guards.length === 0 ? [{ type: 'hero' as const }] : [])
		];
	}

	return {
		canEndTurn: true,
		playableCardIds,
		attackers,
		targetsByAttacker
	};
}

function createParticipant(playerId: number, deck: string[]): BattleParticipantState {
	return {
		id: playerId,
		health: STARTING_HEALTH,
		maxEnergy: 0,
		energy: 0,
		deck: [...deck],
		hand: [],
		board: []
	};
}

function startTurn(
	state: BattleState,
	playerId: number,
	cardLookup: (cardId: string) => CardDefinition
): void {
	const player = state.players[playerId];
	player.maxEnergy = Math.min(MAX_ENERGY, player.maxEnergy + 1);
	player.energy = player.maxEnergy;
	drawCards(state, playerId, 1);

	for (const unit of player.board) {
		if (hasEffect(unit, 'hatch')) {
			continue;
		}
		unit.canAttack = true;
	}

	resolveTurnEffects(state, playerId, cardLookup);
}

function resolveTurnEffects(
	state: BattleState,
	playerId: number,
	cardLookup: (cardId: string) => CardDefinition
): void {
	const player = state.players[playerId];
	player.board = player.board.map((unit) => {
		const hatchEffect = unit.effects?.find((effect) => effect.type === 'hatch');
		if (!hatchEffect) {
			return unit;
		}

		const turnsRemaining = hatchEffect.turnsRemaining - 1;
		if (turnsRemaining > 0) {
			return {
				...unit,
				effects: updateEffect(unit.effects ?? [], {
					...hatchEffect,
					turnsRemaining
				})
			};
		}

		const hatchedDefinition = cardLookup(hatchEffect.into);
		state.log.unshift(`${unit.instanceId} вылупляется в ${hatchedDefinition.name}.`);

		return {
			instanceId: unit.instanceId,
			cardId: hatchEffect.into,
			ownerId: unit.ownerId,
			damageTaken: 0,
			canAttack: false,
			effects: createInitialEffects(hatchedDefinition)
		};
	});
}

function applyPlayCard(
	state: BattleState,
	playerId: number,
	cardInstanceId: number,
	cardLookup: (cardId: string) => CardDefinition
): void {
	const player = state.players[playerId];
	const cardIndex = player.hand.findIndex((card) => card.instanceId === cardInstanceId);
	const handCard = player.hand[cardIndex];
	const definition = cardLookup(handCard.cardId);

	player.energy -= definition.cost;
	player.hand.splice(cardIndex, 1);
	player.board.push(toUnit(handCard, playerId, definition));
	state.log.unshift(`Игрок ${playerId} разыграл ${definition.name}.`);
}

function applyAttack(
	state: BattleState,
	playerId: number,
	attackerId: number,
	target: { type: 'hero' } | { type: 'unit'; unitId: number },
	cardLookup: (cardId: string) => CardDefinition
): void {
	const player = state.players[playerId];
	const opponent = getOpponent(state, playerId);
	const attacker = player.board.find((unit) => unit.instanceId === attackerId);
	if (!attacker) {
		throw new Error('Атакующий исчез во время расчета.');
	}

	const attackerCard = cardLookup(attacker.cardId);
	const attackerDamage = getUnitAttack(player, attacker, cardLookup);
	attacker.canAttack = false;

	if (target.type === 'hero') {
		opponent.health -= attackerDamage;
		state.log.unshift(`${attackerCard.name} атакует героя противника на ${attackerDamage}.`);
		checkWinner(state);
		return;
	}

	const defender = opponent.board.find((unit) => unit.instanceId === target.unitId);
	if (!defender) {
		throw new Error('Цель исчезла во время расчета.');
	}

	const defenderCard = cardLookup(defender.cardId);
	const defenderDamage = getUnitAttack(opponent, defender, cardLookup);

	defender.damageTaken += attackerDamage;
	attacker.damageTaken += defenderDamage;

	state.log.unshift(`${attackerCard.name} атакует ${defenderCard.name}.`);
	removeDeadUnits(state, cardLookup);
	checkWinner(state);
}

function removeDeadUnits(state: BattleState, cardLookup: (cardId: string) => CardDefinition): void {
	for (const player of Object.values(state.players)) {
		player.board = player.board.filter((unit) => {
			const currentHealth = getUnitCurrentHealth(cardLookup(unit.cardId), unit);
			if (currentHealth > 0) {
				return true;
			}

			state.log.unshift(`${cardLookup(unit.cardId).name} уничтожен.`);
			return false;
		});
	}
}

function checkWinner(state: BattleState): void {
	const defeated = Object.values(state.players).find((player) => player.health <= 0);
	if (!defeated) {
		return;
	}

	const winner = Object.values(state.players).find((player) => player.id !== defeated.id);
	state.status = 'finished';
	state.winnerId = winner?.id;
	state.log.unshift(`Бой завершен. Победитель: ${winner?.id ?? 'неизвестно'}.`);
}

function drawCards(state: BattleState, playerId: number, count: number): void {
	const player = state.players[playerId];

	for (let index = 0; index < count; index += 1) {
		const cardId = player.deck.shift();
		if (!cardId) {
			return;
		}

		const handCard: HandCard = {
			instanceId: state.nextCardInstanceId,
			cardId
		};
		state.nextCardInstanceId += 1;
		player.hand.push(handCard);
	}
}

function toUnit(card: HandCard, ownerId: number, definition: CardDefinition): UnitState {
	return {
		instanceId: card.instanceId,
		cardId: card.cardId,
		ownerId,
		damageTaken: 0,
		canAttack: false,
		effects: createInitialEffects(definition)
	};
}

function createInitialEffects(definition: CardDefinition): UnitEffectState[] | undefined {
	const effects: UnitEffectState[] = [];

	for (const ability of definition.abilities ?? []) {
		if (ability.type === 'hatch') {
			effects.push({
				type: 'hatch',
				into: ability.into,
				turnsRemaining: ability.afterOwnerTurns
			});
		}
	}

	return effects.length > 0 ? effects : undefined;
}

function hasEffect(unit: UnitState, type: UnitEffectState['type']): boolean {
	return unit.effects?.some((effect) => effect.type === type) ?? false;
}

function updateEffect(
	effects: UnitEffectState[],
	nextEffect: UnitEffectState
): UnitEffectState[] | undefined {
	const nextEffects = effects.map((effect) =>
		effect.type === nextEffect.type ? nextEffect : effect
	);
	return nextEffects.length > 0 ? nextEffects : undefined;
}

function cloneState(state: BattleState): BattleState {
	return JSON.parse(JSON.stringify(state)) as BattleState;
}
