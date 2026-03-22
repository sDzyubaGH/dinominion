import { Bot } from 'grammy';
import { env } from '../config/env.js';
import { createServices } from '../app/createServices.js';
import { BattleViewService } from '../app/services/battleViewService.js';

const AI_MATCH_TIMEOUT_MS = 30_000;

async function main(): Promise<void> {
	const bot = new Bot(env.botToken);
	const services = createServices();
	const battleViewService = new BattleViewService(
		bot.api,
		services.cardCatalogService,
		services.battleService
	);

	await services.aiPlayerService.ensureAvailableAiPlayer();

	while (true) {
		const battleId = await services.aiTurnQueue.popTurn(2);
		if (battleId) {
			try {
				await services.aiService.playTurnLoop(battleId);
				await battleViewService.refreshBattleViews(battleId);
			} catch (error) {
				console.error('AI turn failed', error);
			} finally {
				await services.aiTurnQueue.clearScheduled(battleId);
			}
		}

		try {
			const timedOutMatch = await services.matchmakingService.matchTimedOutPlayerWithAi(
				AI_MATCH_TIMEOUT_MS
			);
			if (!timedOutMatch) {
				continue;
			}

			const player = await services.playerRepository.findById(timedOutMatch.playerId);
			if (player && !player.isBot) {
				await bot.api.sendMessage(
					Number(player.telegramId),
					'Соперник найден: тренировочный бот.'
				);
			}
			await battleViewService.sendInitialBattleMessages(timedOutMatch.battleId);
			await battleViewService.refreshBattleViews(timedOutMatch.battleId);
		} catch (error) {
			console.error('AI matchmaking fallback failed', error);
		}
	}
}

main().catch((error) => {
	console.error('AI worker failed', error);
	process.exitCode = 1;
});
