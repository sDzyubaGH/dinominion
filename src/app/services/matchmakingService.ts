import type { Player } from '@prisma/client';
import { BattleService } from './battleService.js';
import { MatchmakingQueue } from '../../infra/redis/queue.js';
import { PlayerRepository } from '../../infra/prisma/repositories/playerRepository.js';

export class MatchmakingService {
	constructor(
		private readonly queue: MatchmakingQueue,
		private readonly playerRepository: PlayerRepository,
		private readonly battleService: BattleService
	) {}

	async joinQueue(player: Player): Promise<
		| {
				status: 'queued';
		  }
		| {
				status: 'matched';
				battleId: string;
		  }
	> {
		const result = await this.queue.enqueueOrMatch(player.id);
		if (result.queued || !result.opponentId) {
			return { status: 'queued' };
		}

		const opponent = await this.playerRepository.findById(result.opponentId);
		if (!opponent) {
			return { status: 'queued' };
		}

		const battle = await this.battleService.createBattle(opponent, player);
		return {
			status: 'matched',
			battleId: battle.battle.id
		};
	}
}
