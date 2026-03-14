import type { Bot, Context } from 'grammy';
import type { Api } from 'grammy';
import type { BattleService } from '../../app/services/battleService.js';
import type { PlayerService } from '../../app/services/playerService.js';
import { createBattleKeyboard, type BattleViewMode } from '../keyboards/battleKeyboard.js';
import {
	renderActionSummary,
	renderBattleText,
	renderHandText
} from '../../infra/telegram/renderer.js';

export function registerBattleHandler(
	bot: Bot<Context>,
	playerService: PlayerService,
	battleService: BattleService
): void {
	bot.command('battle', async (ctx) => {
		if (!ctx.from) {
			return;
		}

		const player = await playerService.registerOrGet(String(ctx.from.id), ctx.from.username);
		const snapshot = await battleService.getActiveBattleForTelegramId(String(ctx.from.id));
		if (!snapshot) {
			await ctx.reply('Активный бой не найден.');
			return;
		}

		const sentMessage = await ctx.reply(
			renderBattleText(snapshot.state, snapshot.player1, snapshot.player2),
			{
				reply_markup: createBattleKeyboard(snapshot.state, player.id, {
					type: 'default'
				})
			}
		);

		await battleService.storeBattleMessageRef(
			snapshot.battle.id,
			player.id,
			String(ctx.from.id),
			String(sentMessage.message_id)
		);
	});

	bot.callbackQuery(/^battle:/, async (ctx) => {
		if (!ctx.from || !ctx.callbackQuery.data) {
			return;
		}

		const parts = ctx.callbackQuery.data.split(':');
		const battleId = parts[1];
		const command = parts[2];
		const snapshot = await battleService.getBattleSnapshotById(battleId);
		if (!snapshot) {
			await ctx.answerCallbackQuery({ text: 'Бой не найден.' });
			return;
		}

		const actor = await playerService.getProfile(String(ctx.from.id));
		if (!actor || ![snapshot.player1.id, snapshot.player2.id].includes(actor.id)) {
			await ctx.answerCallbackQuery({ text: 'Этот бой вам не принадлежит.' });
			return;
		}

		if (command === 'refresh' || command === 'back') {
			await renderView(ctx, snapshot, actor.id, { type: 'default' });
			return;
		}

		if (command === 'hand') {
			await renderView(ctx, snapshot, actor.id, { type: 'hand' });
			return;
		}

		if (command === 'attack') {
			await renderView(ctx, snapshot, actor.id, { type: 'attackers' });
			return;
		}

		if (command === 'attacker') {
			await renderView(ctx, snapshot, actor.id, {
				type: 'targets',
				attackerId: parts[3]
			});
			return;
		}

		if (command === 'play') {
			try {
				await battleService.applyActionForTelegramId({
					battleId,
					telegramId: String(ctx.from.id),
					action: {
						type: 'play_card',
						cardInstanceId: parts[3]
					}
				});
				await refreshBattleViews(bot.api, battleService, battleId);
				await ctx.answerCallbackQuery({ text: 'Карта разыграна.' });
			} catch (error) {
				await ctx.answerCallbackQuery({
					text: error instanceof Error ? error.message : 'Не удалось разыграть карту.'
				});
			}
			return;
		}

		if (command === 'target') {
			try {
				await battleService.applyActionForTelegramId({
					battleId,
					telegramId: String(ctx.from.id),
					action:
						parts[3] === 'hero'
							? {
									type: 'attack',
									attackerId: parts[4],
									target: { type: 'hero' }
								}
							: {
									type: 'attack',
									attackerId: parts[4],
									target: { type: 'unit', unitId: parts[5] }
								}
				});
				await refreshBattleViews(bot.api, battleService, battleId);
				await ctx.answerCallbackQuery({ text: 'Атака выполнена.' });
			} catch (error) {
				await ctx.answerCallbackQuery({
					text: error instanceof Error ? error.message : 'Не удалось выполнить атаку.'
				});
			}
			return;
		}

		if (command === 'end') {
			try {
				await battleService.applyActionForTelegramId({
					battleId,
					telegramId: String(ctx.from.id),
					action: {
						type: 'end_turn'
					}
				});
				await refreshBattleViews(bot.api, battleService, battleId);
				await ctx.answerCallbackQuery({ text: 'Ход завершен.' });
			} catch (error) {
				await ctx.answerCallbackQuery({
					text: error instanceof Error ? error.message : 'Не удалось завершить ход.'
				});
			}
		}
	});
}

async function renderView(
	ctx: Context,
	snapshot: NonNullable<Awaited<ReturnType<BattleService['getBattleSnapshotById']>>>,
	viewerId: string,
	mode: BattleViewMode
): Promise<void> {
	const text =
		mode.type === 'hand'
			? `${renderBattleText(snapshot.state, snapshot.player1, snapshot.player2)}\n\n${renderHandText(snapshot.state, viewerId)}`
			: mode.type === 'attackers'
				? `${renderBattleText(snapshot.state, snapshot.player1, snapshot.player2)}\n\n${renderActionSummary(snapshot.state, viewerId)}`
				: mode.type === 'targets'
					? `${renderBattleText(snapshot.state, snapshot.player1, snapshot.player2)}\n\nВыберите цель для атакующего ${mode.attackerId}.`
					: renderBattleText(snapshot.state, snapshot.player1, snapshot.player2);

	await ctx.editMessageText(text, {
		reply_markup: createBattleKeyboard(snapshot.state, viewerId, mode)
	});
	await ctx.answerCallbackQuery();
}

async function refreshBattleViews(
	api: Api,
	battleService: BattleService,
	battleId: string
): Promise<void> {
	const snapshot = await battleService.getBattleSnapshotById(battleId);
	if (!snapshot) {
		return;
	}

	const refs = await battleService.getBattleMessageRefs(battleId);
	for (const ref of refs) {
		try {
			await api.editMessageText(
				ref.chatId,
				ref.messageId,
				renderBattleText(snapshot.state, snapshot.player1, snapshot.player2),
				{
					reply_markup: createBattleKeyboard(snapshot.state, ref.playerId, {
						type: 'default'
					})
				}
			);
		} catch {
			// Ignore deleted or stale messages in this MVP.
		}
	}
}
