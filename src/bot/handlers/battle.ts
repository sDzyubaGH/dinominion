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
import { STARTER_CARD_MAP } from '../../../cards/starterCards.js';

export function registerBattleHandler(
	bot: Bot<Context>,
	playerService: PlayerService,
	battleService: BattleService
): void {
	bot.command('battle', async (ctx) => {
		if (!ctx.from) {
			return;
		}

		const player = await playerService.registerOrGet(BigInt(ctx.from.id), ctx.from.username);
		const snapshot = await battleService.getActiveBattleForTelegramId(BigInt(ctx.from.id));
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
			ctx.from.id.toString(),
			String(sentMessage.message_id)
		);
	});

	bot.callbackQuery(/^(battle:|b:)/, async (ctx) => {
		if (!ctx.from || !ctx.callbackQuery.data) {
			return;
		}

		const actor = await playerService.getProfile(BigInt(ctx.from.id));
		if (!actor) {
			await ctx.answerCallbackQuery({ text: 'Профиль не найден.' });
			return;
		}

		const parsed = parseBattleCallbackData(ctx.callbackQuery.data);
		const snapshot = parsed.battleId
			? await battleService.getBattleSnapshotById(parsed.battleId)
			: await battleService.getActiveBattleForTelegramId(BigInt(ctx.from.id));
		if (!snapshot) {
			await ctx.answerCallbackQuery({ text: 'Бой не найден.' });
			return;
		}
		if (![snapshot.player1.id, snapshot.player2.id].includes(actor.id)) {
			await ctx.answerCallbackQuery({ text: 'Этот бой вам не принадлежит.' });
			return;
		}

		if (parsed.command === 'refresh' || parsed.command === 'back') {
			await renderView(ctx, snapshot, actor.id, { type: 'default' });
			return;
		}

		if (parsed.command === 'hand') {
			await renderView(ctx, snapshot, actor.id, { type: 'hand' });
			return;
		}

		if (parsed.command === 'attack') {
			await renderView(ctx, snapshot, actor.id, { type: 'attackers' });
			return;
		}

		if (parsed.command === 'attacker' && parsed.attackerId) {
			await renderView(ctx, snapshot, actor.id, {
				type: 'targets',
				attackerId: parsed.attackerId
			});
			return;
		}

		if (parsed.command === 'play' && parsed.cardInstanceId) {
			try {
				await battleService.applyActionForTelegramId({
					battleId: snapshot.battle.id,
					telegramId: BigInt(ctx.from.id),
					action: {
						type: 'play_card',
						cardInstanceId: parsed.cardInstanceId
					}
				});
				await refreshBattleViews(bot.api, battleService, snapshot.battle.id);
				await ctx.answerCallbackQuery({ text: 'Карта разыграна.' });
			} catch (error) {
				await ctx.answerCallbackQuery({
					text: error instanceof Error ? error.message : 'Не удалось разыграть карту.'
				});
			}
			return;
		}

		if (parsed.command === 'target_hero' && parsed.attackerId) {
			try {
				await battleService.applyActionForTelegramId({
					battleId: snapshot.battle.id,
					telegramId: BigInt(ctx.from.id),
					action: {
						type: 'attack',
						attackerId: parsed.attackerId,
						target: { type: 'hero' }
					}
				});
				await refreshBattleViews(bot.api, battleService, snapshot.battle.id);
				await ctx.answerCallbackQuery({ text: 'Атака выполнена.' });
			} catch (error) {
				await ctx.answerCallbackQuery({
					text: error instanceof Error ? error.message : 'Не удалось выполнить атаку.'
				});
			}
			return;
		}

		if (parsed.command === 'target_unit' && parsed.attackerId && parsed.targetUnitId) {
			try {
				await battleService.applyActionForTelegramId({
					battleId: snapshot.battle.id,
					telegramId: BigInt(ctx.from.id),
					action: {
						type: 'attack',
						attackerId: parsed.attackerId,
						target: { type: 'unit', unitId: parsed.targetUnitId }
					}
				});
				await refreshBattleViews(bot.api, battleService, snapshot.battle.id);
				await ctx.answerCallbackQuery({ text: 'Атака выполнена.' });
			} catch (error) {
				await ctx.answerCallbackQuery({
					text: error instanceof Error ? error.message : 'Не удалось выполнить атаку.'
				});
			}
			return;
		}

		if (parsed.command === 'end') {
			try {
				await battleService.applyActionForTelegramId({
					battleId: snapshot.battle.id,
					telegramId: BigInt(ctx.from.id),
					action: {
						type: 'end_turn'
					}
				});
				await refreshBattleViews(bot.api, battleService, snapshot.battle.id);
				await ctx.answerCallbackQuery({ text: 'Ход завершен.' });
			} catch (error) {
				await ctx.answerCallbackQuery({
					text: error instanceof Error ? error.message : 'Не удалось завершить ход.'
				});
			}
			return;
		}

		await ctx.answerCallbackQuery({ text: 'Неизвестное действие.' });
	});
}

