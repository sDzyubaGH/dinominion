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
