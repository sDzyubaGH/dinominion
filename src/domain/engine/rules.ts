import type { CardDefinition, UnitState } from '../entities/Card.js';
import type { BattleParticipantState, BattleState } from '../types/BattleState.js';

export const STARTING_HEALTH = 20;
export const MAX_ENERGY = 10;
export const MAX_BOARD_SIZE = 3;

export function getOpponent(state: BattleState, playerId: number): BattleParticipantState {
	const opponent = Object.values(state.players).find((player) => player.id !== playerId);
	if (!opponent) {
		throw new Error('Battle must have exactly two players.');
	}
	return opponent;
}

export function getUnitCurrentHealth(card: CardDefinition, unit: UnitState): number {
	return card.health - unit.damageTaken;
}

export function hasGuardOnBoard(
	board: UnitState[],
	cardLookup: (cardId: string) => CardDefinition
): boolean {
	return board.some((unit) => cardLookup(unit.cardId).keywords?.includes('guard'));
}

export function getUnitAttack(
	owner: BattleParticipantState,
	unit: UnitState,
	cardLookup: (cardId: string) => CardDefinition
): number {
	const card = cardLookup(unit.cardId);
	let attack = card.attack;

	const alliesWithSameSpecies = owner.board.filter(
		(ally) => cardLookup(ally.cardId).species === card.species
	);
	if (alliesWithSameSpecies.length >= 2) {
		attack += 1;
	}

	return attack;
}
