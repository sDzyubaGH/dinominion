import type { Player } from '@prisma/client';
import { BattleRepository } from '../../infra/prisma/repositories/battleRepository.js';
import { PlayerRepository } from '../../infra/prisma/repositories/playerRepository.js';
import { DeckRepository } from '../../infra/prisma/repositories/deckRepository.js';
import { CollectionService } from './collectionService.js';
import { DeckService } from './deckService.js';

const AI_USERNAME_PREFIX = 'dino_ai';
const AI_PREFERRED_DECK_NAME = 'Каменная Охрана';

export class AiPlayerService {
	constructor(
		private readonly battleRepository: BattleRepository,
		private readonly playerRepository: PlayerRepository,
		private readonly deckRepository: DeckRepository,
		private readonly collectionService: CollectionService,
		private readonly deckService: DeckService
	) {}

	async ensureAvailableAiPlayer(): Promise<Player> {
		const bots = await this.playerRepository.findManyBots();
		for (const bot of bots) {
			const isBusy = await this.battleRepository.hasActiveBattle(bot.id);
			if (!isBusy) {
				await this.prepareAiPlayer(bot);
				return bot;
			}
		}

		const nextIndex = bots.length + 1;
		const player = await this.playerRepository.create({
			telegramId: BigInt(-nextIndex),
			username: `${AI_USERNAME_PREFIX}_${nextIndex}`,
			isBot: true
		});

		await this.prepareAiPlayer(player);
		return player;
	}

	private async prepareAiPlayer(player: Player): Promise<void> {
		await this.collectionService.ensureStarterCollection(player.id);
		await this.deckService.ensureStarterDecks(player.id);

		const decks = await this.deckRepository.findManyByPlayerId(player.id);
		const preferredDeck = decks.find((deck) => deck.name === AI_PREFERRED_DECK_NAME) ?? decks[0];
		if (preferredDeck) {
			await this.deckRepository.setCurrentDeck(player.id, preferredDeck.id);
		}
	}
}
