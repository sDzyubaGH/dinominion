import type { CardInstance } from './card.js';

export interface RegisteredPlayer {
	id: number;
	username?: string;
	displayName: string;
	deck: string[];
}

export interface PlayerState {
	id: number;
	username?: string;
	displayName: string;
	health: number;
	maxEnergy: number;
	energy: number;
	deck: CardInstance[];
	hand: CardInstance[];
	board: CardInstance[];
	discard: CardInstance[];
}
