import { BattleRepository } from '../infra/prisma/repositories/battleRepository.js';
import { CardRepository } from '../infra/prisma/repositories/cardRepository.js';
import { DeckRepository } from '../infra/prisma/repositories/deckRepository.js';
import { PlayerCardRepository } from '../infra/prisma/repositories/playerCardRepository.js';
import { PlayerRepository } from '../infra/prisma/repositories/playerRepository.js';
import { redis } from '../infra/redis/redis.js';
import { MatchmakingQueue } from '../infra/redis/queue.js';
import { RedisLockService } from '../infra/redis/locks.js';
import { AiTurnQueue } from '../infra/redis/aiQueue.js';
import { BattleService } from './services/battleService.js';
import { CardCatalogService } from './services/cardCatalogService.js';
import { CollectionService } from './services/collectionService.js';
import { DeckService } from './services/deckService.js';
import { MatchmakingService } from './services/matchmakingService.js';
import { PlayerService } from './services/playerService.js';
import { AiPlayerService } from './services/aiPlayerService.js';
import { AiService } from './services/aiService.js';

export function createServices() {
	const playerRepository = new PlayerRepository();
	const deckRepository = new DeckRepository();
	const battleRepository = new BattleRepository();
	const cardRepository = new CardRepository();
	const playerCardRepository = new PlayerCardRepository();
	const lockService = new RedisLockService(redis);
	const aiTurnQueue = new AiTurnQueue(redis);
	const cardCatalogService = new CardCatalogService(cardRepository);
	const collectionService = new CollectionService(playerCardRepository, cardRepository);
	const deckService = new DeckService(deckRepository, cardCatalogService, collectionService);
	const playerService = new PlayerService(playerRepository, collectionService, deckService);
	const battleService = new BattleService(
		battleRepository,
		playerRepository,
		deckRepository,
		redis,
		lockService,
		cardCatalogService,
		aiTurnQueue
	);
	const aiPlayerService = new AiPlayerService(
		battleRepository,
		playerRepository,
		deckRepository,
		collectionService,
		deckService
	);
	const matchmakingQueue = new MatchmakingQueue(redis, lockService);
	const matchmakingService = new MatchmakingService(
		matchmakingQueue,
		playerRepository,
		battleService,
		aiPlayerService
	);
	const aiService = new AiService(battleService, cardCatalogService, playerRepository);

	return {
		playerRepository,
		deckRepository,
		battleRepository,
		cardRepository,
		playerCardRepository,
		lockService,
		aiTurnQueue,
		cardCatalogService,
		collectionService,
		deckService,
		playerService,
		battleService,
		matchmakingQueue,
		matchmakingService,
		aiPlayerService,
		aiService
	};
}
