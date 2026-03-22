import type { Redis } from 'ioredis';
import { RedisLockService } from './locks.js';

const MATCHMAKING_QUEUE_KEY = 'dino:queue';
const MATCHMAKING_QUEUE_WAIT_KEY_PREFIX = 'dino:queue:waiting:';

export class MatchmakingQueue {
	constructor(
		private readonly redis: Redis,
		private readonly lockService: RedisLockService
	) {}

	async enqueueOrMatch(playerId: number): Promise<{ opponentId?: number; queued: boolean }> {
		return this.lockService.withLock('dino:queue:lock', 5000, async () => {
			const waitKey = this.waitKey(playerId);
			const existingWaitedAt = await this.redis.get(waitKey);
			await this.redis.lrem(MATCHMAKING_QUEUE_KEY, 0, String(playerId));

			const opponentId = await this.redis.lpop(MATCHMAKING_QUEUE_KEY);
			if (opponentId && Number(opponentId) !== playerId) {
				await this.redis.del(waitKey);
				await this.redis.del(this.waitKey(Number(opponentId)));
				return {
					opponentId: Number(opponentId),
					queued: false
				};
			}

			if (opponentId && Number(opponentId) === playerId) {
				await this.redis.rpush(MATCHMAKING_QUEUE_KEY, String(playerId));
				if (!existingWaitedAt) {
					await this.redis.set(waitKey, String(Date.now()));
				}
				return { queued: true };
			}

			await this.redis.rpush(MATCHMAKING_QUEUE_KEY, String(playerId));
			if (!existingWaitedAt) {
				await this.redis.set(waitKey, String(Date.now()));
			}
			return { queued: true };
		});
	}

	async dequeueTimedOutPlayer(timeoutMs: number): Promise<number | null> {
		return this.lockService.withLock('dino:queue:lock', 5000, async () => {
			const playerId = await this.redis.lindex(MATCHMAKING_QUEUE_KEY, 0);
			if (!playerId) {
				return null;
			}

			const waitedAt = await this.redis.get(this.waitKey(Number(playerId)));
			if (!waitedAt || Date.now() - Number(waitedAt) < timeoutMs) {
				return null;
			}

			const dequeued = await this.redis.lpop(MATCHMAKING_QUEUE_KEY);
			if (!dequeued) {
				return null;
			}

			await this.redis.del(this.waitKey(Number(dequeued)));
			return Number(dequeued);
		});
	}

	async remove(playerId: number): Promise<void> {
		await this.redis.lrem(MATCHMAKING_QUEUE_KEY, 0, String(playerId));
		await this.redis.del(this.waitKey(playerId));
	}

	private waitKey(playerId: number): string {
		return `${MATCHMAKING_QUEUE_WAIT_KEY_PREFIX}${playerId}`;
	}
}
