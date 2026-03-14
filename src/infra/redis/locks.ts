import type { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';

export class RedisLockService {
	constructor(private readonly redis: Redis) {}

	async withLock<T>(key: string, ttlMs: number, work: () => Promise<T>): Promise<T> {
		const token = randomUUID();

		while (true) {
			const acquired = await this.redis.set(key, token, 'PX', ttlMs, 'NX');
			if (acquired === 'OK') {
				break;
			}

			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		try {
			return await work();
		} finally {
			const currentToken = await this.redis.get(key);
			if (currentToken === token) {
				await this.redis.del(key);
			}
		}
	}
}
