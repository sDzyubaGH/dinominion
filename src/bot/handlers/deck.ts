import type { Bot, Context } from 'grammy';
import type { DeckService } from '../../app/services/deckService.js';
import type { PlayerService } from '../../app/services/playerService.js';

export function registerDeckHandler(
	bot: Bot<Context>,
	playerService: PlayerService,
	deckService: DeckService
): void {
	bot.command('deck', async (ctx) => {
		if (!ctx.from) {
			return;
		}

		const player = await playerService.registerOrGet(BigInt(ctx.from.id), ctx.from.username);
		const { deck, cards } = await deckService.getDeck(player.id);
		await ctx.reply(
			[`Колода: ${deck.name}`, ...cards.map((card, index) => `${index + 1}. ${card}`)].join(
				'\n'
			)
		);
	});
}
