import type { CardAbility, CardDefinition, UnitState } from '../entities/Card.js';
import type { BattleParticipantState, BattleState } from '../types/BattleState.js';

export const STARTING_HEALTH = 20;
export const MAX_ENERGY = 10;
export const MAX_BOARD_SIZE = 6;

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

export function hasAbility(card: CardDefinition, type: CardAbility['type']): boolean {
	return card.abilities?.some((ability) => ability.type === type) ?? false;
}

export function hasGuardOnBoard(
	board: UnitState[],
	cardLookup: (cardId: string) => CardDefinition
): boolean {
	return board.some((unit) => hasAbility(cardLookup(unit.cardId), 'guard'));
}

export function getUnitAttack(
	owner: BattleParticipantState,
	unit: UnitState,
	cardLookup: (cardId: string) => CardDefinition
): number {
	const card = cardLookup(unit.cardId);
	let attack = card.attack;

	for (const ability of card.abilities ?? []) {
		if (ability.type !== 'pack') {
			continue;
		}

		const alliesMatchingSpecies = owner.board.filter((ally) => {
			if (ally.instanceId === unit.instanceId) {
				return false;
			}

			const allyCard = cardLookup(ally.cardId);
			return ability.sameSpecies ? allyCard.species === card.species : true;
		});
		if (alliesMatchingSpecies.length >= ability.minAllies) {
			attack += ability.attackBonus;
		}
	}

	return attack;
}
