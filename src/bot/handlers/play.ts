import type { Bot, Context } from 'grammy';
import type { BattleService } from '../../app/services/battleService.js';
import type { BattleViewService } from '../../app/services/battleViewService.js';
import type { MatchmakingService } from '../../app/services/matchmakingService.js';
import type { PlayerService } from '../../app/services/playerService.js';

export function registerPlayHandler(
	bot: Bot<Context>,
	playerService: PlayerService,
	matchmakingService: MatchmakingService,
	battleService: BattleService,
	battleViewService: BattleViewService
): void {
	bot.command('play', async (ctx) => {
		if (!ctx.from) {
			return;
		}

		const player = await playerService.registerOrGet(BigInt(ctx.from.id), ctx.from.username);
		const activeBattle = await battleService.getActiveBattleForTelegramId(BigInt(ctx.from.id));
		if (activeBattle) {
			await ctx.reply('У вас уже есть активный бой. Используйте /battle, чтобы открыть его.');
			return;
		}

		const result = await matchmakingService.joinQueue(player);

		if (result.status === 'queued') {
			await ctx.reply('Вы добавлены в очередь на матч. Ожидаем соперника.');
			return;
		}

		await battleViewService.sendInitialBattleMessages(result.battleId);

		await ctx.reply('Матч найден. Сообщения о бое отправлены обоим игрокам.');
	});
}
