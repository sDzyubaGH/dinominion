import { Bot } from 'grammy';
import { env } from '../config/env.js';
import { createServices } from '../app/createServices.js';
import { BattleViewService } from '../app/services/battleViewService.js';
import { registerBattleHandler } from './handlers/battle.js';
import { registerDeckHandler } from './handlers/deck.js';
import { registerPlayHandler } from './handlers/play.js';
import { registerProfileHandler } from './handlers/profile.js';
import { registerStartHandler } from './handlers/start.js';
import { createPendingTextActionsMiddleware } from './middleware/pendingTextActions.js';

const bot = new Bot(env.botToken);
const services = createServices();
const battleViewService = new BattleViewService(
	bot.api,
	services.cardCatalogService,
	services.battleService
);

bot.use(createPendingTextActionsMiddleware(services.playerService, services.deckService));

registerStartHandler(bot, services.playerService);
registerProfileHandler(bot, services.playerService);
registerDeckHandler(bot, services.playerService, services.deckService, services.cardCatalogService);
registerPlayHandler(
	bot,
	services.playerService,
	services.matchmakingService,
	services.battleService,
	battleViewService
);
registerBattleHandler(
	bot,
	services.playerService,
	services.cardCatalogService,
	services.battleService,
	battleViewService
);

bot.catch((error) => {
	console.error('Bot error', error.error);
});

bot.start();
console.log('Dino Clash bot started.');
