import type { Bot, Context } from 'grammy';
import type { PlayerService } from '../../app/services/playerService.js';
import { createMainMenuKeyboard } from '../keyboards/mainMenu.js';

export function registerStartHandler(bot: Bot<Context>, playerService: PlayerService): void {
	bot.command('start', async (ctx) => {
		if (!ctx.from) {
			return;
		}

		const player = await playerService.registerOrGet(BigInt(ctx.from.id), ctx.from.username);
		await ctx.reply(
			[
				`Добро пожаловать в Dino Clash, ${player.username ? `@${player.username}` : 'командир'}.`,
				'Стартовая коллекция и колода готовы.',
				'Используйте /play, чтобы встать в очередь на матч.'
			].join('\n'),
			{
				reply_markup: createMainMenuKeyboard()
			}
		);
	});
}
