import type { Bot, Context } from 'grammy';
import type { BattleService } from '../../app/services/battleService.js';
import type { MatchmakingService } from '../../app/services/matchmakingService.js';
import type { PlayerService } from '../../app/services/playerService.js';
import { createBattleKeyboard } from '../keyboards/battleKeyboard.js';
import { renderBattleText } from '../../infra/telegram/renderer.js';

export function registerPlayHandler(
	bot: Bot<Context>,
	playerService: PlayerService,
	matchmakingService: MatchmakingService,
	battleService: BattleService
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

		const snapshot = await battleService.getBattleSnapshotById(result.battleId);
		if (!snapshot) {
			throw new Error('Created battle could not be loaded.');
		}

		for (const targetPlayer of [snapshot.player1, snapshot.player2]) {
			const sentMessage = await bot.api.sendMessage(
				Number(targetPlayer.telegramId),
				renderBattleText(snapshot.state, snapshot.player1, snapshot.player2),
				{
					reply_markup: createBattleKeyboard(snapshot.state, targetPlayer.id, {
						type: 'default'
					})
				}
			);

			await battleService.storeBattleMessageRef(
				snapshot.battle.id,
				targetPlayer.id,
				targetPlayer.telegramId.toString(),
				String(sentMessage.message_id)
			);
		}

		await ctx.reply('Матч найден. Сообщения о бое отправлены обоим игрокам.');
	});
}
