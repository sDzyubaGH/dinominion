import type { Redis } from 'ioredis';
import { RedisLockService } from './locks.js';

const MATCHMAKING_QUEUE_KEY = 'dino:queue';

export class MatchmakingQueue {
	constructor(
		private readonly redis: Redis,
		private readonly lockService: RedisLockService
	) {}

	async enqueueOrMatch(playerId: number): Promise<{ opponentId?: number; queued: boolean }> {
		return this.lockService.withLock('dino:queue:lock', 5000, async () => {
			await this.redis.lrem(MATCHMAKING_QUEUE_KEY, 0, String(playerId));

			const opponentId = await this.redis.lpop(MATCHMAKING_QUEUE_KEY);
			if (opponentId && Number(opponentId) !== playerId) {
				return {
					opponentId: Number(opponentId),
					queued: false
				};
			}

			if (opponentId && Number(opponentId) === playerId) {
				await this.redis.rpush(MATCHMAKING_QUEUE_KEY, String(playerId));
				return { queued: true };
			}

			await this.redis.rpush(MATCHMAKING_QUEUE_KEY, String(playerId));
			return { queued: true };
		});
	}

	async remove(playerId: number): Promise<void> {
		await this.redis.lrem(MATCHMAKING_QUEUE_KEY, 0, String(playerId));
	}
}
