import type { HandCard, UnitState } from '../entities/Card.js';

export interface BattleParticipantState {
	id: string;
	health: number;
	maxEnergy: number;
	energy: number;
	deck: string[];
	hand: HandCard[];
	board: UnitState[];
}

export interface BattleState {
	battleId: string;
	turn: number;
	currentPlayerId: string;
	status: 'active' | 'finished';
	winnerId?: string;
	nextCardInstanceId: number;
	players: Record<string, BattleParticipantState>;
	log: string[];
}
