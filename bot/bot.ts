import 'dotenv/config';
import { Bot, type BotError, type Context } from 'grammy';
import { registerCommands, type BotStores } from './commands.js';

const token = process.env.BOT_TOKEN;

if (!token) {
	throw new Error(
		'Требуется BOT_TOKEN. Скопируйте .env.example и экспортируйте токен перед запуском бота.'
	);
}

const bot = new Bot(token);

const stores: BotStores = {
	players: new Map(),
	pendingMatches: new Map(),
	matchesByChat: new Map(),
	matchesByPlayer: new Map()
};

registerCommands(bot, stores);

bot.catch((error: BotError<Context>) => {
	console.error('Ошибка бота:', error.error);
});

bot.start();
console.log('Telegram-бот Dinominion запущен.');
