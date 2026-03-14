import type { Redis } from 'ioredis';
import { RedisLockService } from './locks.js';

const MATCHMAKING_QUEUE_KEY = 'dino:queue';

export class MatchmakingQueue {
	constructor(
		private readonly redis: Redis,
		private readonly lockService: RedisLockService
	) {}

	async enqueueOrMatch(playerId: string): Promise<{ opponentId?: string; queued: boolean }> {
		return this.lockService.withLock('dino:queue:lock', 5000, async () => {
			await this.redis.lrem(MATCHMAKING_QUEUE_KEY, 0, playerId);

			const opponentId = await this.redis.lpop(MATCHMAKING_QUEUE_KEY);
			if (opponentId && opponentId !== playerId) {
				return {
					opponentId,
					queued: false
				};
			}

			if (opponentId === playerId) {
				await this.redis.rpush(MATCHMAKING_QUEUE_KEY, playerId);
				return { queued: true };
			}

			await this.redis.rpush(MATCHMAKING_QUEUE_KEY, playerId);
			return { queued: true };
		});
	}

	async remove(playerId: string): Promise<void> {
		await this.redis.lrem(MATCHMAKING_QUEUE_KEY, 0, playerId);
	}
}
