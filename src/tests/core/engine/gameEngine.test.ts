import assert from 'node:assert/strict';
import test from 'node:test';
import { applyAction, getAvailableActions } from '../../../core/engine/gameEngine.js';
import {
	createTestBattleState,
	findBoardUnitInstanceId,
	findHandCardInstanceId,
	testCardLookup
} from './testUtils.js';

test('createInitialBattleState gives the starting player four cards and one energy', () => {
	const state = createTestBattleState();

	assert.equal(state.turn, 1);
	assert.equal(state.currentPlayerId, 1);
	assert.equal(state.players[1].hand.length, 4);
	assert.equal(state.players[2].hand.length, 4);
	assert.equal(state.players[1].energy, 1);
	assert.equal(state.players[1].maxEnergy, 1);
});

test('play_card spends energy and puts the unit on board', () => {
	const state = createTestBattleState({
		player1Deck: ['ancient-egg', 'forest-raptor', 'marsh-hunter', 'swamp-hatchling'],
		player2Deck: ['horned-guardian', 'ridge-triceratops', 'marsh-hunter', 'cliff-stalker']
	});
	const eggInstanceId = findHandCardInstanceId(state, 1, 'ancient-egg');

	const result = applyAction(
		state,
		{
			type: 'play_card',
			playerId: 1,
			cardInstanceId: eggInstanceId
		},
		testCardLookup
	);

	assert.equal(result.ok, true);
	assert.equal(result.state.players[1].energy, 0);
	assert.equal(result.state.players[1].board.length, 1);
	assert.equal(result.state.players[1].board[0]?.cardId, 'ancient-egg');
	assert.equal(result.state.players[1].hand.some((card) => card.instanceId === eggInstanceId), false);
});

test('hatch effect resolves at the start of the owner next turn', () => {
	const initialState = createTestBattleState({
		player1Deck: ['ancient-egg', 'forest-raptor', 'marsh-hunter', 'swamp-hatchling'],
		player2Deck: ['marsh-hunter', 'ridge-triceratops', 'cliff-stalker', 'horned-guardian']
	});
	const eggInstanceId = findHandCardInstanceId(initialState, 1, 'ancient-egg');

	const played = applyAction(
		initialState,
		{
			type: 'play_card',
			playerId: 1,
			cardInstanceId: eggInstanceId
		},
		testCardLookup
	);
	assert.equal(played.ok, true);

	const endedPlayerOneTurn = applyAction(
		played.state,
		{
			type: 'end_turn',
			playerId: 1
		},
		testCardLookup
	);
	assert.equal(endedPlayerOneTurn.ok, true);

	const endedPlayerTwoTurn = applyAction(
		endedPlayerOneTurn.state,
		{
			type: 'end_turn',
			playerId: 2
		},
		testCardLookup
	);
	assert.equal(endedPlayerTwoTurn.ok, true);

	assert.equal(endedPlayerTwoTurn.state.currentPlayerId, 1);
	assert.equal(endedPlayerTwoTurn.state.players[1].board[0]?.cardId, 'swamp-hatchling');
	assert.equal(endedPlayerTwoTurn.state.players[1].board[0]?.effects, undefined);
});

test('getAvailableActions blocks hero targets while opponent has guard', () => {
	const state = createTestBattleState();
	state.currentPlayerId = 1;
	state.players[1].board = [
		{
			instanceId: 101,
			cardId: 'forest-raptor',
			ownerId: 1,
			damageTaken: 0,
			canAttack: true
		}
	];
	state.players[2].board = [
		{
			instanceId: 201,
			cardId: 'horned-guardian',
			ownerId: 2,
			damageTaken: 0,
			canAttack: false
		}
	];

	const attackerId = findBoardUnitInstanceId(state, 1, 'forest-raptor');
	const actions = getAvailableActions(state, 1, testCardLookup);
	const targets = actions.targetsByAttacker[attackerId] ?? [];

	assert.equal(targets.some((target) => target.type === 'hero'), false);
	assert.equal(targets.some((target) => target.type === 'unit'), true);
});

