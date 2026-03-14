export type CardType = 'dinosaur' | 'mutation' | 'catastrophe';

export type AbilityId =
	| 'none'
	| 'taunt'
	| 'egg'
	| 'pack_fury'
	| 'battlecry_face_2'
	| 'battlecry_ping_enemy_minion'
	| 'end_turn_heal_1'
	| 'evolve'
	| 'direct_strike'
	| 'buff_friendly_2_2'
	| 'aoe_all_2';

export interface CardDefinition {
	id: string;
	name: string;
	type: CardType;
	attack: number;
	health: number;
	energyCost: number;
	description: string;
	ability: AbilityId;
	species?: string;
	hatchTurns?: number;
	hatchesInto?: string;
	evolvesTo?: string;
	evolveCost?: number;
}

export interface CardInstance {
	instanceId: string;
	definitionId: string;
	ownerId: number;
	attack: number;
	health: number;
	maxHealth: number;
	canAttack: boolean;
	hasAttacked: boolean;
	turnsInPlay: number;
	hatchIn?: number;
	evolvedFrom?: string;
}
