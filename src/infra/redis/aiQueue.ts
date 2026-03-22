import type { Redis } from 'ioredis';

const AI_TURN_QUEUE_KEY = 'dino:ai:turns';
const AI_TURN_SCHEDULED_KEY_PREFIX = 'dino:ai:turn:scheduled:';

export class AiTurnQueue {
	constructor(private readonly redis: Redis) {}

	async enqueueTurn(battleId: number): Promise<boolean> {
		const scheduledKey = this.scheduledKey(battleId);
		const scheduled = await this.redis.set(scheduledKey, '1', 'EX', 300, 'NX');
		if (scheduled !== 'OK') {
			return false;
		}

		await this.redis.lpush(AI_TURN_QUEUE_KEY, String(battleId));
		return true;
	}

	async popTurn(timeoutSeconds: number): Promise<number | null> {
		const result = await this.redis.brpop(AI_TURN_QUEUE_KEY, timeoutSeconds);
		if (!result) {
			return null;
		}

		return Number(result[1]);
	}

	async clearScheduled(battleId: number): Promise<void> {
		await this.redis.del(this.scheduledKey(battleId));
	}

	private scheduledKey(battleId: number): string {
		return `${AI_TURN_SCHEDULED_KEY_PREFIX}${battleId}`;
	}
}
