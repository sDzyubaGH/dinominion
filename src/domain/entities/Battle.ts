import type { BattleState } from '../types/BattleState.js';

export interface DomainBattle {
	id: number;
	state: BattleState;
}
