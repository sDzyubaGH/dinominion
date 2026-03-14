import type { Bot, Context } from 'grammy';
import type { PlayerService } from '../../app/services/playerService.js';

export function registerProfileHandler(bot: Bot<Context>, playerService: PlayerService): void {
	bot.command('profile', async (ctx) => {
		if (!ctx.from) {
			return;
		}

		const player = await playerService.getProfile(String(ctx.from.id));
		if (!player) {
			await ctx.reply('Профиль не найден. Сначала выполните /start.');
			return;
		}

		await ctx.reply(
			[
				'Профиль',
				`Telegram ID: ${player.telegramId}`,
				`Имя пользователя: ${player.username ? `@${player.username}` : '-'}`,
				`Дата регистрации: ${player.createdAt.toISOString()}`
			].join('\n')
		);
	});
}
