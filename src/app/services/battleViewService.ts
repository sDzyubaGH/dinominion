import type { Api } from 'grammy';
import { createBattleKeyboard } from '../../bot/keyboards/battleKeyboard.js';
import { renderBattleText } from '../../infra/telegram/renderer.js';
import { BattleService } from './battleService.js';
import { CardCatalogService } from './cardCatalogService.js';

export class BattleViewService {
	constructor(
		private readonly api: Api,
		private readonly cardCatalogService: CardCatalogService,
		private readonly battleService: BattleService
	) {}

	async sendInitialBattleMessages(battleId: number): Promise<void> {
		const snapshot = await this.battleService.getBattleSnapshotById(battleId);
		if (!snapshot) {
			return;
		}

		const cardLookup = await this.cardCatalogService.getLookupForBattleState(snapshot.state);
		for (const targetPlayer of [snapshot.player1, snapshot.player2]) {
			if (targetPlayer.isBot) {
				continue;
			}

			const sentMessage = await this.api.sendMessage(
				Number(targetPlayer.telegramId),
				renderBattleText(snapshot.state, snapshot.player1, snapshot.player2, cardLookup),
				{
					reply_markup: createBattleKeyboard(
						snapshot.state,
						targetPlayer.id,
						{ type: 'default' },
						cardLookup
					)
				}
			);

			await this.battleService.storeBattleMessageRef(
				snapshot.battle.id,
				targetPlayer.id,
				targetPlayer.telegramId.toString(),
				String(sentMessage.message_id)
			);
		}
	}

	async refreshBattleViews(battleId: number): Promise<void> {
		const snapshot = await this.battleService.getBattleSnapshotById(battleId);
		if (!snapshot) {
			return;
		}

		const cardLookup = await this.cardCatalogService.getLookupForBattleState(snapshot.state);
		const refs = await this.battleService.getBattleMessageRefs(battleId);
		for (const ref of refs) {
			try {
				await this.api.editMessageText(
					ref.chatId,
					ref.messageId,
					renderBattleText(snapshot.state, snapshot.player1, snapshot.player2, cardLookup),
					{
						reply_markup: createBattleKeyboard(
							snapshot.state,
							ref.playerId,
							{ type: 'default' },
							cardLookup
						)
					}
				);
			} catch {
				// Ignore stale or deleted battle messages in this MVP.
			}
		}
	}
}