test('nest tender reduces allied hatch timer by 1 on play', () => {
	const initialState = createTestBattleState({
		player1Deck: ['ancient-nest-egg', 'nest-tender', 'marsh-hunter', 'swamp-hatchling'],
		player2Deck: ['marsh-hunter', 'ridge-triceratops', 'cliff-stalker', 'horned-guardian']
	});
	initialState.players[1].maxEnergy = 10;
	initialState.players[1].energy = 10;

	const eggInstanceId = findHandCardInstanceId(initialState, 1, 'ancient-nest-egg');
	const tenderInstanceId = findHandCardInstanceId(initialState, 1, 'nest-tender');

	const playedEgg = applyAction(
		initialState,
		{ type: 'play_card', playerId: 1, cardInstanceId: eggInstanceId },
		testCardLookup
	);
	assert.equal(playedEgg.ok, true, playedEgg.error);

	const playedTender = applyAction(
		playedEgg.state,
		{ type: 'play_card', playerId: 1, cardInstanceId: tenderInstanceId },
		testCardLookup
	);
	assert.equal(playedTender.ok, true, playedTender.error);

	const eggOnBoard = playedTender.state.players[1].board.find((u) => u.cardId === 'ancient-nest-egg');
	const hatchEffect = eggOnBoard?.effects?.find((e) => e.type === 'hatch');

	assert.ok(eggOnBoard);
	assert.ok(hatchEffect);
	assert.equal(hatchEffect?.turnsRemaining, 1); // было 2, стало 1
});

test('nest tender can hatch immediately when timer reaches zero', () => {
	const initialState = createTestBattleState({
		player1Deck: ['ancient-egg', 'nest-tender', 'marsh-hunter', 'swamp-hatchling'],
		player2Deck: ['marsh-hunter', 'ridge-triceratops', 'cliff-stalker', 'horned-guardian']
	});

	initialState.players[1].maxEnergy = 10;
	initialState.players[1].energy = 10;

	const eggInstanceId = findHandCardInstanceId(initialState, 1, 'ancient-egg');
	const tenderInstanceId = findHandCardInstanceId(initialState, 1, 'nest-tender');

	const playedEgg = applyAction(
		initialState,
		{ type: 'play_card', playerId: 1, cardInstanceId: eggInstanceId },
		testCardLookup
	);
	assert.equal(playedEgg.ok, true);

	const playedTender = applyAction(
		playedEgg.state,
		{ type: 'play_card', playerId: 1, cardInstanceId: tenderInstanceId },
		testCardLookup
	);
	assert.equal(playedTender.ok, true);

	assert.equal(
		playedTender.state.players[1].board.some((u) => u.cardId === 'ancient-egg'),
		false
	);
	assert.equal(
		playedTender.state.players[1].board.some((u) => u.cardId === 'swamp-hatchling'),
		true
	);
});

test('nest tender does not affect enemy eggs', () => {
	const initialState = createTestBattleState({
		player1Deck: ['ancient-nest-egg', 'nest-tender', 'marsh-hunter', 'swamp-hatchling'],
		player2Deck: ['ancient-nest-egg', 'marsh-hunter', 'cliff-stalker', 'horned-guardian']
	});

	initialState.players[1].maxEnergy = 10;
	initialState.players[1].energy = 10;
	initialState.players[2].maxEnergy = 10;
	initialState.players[2].energy = 10;

	const p1EggInstanceId = findHandCardInstanceId(initialState, 1, 'ancient-nest-egg');
	const p1TenderInstanceId = findHandCardInstanceId(initialState, 1, 'nest-tender');

	const p1PlayedEgg = applyAction(
		initialState,
		{ type: 'play_card', playerId: 1, cardInstanceId: p1EggInstanceId },
		testCardLookup
	);
	assert.equal(p1PlayedEgg.ok, true, p1PlayedEgg.error);

	const p1End = applyAction(p1PlayedEgg.state, { type: 'end_turn', playerId: 1 }, testCardLookup);
	assert.equal(p1End.ok, true, p1End.error);

	const p2EggInstanceId = findHandCardInstanceId(p1End.state, 2, 'ancient-nest-egg');
	const p2PlayedEgg = applyAction(
		p1End.state,
		{ type: 'play_card', playerId: 2, cardInstanceId: p2EggInstanceId },
		testCardLookup
	);
	assert.equal(p2PlayedEgg.ok, true, p2PlayedEgg.error);

	const p2End = applyAction(p2PlayedEgg.state, { type: 'end_turn', playerId: 2 }, testCardLookup);
	assert.equal(p2End.ok, true, p2End.error);

	const p1PlayedTender = applyAction(
		p2End.state,
		{ type: 'play_card', playerId: 1, cardInstanceId: p1TenderInstanceId },
		testCardLookup
	);
	assert.equal(p1PlayedTender.ok, true, p1PlayedTender.error);

	const p1Egg = p1PlayedTender.state.players[1].board.find((u) => u.cardId === 'ancient-nest-egg');
	const p2Egg = p1PlayedTender.state.players[2].board.find((u) => u.cardId === 'ancient-nest-egg');

	const p1Turns = p1Egg?.effects?.find((e) => e.type === 'hatch')?.turnsRemaining;
	const p2Turns = p2Egg?.effects?.find((e) => e.type === 'hatch')?.turnsRemaining;
	const p1HasHatchedUnit = p1PlayedTender.state.players[1].board.some(
		(u) => u.cardId === 'horned-guardian'
	);

	assert.equal(p1Turns, undefined);
	assert.equal(p1HasHatchedUnit, true);
	assert.equal(p2Turns, 2);
});

