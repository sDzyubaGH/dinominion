import type { HandCard, UnitState } from '../entities/Card.js';

export interface BattleParticipantState {
	id: number;
	health: number;
	maxEnergy: number;
	energy: number;
	deck: string[];
	hand: HandCard[];
	board: UnitState[];
}

export interface BattleState {
	battleId: number;
	turn: number;
	currentPlayerId: number;
	status: 'active' | 'finished';
	winnerId?: number;
	nextCardInstanceId: number;
	players: Record<number, BattleParticipantState>;
	log: string[];
}
