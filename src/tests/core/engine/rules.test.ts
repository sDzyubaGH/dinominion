import assert from 'node:assert/strict';
import test from 'node:test';
import { getUnitAttack, hasGuardOnBoard } from '../../../core/engine/rules.js';
import type { BattleParticipantState } from '../../../core/types/BattleState.js';
import { testCardLookup } from './testUtils.js';

test('pack ability adds attack when another unit of the same species is on board', () => {
	const owner: BattleParticipantState = {
		id: 1,
		health: 20,
		maxEnergy: 3,
		energy: 3,
		deck: [],
		hand: [],
		board: [
			{
				instanceId: 1,
				cardId: 'forest-raptor',
				ownerId: 1,
				damageTaken: 0,
				canAttack: true
			},
			{
				instanceId: 2,
				cardId: 'alpha-raptor',
				ownerId: 1,
				damageTaken: 0,
				canAttack: true
			}
		]
	};

	const attack = getUnitAttack(owner, owner.board[0]!, testCardLookup);

	assert.equal(attack, 3);
});

test('hasGuardOnBoard returns true when at least one guarded unit is present', () => {
	const board = [
		{
			instanceId: 1,
			cardId: 'marsh-hunter',
			ownerId: 1,
			damageTaken: 0,
			canAttack: false
		},
		{
			instanceId: 2,
			cardId: 'horned-guardian',
			ownerId: 1,
			damageTaken: 0,
			canAttack: false
		}
	];

	assert.equal(hasGuardOnBoard(board, testCardLookup), true);
});