test('battle count draws 1 card on play', () => {
	const initialState = createTestBattleState({
		player1Deck: ['battle-scout', 'marsh-hunter', 'swamp-hatchling', 'forest-raptor', 'ancient-egg'],
		player2Deck: ['horned-guardian', 'ridge-triceratops', 'marsh-hunter', 'cliff-stalker']
	});

	initialState.players[1].maxEnergy = 10;
	initialState.players[1].energy = 10;

	const beforeHand = initialState.players[1].hand.length;
	const beforeDeck = initialState.players[1].deck.length;
	const beforeNextId = initialState.nextCardInstanceId;

	const scoutInstanceId = findHandCardInstanceId(initialState, 1, 'battle-scout');

	const played = applyAction(
		initialState,
		{ type: 'play_card', playerId: 1, cardInstanceId: scoutInstanceId },
		testCardLookup
	);

	assert.equal(played.ok, true, played.error);

	assert.equal(played.state.players[1].hand.length, beforeHand);

	assert.equal(played.state.players[1].deck.length, beforeDeck - 1);

	assert.equal(played.state.nextCardInstanceId, beforeNextId + 1);

	assert.equal(played.state.players[1].board.some((u) => u.cardId === 'battle-scout'), true);
});

test('battle scout draw on play does nothing when deck is empty', () => {
	const initialState = createTestBattleState({
		player1Deck: ['battle-scout'],
		player2Deck: ['horned-guardian', 'ridge-triceratops', 'marsh-hunter', 'cliff-stalker']
	});

	initialState.players[1].maxEnergy = 10;
	initialState.players[1].energy = 10;

	initialState.players[1].deck = [];

	const beforeHand = initialState.players[1].hand.length;
	const beforeNextId = initialState.nextCardInstanceId;

	const scoutInstanceId = findHandCardInstanceId(initialState, 1, 'battle-scout');

	const played = applyAction(
		initialState,
		{ type: 'play_card', playerId: 1, cardInstanceId: scoutInstanceId },
		testCardLookup
	);

	assert.equal(played.ok, true, played.error);

	assert.equal(played.state.players[1].hand.length, beforeHand - 1);

	assert.equal(played.state.nextCardInstanceId, beforeNextId);
});

test('healing heals owner hero by 3 on play', () => {
	const initialState = createTestBattleState({
		player1Deck: ['hippocratosaurus', 'marsh-hunter', 'swamp-hatchling', 'forest-raptor', 'ancient-egg'],
		player2Deck: ['horned-guardian', 'ridge-triceratops', 'marsh-hunter', 'cliff-stalker']
	});

	initialState.players[1].maxEnergy = 10;
	initialState.players[1].energy = 10;
	initialState.players[1].health = 10;

	const medicInstanceId = findHandCardInstanceId(initialState, 1, 'hippocratosaurus');

	const played = applyAction(
		initialState,
		{ type: 'play_card', playerId: 1, cardInstanceId: medicInstanceId },
		testCardLookup
	);

	assert.equal(played.ok, true, played.error);
	assert.equal(played.state.players[1].health, 13);
	assert.equal(played.state.players[2].health, 20); 
	assert.equal(played.state.players[1].board.some((u) => u.cardId === 'hippocratosaurus'), true);
});

test('healing in combat does not exceed the hero maximum health bar', () => {
	const initialState = createTestBattleState({
		player1Deck: ['hippocratosaurus', 'marsh-hunter', 'swamp-hatchling', 'forest-raptor', 'ancient-egg'],
		player2Deck: ['horned-guardian', 'ridge-triceratops', 'marsh-hunter', 'cliff-stalker']
	});

	initialState.players[1].maxEnergy = 10;
	initialState.players[1].energy = 10;
	initialState.players[1].health = 19;

	const medicInstanceId = findHandCardInstanceId(initialState, 1, 'hippocratosaurus');

	const played = applyAction(
		initialState,
		{ type: 'play_card', playerId: 1, cardInstanceId: medicInstanceId },
		testCardLookup
	);

	assert.equal(played.ok, true, played.error);
	assert.equal(played.state.players[1].health, 20);
});

