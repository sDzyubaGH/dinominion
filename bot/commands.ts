import { InlineKeyboard, type Bot, type Context } from 'grammy';
import { buildStarterDeck } from '../cards/cards.js';
import { buildBattleKeyboard, handleBattleAction, renderBattlefield } from './battle.js';
import { createMatch, getPlayer, mustCard, type MatchState } from './gameEngine.js';
import type { RegisteredPlayer } from './player.js';

interface PendingMatch {
	chatId: number;
	ownerId: number;
}

export interface BotStores {
	players: Map<number, RegisteredPlayer>;
	pendingMatches: Map<number, PendingMatch>;
	matchesByChat: Map<number, MatchState>;
	matchesByPlayer: Map<number, MatchState>;
}

export function registerCommands(bot: Bot<Context>, stores: BotStores): void {
	bot.command('start', async (ctx: Context) => {
		const user = ctx.from;
		if (!user) {
			return;
		}

		stores.players.set(user.id, {
			id: user.id,
			username: user.username,
			displayName: user.first_name,
			deck: buildStarterDeck()
		});

		await ctx.reply(
			[
				`Командир зарегистрирован: ${user.first_name}`,
				'Используйте /deck, чтобы посмотреть стартовую колоду.',
				'Используйте /play в групповом чате, чтобы открыть лобби матча.'
			].join('\n')
		);
	});

	bot.command('deck', async (ctx: Context) => {
		const user = ctx.from;
		if (!user) {
			return;
		}
		const player =
			stores.players.get(user.id) ??
			autoRegister(stores, user.id, user.first_name, user.username);
		const counts = new Map<string, number>();
		for (const card of player.deck) {
			counts.set(card, (counts.get(card) ?? 0) + 1);
		}

		const lines = ['Стартовая колода (30 карт):'];
		for (const [cardId, count] of counts.entries()) {
			lines.push(`- ${mustCard(cardId).name} x${count}`);
		}
		await ctx.reply(lines.join('\n'));
	});

	bot.command('play', async (ctx: Context) => {
		const user = ctx.from;
		const chat = ctx.chat;
		if (!user || !chat) {
			return;
		}
		if (chat.type === 'private') {
			await ctx.reply(
				'Запустите /play в групповом чате, чтобы к матчу мог присоединиться второй игрок.'
			);
			return;
		}
		const existingMatch = stores.matchesByChat.get(chat.id);
		if (existingMatch?.winnerId) {
			stores.matchesByChat.delete(chat.id);
			for (const playerState of existingMatch.players) {
				stores.matchesByPlayer.delete(playerState.id);
			}
		} else if (existingMatch) {
			await ctx.reply('В этом чате уже идет матч.');
			return;
		}
		if (stores.pendingMatches.has(chat.id)) {
			await ctx.reply('В этом чате уже открыто лобби.');
			return;
		}

		autoRegister(stores, user.id, user.first_name, user.username);
		stores.pendingMatches.set(chat.id, { chatId: chat.id, ownerId: user.id });

		const keyboard = new InlineKeyboard().text(
			'Присоединиться к матчу',
			`join:${chat.id}:${user.id}`
		);
		await ctx.reply(
			`${user.first_name} открыл лобби Dinominion. Второй игрок может присоединиться ниже.`,
			{
				reply_markup: keyboard
			}
		);
	});

	bot.command('hand', async (ctx: Context) => {
		const match = ctx.from ? stores.matchesByPlayer.get(ctx.from.id) : undefined;
		if (!ctx.from || !match) {
			await ctx.reply('Вы не участвуете в активном матче.');
			return;
		}

		const player = getPlayer(match, ctx.from.id);
		if (!player) {
			await ctx.reply('Состояние игрока не найдено.');
			return;
		}

		const lines = [
			`Рука игрока ${player.displayName} (${player.hand.length})`,
			...player.hand.map((card, index) => {
				const definition = mustCard(card.definitionId);
				return `${index + 1}. ${definition.name} | Стоимость ${definition.energyCost} | ${definition.description}`;
			})
		];
		await ctx.reply(lines.join('\n'));
	});

	bot.command('board', async (ctx: Context) => {
		const match = ctx.from ? stores.matchesByPlayer.get(ctx.from.id) : undefined;
		if (!ctx.from || !match) {
			await ctx.reply('Вы не участвуете в активном матче.');
			return;
		}

		await ctx.reply(renderBattlefield(match));
	});

	bot.on('callback_query:data', async (ctx: Context) => {
		const user = ctx.from;
		const data = ctx.callbackQuery?.data;
		if (!user || !data) {
			return;
		}

		if (data.startsWith('join:')) {
			const [, chatIdRaw, ownerIdRaw] = data.split(':');
			const chatId = Number(chatIdRaw);
			const ownerId = Number(ownerIdRaw);
			const pending = stores.pendingMatches.get(chatId);

			if (!pending || pending.ownerId !== ownerId) {
				await ctx.answerCallbackQuery({ text: 'Это лобби больше недоступно.' });
				return;
			}
			if (user.id === ownerId) {
				await ctx.answerCallbackQuery({
					text: 'Нужен второй игрок, а не создатель лобби.'
				});
				return;
			}

			const left = stores.players.get(ownerId);
			const right =
				stores.players.get(user.id) ??
				autoRegister(stores, user.id, user.first_name, user.username);
			if (!left) {
				await ctx.answerCallbackQuery({
					text: 'Создатель лобби не зарегистрирован. Попросите его выполнить /start.'
				});
				return;
			}

			const match = createMatch(chatId, left, right);
			stores.pendingMatches.delete(chatId);
			stores.matchesByChat.set(chatId, match);
			stores.matchesByPlayer.set(left.id, match);
			stores.matchesByPlayer.set(right.id, match);

			const sent = await ctx.api.sendMessage(chatId, renderBattlefield(match), {
				reply_markup: buildBattleKeyboard(match, match.players[match.activePlayerIndex].id)
			});
			match.battleMessageId = sent.message_id;
			await ctx.answerCallbackQuery({ text: 'Матч начался.' });
			return;
		}

		if (!data.startsWith('battle:')) {
			await ctx.answerCallbackQuery({ text: 'Неподдерживаемое действие.' });
			return;
		}

		const payload = data.split(':');
		const ownerId = Number(payload[2]);
		const match = stores.matchesByPlayer.get(ownerId);
		if (!match) {
			await ctx.answerCallbackQuery({ text: 'Матч не найден.' });
			return;
		}

		const notice = handleBattleAction(match, user.id, payload);
		if (match.battleMessageId) {
			const activeViewer = match.winnerId
				? ownerId
				: match.players[match.activePlayerIndex].id;
			await ctx.api.editMessageText(
				match.chatId,
				match.battleMessageId,
				renderBattlefield(match),
				{
					reply_markup: buildBattleKeyboard(match, activeViewer)
				}
			);
		}
		await ctx.answerCallbackQuery({ text: notice });
	});
}

function autoRegister(
	stores: BotStores,
	id: number,
	displayName: string,
	username?: string
): RegisteredPlayer {
	const existing = stores.players.get(id);
	if (existing) {
		return existing;
	}

	const player: RegisteredPlayer = {
		id,
		username,
		displayName,
		deck: buildStarterDeck()
	};
	stores.players.set(id, player);
	return player;
}
