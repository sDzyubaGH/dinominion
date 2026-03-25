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
	  }
	| {
			type: 'hatch_accelerate_on_play';
			amount: number;
			selection: 'all' | 'lowest_timer';
	  }
	| {
		type: 'draw_on_play';
		count: number;
	  }
	| {
		type: 'heal_hero_on_play';
		amount: number;
	  }
	| {
		type: 'damage_enemy_unit_on_play';
		amount: number;
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