test('venom spitter deals 2 damage to selected enemy unit on play', () => {
	const state = createTestBattleState({
		player1Deck: ['venom-spitter', 'marsh-hunter', 'swamp-hatchling', 'forest-raptor'],
		player2Deck: ['horned-guardian', 'ridge-triceratops', 'marsh-hunter', 'cliff-stalker']
	});

	state.players[1].maxEnergy = 10;
	state.players[1].energy = 10;
	state.players[2].board = [
		{ instanceId: 201, cardId: 'horned-guardian', ownerId: 2, damageTaken: 0, canAttack: false }
	];

	const cardInstanceId = findHandCardInstanceId(state, 1, 'venom-spitter');

	const result = applyAction(
		state,
		{
			type: 'play_card',
			playerId: 1,
			cardInstanceId,
			target: { type: 'unit', unitId: 201 }
		},
		testCardLookup
	);

	assert.equal(result.ok, true, result.error);
	const target = result.state.players[2].board.find((u) => u.instanceId === 201);
	assert.ok(target);
	assert.equal(target?.damageTaken, 2);
});

test('venom spitter can kill enemy unit on play', () => {
	const state = createTestBattleState({
		player1Deck: ['venom-spitter', 'marsh-hunter', 'swamp-hatchling', 'forest-raptor'],
		player2Deck: ['forest-raptor', 'ridge-triceratops', 'marsh-hunter', 'cliff-stalker']
	});

	state.players[1].maxEnergy = 10;
	state.players[1].energy = 10;
	state.players[2].board = [
		{ instanceId: 301, cardId: 'forest-raptor', ownerId: 2, damageTaken: 0, canAttack: false }
	];

	const cardInstanceId = findHandCardInstanceId(state, 1, 'venom-spitter');

	const result = applyAction(
		state,
		{
			type: 'play_card',
			playerId: 1,
			cardInstanceId,
			target: { type: 'unit', unitId: 301 }
		},
		testCardLookup
	);

	assert.equal(result.ok, true, result.error);
	assert.equal(result.state.players[2].board.some((u) => u.instanceId === 301), false);
});

test('venom spitter damages only selected enemy unit', () => {
	const state = createTestBattleState({
		player1Deck: ['venom-spitter', 'marsh-hunter', 'swamp-hatchling', 'forest-raptor'],
		player2Deck: ['horned-guardian', 'ridge-triceratops', 'marsh-hunter', 'cliff-stalker']
	});

	state.players[1].maxEnergy = 10;
	state.players[1].energy = 10;
	state.players[2].board = [
		{ instanceId: 401, cardId: 'horned-guardian', ownerId: 2, damageTaken: 0, canAttack: false },
		{ instanceId: 402, cardId: 'ridge-triceratops', ownerId: 2, damageTaken: 0, canAttack: false }
	];

	const cardInstanceId = findHandCardInstanceId(state, 1, 'venom-spitter');

	const result = applyAction(
		state,
		{
			type: 'play_card',
			playerId: 1,
			cardInstanceId,
			target: { type: 'unit', unitId: 401 }
		},
		testCardLookup
	);

	assert.equal(result.ok, true, result.error);

	const first = result.state.players[2].board.find((u) => u.instanceId === 401);
	const second = result.state.players[2].board.find((u) => u.instanceId === 402);

	assert.equal(first?.damageTaken, 2);
	assert.equal(second?.damageTaken, 0);
});

test('getAvailableActions returns play targets for venom spitter', () => {
	const state = createTestBattleState({
		player1Deck: ['venom-spitter', 'marsh-hunter', 'swamp-hatchling', 'forest-raptor'],
		player2Deck: ['horned-guardian', 'ridge-triceratops', 'marsh-hunter', 'cliff-stalker']
	});

	state.currentPlayerId = 1;
	state.players[1].maxEnergy = 10;
	state.players[1].energy = 10;
	state.players[2].board = [
		{ instanceId: 501, cardId: 'horned-guardian', ownerId: 2, damageTaken: 0, canAttack: false }
	];

	const cardInstanceId = findHandCardInstanceId(state, 1, 'venom-spitter');
	const actions = getAvailableActions(state, 1, testCardLookup);
	const targets = actions.targetsByPlayableCardId[cardInstanceId] ?? [];

	assert.equal(targets.some((t) => t.type === 'unit' && t.unitId === 501), true);
});

test('applyAction rejects venom spitter play without target', () => {
	const state = createTestBattleState({
		player1Deck: ['venom-spitter', 'marsh-hunter', 'swamp-hatchling', 'forest-raptor'],
		player2Deck: ['horned-guardian', 'ridge-triceratops', 'marsh-hunter', 'cliff-stalker']
	});

	state.players[1].maxEnergy = 10;
	state.players[1].energy = 10;
	state.players[2].board = [
		{ instanceId: 601, cardId: 'horned-guardian', ownerId: 2, damageTaken: 0, canAttack: false }
	];

	const cardInstanceId = findHandCardInstanceId(state, 1, 'venom-spitter');

	const result = applyAction(
		state,
		{
			type: 'play_card',
			playerId: 1,
			cardInstanceId
		},
		testCardLookup
	);

	assert.equal(result.ok, false);
	assert.ok(result.error);
});