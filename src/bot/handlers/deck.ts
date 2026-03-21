import type { Bot, Context } from 'grammy';
import type { CardCatalogService } from '../../app/services/cardCatalogService.js';
import type { DeckService } from '../../app/services/deckService.js';
import type { PlayerService } from '../../app/services/playerService.js';
import { createDeckKeyboard, getDeckPageSize, type DeckViewMode } from '../keyboards/deckKeyboard.js';
import {
	renderDeckCardDetails,
	renderDeckCardsPage,
	renderDeckEditMenu,
	renderDeckSummary,
	renderDeckSwitchMenu
} from '../../infra/telegram/deckRenderer.js';
import { redis } from '../../infra/redis/redis.js';
import { getPendingDeckRenameKey } from '../middleware/pendingTextActions.js';

export function registerDeckHandler(
	bot: Bot<Context>,
	playerService: PlayerService,
	deckService: DeckService,
	cardCatalogService: CardCatalogService
): void {
	bot.command('deck', async (ctx) => {
		if (!ctx.from) {
			return;
		}

		const player = await playerService.registerOrGet(BigInt(ctx.from.id), ctx.from.username);
		const deckView = await deckService.getDeck(player.id);
		await ctx.reply(
			renderDeckSummary({
				deckName: deckView.deck.name,
				totalCards: deckView.totalCards,
				groupedCards: deckView.groupedCards
			}),
			{
				reply_markup: createDeckKeyboard(deckView.groupedCards, deckView.decks, {
					type: 'summary'
				})
			}
		);
	});

	bot.callbackQuery(/^(deck:|d:)/, async (ctx) => {
		if (!ctx.from || !ctx.callbackQuery.data) {
			return;
		}

		const player = await playerService.getProfile(BigInt(ctx.from.id));
		if (!player) {
			await ctx.answerCallbackQuery({ text: 'Профиль не найден. Сначала выполните /start.' });
			return;
		}

		const deckView = await deckService.getDeck(player.id);
		const mode = parseDeckCallbackData(ctx.callbackQuery.data);
		const cardLookup = await cardCatalogService.getLookup();

		if (mode.type === 'noop') {
			await ctx.answerCallbackQuery();
			return;
		}

		if (mode.type === 'edit') {
			await ctx.editMessageText(renderDeckEditMenu(deckView.deck.name), {
				reply_markup: createDeckKeyboard(deckView.groupedCards, deckView.decks, { type: 'edit' })
			});
			await ctx.answerCallbackQuery();
			return;
		}

		if (mode.type === 'switch') {
			await ctx.editMessageText(
				renderDeckSwitchMenu({
					currentDeckName: deckView.deck.name,
					decks: deckView.decks
				}),
				{
					reply_markup: createDeckKeyboard(deckView.groupedCards, deckView.decks, {
						type: 'switch'
					})
				}
			);
			await ctx.answerCallbackQuery();
			return;
		}

		if (mode.type === 'close') {
			await ctx.answerCallbackQuery({ text: 'Вы уже на экране колоды.' });
			return;
		}

		if (mode.type === 'rename') {
			await redis.set(getPendingDeckRenameKey(ctx.from.id), String(deckView.deck.id), 'EX', 300);
			await ctx.answerCallbackQuery({ text: 'Отправьте новое название колоды в чат.' });
			await ctx.reply(
				'Отправьте новое название колоды следующим сообщением. Для отмены используйте /cancel.',
				{
					reply_markup: { force_reply: true }
				}
			);
			return;
		}

		if (mode.type === 'selectDeck') {
			await deckService.switchCurrentDeck(player.id, mode.deckId);
			const updatedDeckView = await deckService.getDeck(player.id);
			await ctx.editMessageText(
				renderDeckSummary({
					deckName: updatedDeckView.deck.name,
					totalCards: updatedDeckView.totalCards,
					groupedCards: updatedDeckView.groupedCards
				}),
				{
					reply_markup: createDeckKeyboard(
						updatedDeckView.groupedCards,
						updatedDeckView.decks,
						{ type: 'summary' }
					)
				}
			);
			await ctx.answerCallbackQuery({ text: `Текущая колода: ${updatedDeckView.deck.name}` });
			return;
		}

		const view = resolveDeckView(mode, deckView.groupedCards);
		const text =
			view.type === 'summary'
				? renderDeckSummary({
						deckName: deckView.deck.name,
						totalCards: deckView.totalCards,
						groupedCards: deckView.groupedCards
					})
				: view.type === 'edit'
					? renderDeckEditMenu(deckView.deck.name)
				: view.type === 'switch'
					? renderDeckSwitchMenu({
							currentDeckName: deckView.deck.name,
							decks: deckView.decks
						})
				: view.type === 'cards'
					? renderDeckCardsPage({
							deckName: deckView.deck.name,
							page: view.page,
							totalPages: Math.max(
								1,
								Math.ceil(deckView.groupedCards.length / getDeckPageSize())
							),
							items: deckView.groupedCards.slice(
								view.page * getDeckPageSize(),
								view.page * getDeckPageSize() + getDeckPageSize()
							)
						})
					: renderDeckCardDetails(
							deckView.groupedCards.find((item) => item.cardId === view.cardId)?.definition ??
								deckView.groupedCards[0].definition,
							cardLookup
						);

		await ctx.editMessageText(text, {
			reply_markup: createDeckKeyboard(deckView.groupedCards, deckView.decks, view)
		});
		await ctx.answerCallbackQuery();
	});
}

