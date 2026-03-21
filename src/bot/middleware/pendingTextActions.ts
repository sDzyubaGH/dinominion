import type { Context, MiddlewareFn } from 'grammy';
import type { DeckService } from '../../app/services/deckService.js';
import type { PlayerService } from '../../app/services/playerService.js';
import { createDeckKeyboard } from '../keyboards/deckKeyboard.js';
import { renderDeckSummary } from '../../infra/telegram/deckRenderer.js';
import { redis } from '../../infra/redis/redis.js';

export function createPendingTextActionsMiddleware(
	playerService: PlayerService,
	deckService: DeckService
): MiddlewareFn<Context> {
	return async (ctx, next) => {
		if (!ctx.from || !ctx.message || typeof ctx.message.text !== 'string') {
			return next();
		}

		const pendingRenameKey = getPendingDeckRenameKey(ctx.from.id);
		const pendingRename = await redis.get(pendingRenameKey);
		if (!pendingRename) {
			return next();
		}
		const pendingDeckId = Number(pendingRename);
		if (!Number.isFinite(pendingDeckId)) {
			await redis.del(pendingRenameKey);
			return next();
		}

		const text = ctx.message.text.trim();
		if (text === '/cancel') {
			await redis.del(pendingRenameKey);
			await ctx.reply('Переименование колоды отменено.');
			return;
		}

		if (text.startsWith('/')) {
			return next();
		}

		const player = await playerService.getProfile(BigInt(ctx.from.id));
		if (!player) {
			await redis.del(pendingRenameKey);
			await ctx.reply('Профиль не найден. Сначала выполните /start.');
			return;
		}

		try {
			await deckService.renameDeck(player.id, pendingDeckId, text);
			await redis.del(pendingRenameKey);

			const deckView = await deckService.getDeck(player.id);
			await ctx.reply(
				[
					`Название колоды обновлено: ${deckView.deck.name}`,
					'',
					renderDeckSummary({
						deckName: deckView.deck.name,
						totalCards: deckView.totalCards,
						groupedCards: deckView.groupedCards
					})
				].join('\n'),
				{
					reply_markup: createDeckKeyboard(
						deckView.groupedCards,
						deckView.decks,
						{ type: 'summary' }
					)
				}
			);
		} catch (error) {
			await ctx.reply(error instanceof Error ? error.message : 'Не удалось изменить название.');
		}
	};
}

export function getPendingDeckRenameKey(telegramId: number): string {
	return `dino:deck:rename:${telegramId}`;
}
