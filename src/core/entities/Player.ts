export interface BattlePlayer {
	id: number;
	health: number;
	maxEnergy: number;
	energy: number;
	deck: string[];
	hand: import('./Card.js').HandCard[];
	board: import('./Card.js').UnitState[];
}
