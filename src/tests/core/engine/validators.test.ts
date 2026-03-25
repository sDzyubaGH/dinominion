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

test('validateAction rejects damage-on-play card without target', () => {
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
	const error = validateAction(
		state,
		{ type: 'play_card', playerId: 1, cardInstanceId },
		testCardLookup
	);

	assert.equal(error, 'Нужно выбрать вражеское существо для эффекта карты.');
});

test('validateAction rejects damage-on-play card with hero target', () => {
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
	const error = validateAction(
		state,
		{
			type: 'play_card',
			playerId: 1,
			cardInstanceId,
			target: { type: 'hero' }
		},
		testCardLookup
	);

	assert.equal(error, 'Нужно выбрать вражеское существо для эффекта карты.');
});

test('validateAction rejects damage-on-play card with missing enemy target unit', () => {
	const state = createTestBattleState({
		player1Deck: ['venom-spitter', 'marsh-hunter', 'swamp-hatchling', 'forest-raptor'],
		player2Deck: ['horned-guardian', 'ridge-triceratops', 'marsh-hunter', 'cliff-stalker']
	});
	state.players[1].maxEnergy = 10;
	state.players[1].energy = 10;
	state.players[2].board = [];

	const cardInstanceId = findHandCardInstanceId(state, 1, 'venom-spitter');
	const error = validateAction(
		state,
		{
			type: 'play_card',
			playerId: 1,
			cardInstanceId,
			target: { type: 'unit', unitId: 9999 }
		},
		testCardLookup
	);

	assert.equal(error, 'Выбранная цель недоступна.');
});

test('validateAction accepts damage-on-play card with valid enemy unit target', () => {
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
	const error = validateAction(
		state,
		{
			type: 'play_card',
			playerId: 1,
			cardInstanceId,
			target: { type: 'unit', unitId: 201 }
		},
		testCardLookup
	);

	assert.equal(error, null);
});

test('validateAction rejects extra target for non-targeted play card', () => {
	const state = createTestBattleState({
		player1Deck: ['marsh-hunter', 'forest-raptor', 'swamp-hatchling', 'ancient-egg'],
		player2Deck: ['horned-guardian', 'ridge-triceratops', 'marsh-hunter', 'cliff-stalker']
	});
	state.players[1].maxEnergy = 10;
	state.players[1].energy = 10;

	const cardInstanceId = findHandCardInstanceId(state, 1, 'marsh-hunter');
	const error = validateAction(
		state,
		{
			type: 'play_card',
			playerId: 1,
			cardInstanceId,
			target: { type: 'unit', unitId: 201 }
		},
		testCardLookup
	);

	assert.equal(error, 'Эта карта не требует выбора цели.');
});