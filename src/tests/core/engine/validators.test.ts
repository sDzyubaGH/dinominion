import assert from 'node:assert/strict';
import test from 'node:test';
import { validateAction } from '../../../core/engine/validators.js';
import {
	createTestBattleState,
	findBoardUnitInstanceId,
	findHandCardInstanceId,
	testCardLookup
} from './testUtils.js';

test('validateAction rejects playing a card without enough energy', () => {
	const state = createTestBattleState({
		player1Deck: ['alpha-raptor', 'forest-raptor', 'marsh-hunter', 'swamp-hatchling']
	});
	const alphaRaptorId = findHandCardInstanceId(state, 1, 'alpha-raptor');

	const error = validateAction(
		state,
		{
			type: 'play_card',
			playerId: 1,
			cardInstanceId: alphaRaptorId
		},
		testCardLookup
	);

	assert.equal(error, 'Недостаточно энергии.');
});

test('validateAction rejects attacking the hero while a guard unit is on the board', () => {
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
	const error = validateAction(
		state,
		{
			type: 'attack',
			playerId: 1,
			attackerId,
			target: { type: 'hero' }
		},
		testCardLookup
	);

	assert.equal(error, 'Сначала нужно атаковать существ с охраной.');
});
