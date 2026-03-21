import type { Player } from '@prisma/client';
import { CollectionService } from './collectionService.js';
import { DeckService } from './deckService.js';
import { PlayerRepository } from '../../infra/prisma/repositories/playerRepository.js';

export class PlayerService {
	constructor(
		private readonly playerRepository: PlayerRepository,
		private readonly collectionService: CollectionService,
		private readonly deckService: DeckService
	) {}

	async registerOrGet(telegramId: bigint, username?: string): Promise<Player> {
		const existing = await this.playerRepository.findByTelegramId(telegramId);
		if (existing) {
			const updatedPlayer =
				existing.username !== (username ?? null)
					? await this.playerRepository.updateUsername(existing.id, username)
					: existing;

			await this.collectionService.ensureStarterCollection(updatedPlayer.id);
			await this.deckService.ensureStarterDecks(updatedPlayer.id);
			return updatedPlayer;
		}

		const player = await this.playerRepository.create({
			telegramId,
			username
		});
		await this.collectionService.ensureStarterCollection(player.id);
		await this.deckService.ensureStarterDecks(player.id);
		return player;
	}

	async getProfile(telegramId: bigint): Promise<Player | null> {
		return this.playerRepository.findByTelegramId(telegramId);
	}
}