async function renderView(
	ctx: Context,
	snapshot: NonNullable<Awaited<ReturnType<BattleService['getBattleSnapshotById']>>>,
	viewerId: number,
	mode: BattleViewMode
): Promise<void> {
	const attackerName =
		mode.type === 'targets'
			? snapshot.state.players[viewerId].board.find(
					(unit) => unit.instanceId === mode.attackerId
				)
			: undefined;
	const text =
		mode.type === 'hand'
			? `${renderBattleText(snapshot.state, snapshot.player1, snapshot.player2)}\n\n${renderHandText(snapshot.state, viewerId)}`
			: mode.type === 'attackers'
				? `${renderBattleText(snapshot.state, snapshot.player1, snapshot.player2)}\n\n${renderActionSummary(snapshot.state, viewerId)}`
				: mode.type === 'targets'
					? `${renderBattleText(snapshot.state, snapshot.player1, snapshot.player2)}\n\nВыберите цель для ${attackerName ? (STARTER_CARD_MAP.get(attackerName.cardId)?.name ?? mode.attackerId) : mode.attackerId}.`
					: renderBattleText(snapshot.state, snapshot.player1, snapshot.player2);

	await ctx.editMessageText(text, {
		reply_markup: createBattleKeyboard(snapshot.state, viewerId, mode)
	});
	await ctx.answerCallbackQuery();
}

async function refreshBattleViews(
	api: Api,
	battleService: BattleService,
	battleId: number
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

type ParsedBattleCallback =
	| { battleId?: number; command: 'refresh' | 'back' | 'hand' | 'attack' | 'end' }
	| { battleId?: number; command: 'attacker'; attackerId: number }
	| { battleId?: number; command: 'play'; cardInstanceId: number }
	| { battleId?: number; command: 'target_hero'; attackerId: number }
	| { battleId?: number; command: 'target_unit'; attackerId: number; targetUnitId: number };

function parseBattleCallbackData(data: string): ParsedBattleCallback {
	const parts = data.split(':');

	if (parts[0] === 'b') {
		switch (parts[1]) {
			case 'r':
				return { command: 'refresh' };
			case 'b':
				return { command: 'back' };
			case 'h':
				return { command: 'hand' };
			case 'a':
				return { command: 'attack' };
			case 'e':
				return { command: 'end' };
			case 'aa':
				return { command: 'attacker', attackerId: Number(parts[2]) };
			case 'p':
				return { command: 'play', cardInstanceId: Number(parts[2]) };
			case 'th':
				return { command: 'target_hero', attackerId: Number(parts[2]) };
			case 'tu':
				return {
					command: 'target_unit',
					attackerId: Number(parts[2]),
					targetUnitId: Number(parts[3])
				};
			default:
				return { command: 'refresh' };
		}
	}

	return parseLegacyBattleCallbackData(parts);
}

function parseLegacyBattleCallbackData(parts: string[]): ParsedBattleCallback {
	const battleId = Number(parts[1]);
	const command = parts[2];

	if (command === 'refresh') {
		return { battleId, command: 'refresh' };
	}
	if (command === 'back') {
		return { battleId, command: 'back' };
	}
	if (command === 'hand') {
		return { battleId, command: 'hand' };
	}
	if (command === 'attack') {
		return { battleId, command: 'attack' };
	}
	if (command === 'end') {
		return { battleId, command: 'end' };
	}
	if (command === 'attacker') {
		return { battleId, command: 'attacker', attackerId: Number(parts[3]) };
	}
	if (command === 'play') {
		return { battleId, command: 'play', cardInstanceId: Number(parts[3]) };
	}
	if (command === 'target' && parts[3] === 'hero') {
		return { battleId, command: 'target_hero', attackerId: Number(parts[4]) };
	}
	return {
		battleId,
		command: 'target_unit',
		attackerId: Number(parts[4]),
		targetUnitId: Number(parts[5])
	};
}