type ParsedDeckCallback =
	| { type: 'summary' }
	| { type: 'edit' }
	| { type: 'switch' }
	| { type: 'cards'; page: number }
	| { type: 'card'; page: number; cardId: string }
	| { type: 'rename' }
	| { type: 'selectDeck'; deckId: number }
	| { type: 'close' }
	| { type: 'noop' };

type ParsedDeckViewCallback = Extract<
	ParsedDeckCallback,
	{ type: 'summary' | 'edit' | 'switch' | 'cards' | 'card' }
>;

function parseDeckCallbackData(data: string): ParsedDeckCallback {
	const parts = data.split(':');

	if (parts[0] === 'd') {
		switch (parts[1]) {
			case 'v':
				return { type: 'cards', page: Number(parts[2] ?? 0) };
			case 'c':
				return { type: 'card', page: Number(parts[2] ?? 0), cardId: String(parts[3] ?? '') };
			case 's':
				return { type: 'summary' };
			case 'm':
				return { type: 'edit' };
			case 'w':
				return { type: 'switch' };
			case 'r':
				return { type: 'rename' };
			case 'sc':
				return { type: 'selectDeck', deckId: Number(parts[2]) };
			case 'x':
				return { type: 'close' };
			case 'i':
				return { type: 'noop' };
		}
	}

	if (parts[0] === 'deck') {
		switch (parts[1]) {
			case 'view':
				return { type: 'cards', page: Number(parts[2] ?? 0) };
			case 'card':
				return { type: 'card', page: Number(parts[2] ?? 0), cardId: String(parts[3] ?? '') };
			case 'summary':
				return { type: 'summary' };
			case 'edit':
				return { type: 'edit' };
			case 'switch':
				return { type: 'switch' };
			case 'rename':
				return { type: 'rename' };
			case 'select':
				return { type: 'selectDeck', deckId: Number(parts[2]) };
			case 'close':
				return { type: 'close' };
			case 'info':
				return { type: 'noop' };
		}
	}

	throw new Error(`Unknown deck callback: ${data}`);
}

function resolveDeckView(
	mode: ParsedDeckViewCallback,
	groupedCards: Array<{
		cardId: string;
		definition: { name: string };
		count: number;
	}>
): DeckViewMode {
	if (mode.type === 'summary') {
		return { type: 'summary' };
	}

	if (mode.type === 'edit') {
		return { type: 'edit' };
	}

	if (mode.type === 'switch') {
		return { type: 'switch' };
	}

	if (mode.type === 'cards') {
		const totalPages = Math.max(1, Math.ceil(groupedCards.length / getDeckPageSize()));
		return {
			type: 'cards',
			page: clampDeckPage(mode.page, totalPages)
		};
	}

	const totalPages = Math.max(1, Math.ceil(groupedCards.length / getDeckPageSize()));
	const page = clampDeckPage(mode.page, totalPages);
	const card = groupedCards.find((item) => item.cardId === mode.cardId);

	if (!card) {
		return {
			type: 'cards',
			page
		};
	}

	return {
		type: 'card',
		page,
		cardId: card.cardId
	};
}

function clampDeckPage(page: number, totalPages: number): number {
	return Math.min(Math.max(page, 0), totalPages - 1);
}
