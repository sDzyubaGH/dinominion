import { Bot } from 'grammy';
import { env } from '../config/env.js';
import { BattleService } from '../app/services/battleService.js';
import { DeckService } from '../app/services/deckService.js';
import { MatchmakingService } from '../app/services/matchmakingService.js';
import { PlayerService } from '../app/services/playerService.js';
import { registerBattleHandler } from './handlers/battle.js';
import { registerDeckHandler } from './handlers/deck.js';
import { registerPlayHandler } from './handlers/play.js';
import { registerProfileHandler } from './handlers/profile.js';
import { registerStartHandler } from './handlers/start.js';
import { BattleRepository } from '../infra/prisma/repositories/battleRepository.js';
import { DeckRepository } from '../infra/prisma/repositories/deckRepository.js';
import { PlayerRepository } from '../infra/prisma/repositories/playerRepository.js';
import { redis } from '../infra/redis/redis.js';
import { MatchmakingQueue } from '../infra/redis/queue.js';
import { RedisLockService } from '../infra/redis/locks.js';

const bot = new Bot(env.botToken);

const playerRepository = new PlayerRepository();
const deckRepository = new DeckRepository();
const battleRepository = new BattleRepository();
const deckService = new DeckService(deckRepository);
const playerService = new PlayerService(playerRepository, deckService);
const lockService = new RedisLockService(redis);
const battleService = new BattleService(
	battleRepository,
	playerRepository,
	deckRepository,
	redis,
	lockService
);
const matchmakingQueue = new MatchmakingQueue(redis, lockService);
const matchmakingService = new MatchmakingService(
	matchmakingQueue,
	playerRepository,
	battleService
);

registerStartHandler(bot, playerService);
registerProfileHandler(bot, playerService);
registerDeckHandler(bot, playerService, deckService);
registerPlayHandler(bot, playerService, matchmakingService, battleService);
registerBattleHandler(bot, playerService, battleService);

bot.catch((error) => {
	console.error('Bot error', error.error);
});

bot.start();
console.log('Dino Clash bot started.');
