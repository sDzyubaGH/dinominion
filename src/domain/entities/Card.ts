export interface CardDefinition {
	id: string;
	name: string;
	cost: number;
	attack: number;
	health: number;
	species: string;
	abilityText?: string;
	keywords?: Array<'guard'>;
	egg?: {
		hatchesIntoCardId: string;
		turnsToHatch: number;
	};
}

export interface HandCard {
	instanceId: string;
	cardId: string;
}

export interface UnitState {
	instanceId: string;
	cardId: string;
	ownerId: string;
	damageTaken: number;
	canAttack: boolean;
	eggState?: {
		hatchesIntoCardId: string;
		turnsRemaining: number;
	};
}
