import type { Player } from '@prisma/client';
import { prisma } from '../client.js';

export class PlayerRepository {
	async findByTelegramId(telegramId: string): Promise<Player | null> {
		return prisma.player.findUnique({
			where: { telegramId }
		});
	}

	async findById(id: string): Promise<Player | null> {
		return prisma.player.findUnique({
			where: { id }
		});
	}

	async create(data: { telegramId: string; username?: string | null }): Promise<Player> {
		return prisma.player.create({
			data: {
				telegramId: data.telegramId,
				username: data.username ?? null
			}
		});
	}

	async updateUsername(id: string, username?: string | null): Promise<Player> {
		return prisma.player.update({
			where: { id },
			data: {
				username: username ?? null
			}
		});
	}
}
