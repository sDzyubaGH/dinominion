export type CardAbility =
	| {
			type: 'guard';
	  }
	| {
			type: 'pack';
			attackBonus: number;
			minAllies: number;
			sameSpecies: boolean;
	  }
	| {
			type: 'hatch';
			into: string;
			afterOwnerTurns: number;
	  };

export interface CardDefinition {
	id: string;
	name: string;
	cost: number;
	attack: number;
	health: number;
	species: string;
	abilityText?: string;
	abilities?: CardAbility[];
}

export interface HandCard {
	instanceId: number;
	cardId: string;
}

export type UnitEffectState =
	| {
			type: 'hatch';
			into: string;
			turnsRemaining: number;
	  };

export interface UnitState {
	instanceId: number;
	cardId: string;
	ownerId: number;
	damageTaken: number;
	canAttack: boolean;
	effects?: UnitEffectState[];
}
