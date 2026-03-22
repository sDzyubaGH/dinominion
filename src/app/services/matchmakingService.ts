import type { Player } from '@prisma/client';
import { BattleService } from './battleService.js';
import { AiPlayerService } from './aiPlayerService.js';
import { MatchmakingQueue } from '../../infra/redis/queue.js';
import { PlayerRepository } from '../../infra/prisma/repositories/playerRepository.js';

export class MatchmakingService {
	constructor(
		private readonly queue: MatchmakingQueue,
		private readonly playerRepository: PlayerRepository,
		private readonly battleService: BattleService,
		private readonly aiPlayerService: AiPlayerService
	) {}

	async joinQueue(player: Player): Promise<
		| {
				status: 'queued';
		  }
		| {
				status: 'matched';
				battleId: number;
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

	async matchTimedOutPlayerWithAi(timeoutMs: number): Promise<
		| null
		| {
				battleId: number;
				playerId: number;
		  }
	> {
		const playerId = await this.queue.dequeueTimedOutPlayer(timeoutMs);
		if (!playerId) {
			return null;
		}

		const player = await this.playerRepository.findById(playerId);
		if (!player || player.isBot) {
			return null;
		}

		const aiPlayer = await this.aiPlayerService.ensureAvailableAiPlayer();
		const battle = await this.battleService.createBattle(player, aiPlayer);
		return {
			battleId: battle.battle.id,
			playerId: player.id
		};
	}
}
