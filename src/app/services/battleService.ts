import type { Battle, Player } from '@prisma/client';
import type { Redis } from 'ioredis';
import { applyAction, createInitialBattleState } from '../../core/engine/gameEngine.js';
import type { BattleState } from '../../core/types/BattleState.js';
import type { GameAction } from '../../core/types/GameAction.js';
import { BattleRepository } from '../../infra/prisma/repositories/battleRepository.js';
import { DeckRepository } from '../../infra/prisma/repositories/deckRepository.js';
import { PlayerRepository } from '../../infra/prisma/repositories/playerRepository.js';
import { RedisLockService } from '../../infra/redis/locks.js';
import { CardCatalogService } from './cardCatalogService.js';

export interface BattleSnapshot {
	battle: Battle;
	state: BattleState;
	player1: Player;
	player2: Player;
}

export type BattleActionInput =
	| {
			type: 'play_card';
			cardInstanceId: number;
	  }
	| {
			type: 'attack';
			attackerId: number;
			target:
				| {
						type: 'hero';
				  }
				| {
						type: 'unit';
						unitId: number;
				  };
	  }
	| {
			type: 'end_turn';
	  };

export class BattleService {
	constructor(
		private readonly battleRepository: BattleRepository,
		private readonly playerRepository: PlayerRepository,
		private readonly deckRepository: DeckRepository,
		private readonly redis: Redis,
		private readonly lockService: RedisLockService,
		private readonly cardCatalogService: CardCatalogService
	) {}

	async createBattle(player1: Player, player2: Player): Promise<BattleSnapshot> {
		const deck1 = await this.deckRepository.findByPlayerId(player1.id);
		const deck2 = await this.deckRepository.findByPlayerId(player2.id);
		if (!deck1 || !deck2) {
			throw new Error('Both players must have a deck.');
		}

		const cardLookup = await this.cardCatalogService.getLookupByIds([
			...(deck1.cardsJson as string[]),
			...(deck2.cardsJson as string[])
		]);
		const startingPlayerId = player1.id;
		const battle = await this.battleRepository.create({
			player1Id: player1.id,
			player2Id: player2.id,
			currentTurnPlayerId: startingPlayerId,
			state: {} as BattleState
		});
		const state = createInitialBattleState({
			battleId: battle.id,
			player1Id: player1.id,
			player2Id: player2.id,
			player1Deck: shuffleDeck(deck1.cardsJson as string[]),
			player2Deck: shuffleDeck(deck2.cardsJson as string[]),
			startingPlayerId,
			cardLookup
		});

		const persistedBattle = await this.battleRepository.saveState(battle.id, state);

		await this.cacheState(battle.id, state);
		await this.redis.set(this.activeBattleKey(player1.id), String(battle.id));
		await this.redis.set(this.activeBattleKey(player2.id), String(battle.id));

		return {
			battle: persistedBattle,
			state,
			player1,
			player2
		};
	}

	async getActiveBattleForTelegramId(telegramId: bigint): Promise<BattleSnapshot | null> {
		const player = await this.playerRepository.findByTelegramId(telegramId);
		if (!player) {
			return null;
		}

		const battleId =
			(await this.redis.get(this.activeBattleKey(player.id))) ??
			(await this.findAndCacheActiveBattle(player.id));
		if (!battleId) {
			return null;
		}

		return this.getBattleSnapshotById(Number(battleId));
	}

	async getBattleSnapshotById(battleId: number): Promise<BattleSnapshot | null> {
		const battle = await this.battleRepository.findById(battleId);
		if (!battle) {
			return null;
		}

		const player1 = await this.playerRepository.findById(battle.player1Id);
		const player2 = await this.playerRepository.findById(battle.player2Id);
		if (!player1 || !player2) {
			throw new Error('Battle players not found.');
		}

		const state = await this.loadState(battle);
		return {
			battle,
			state,
			player1,
			player2
		};
	}

	async applyActionForTelegramId(params: {
		battleId: number;
		telegramId: bigint;
		action: BattleActionInput;
	}): Promise<{ snapshot: BattleSnapshot; actor: Player }> {
		const actor = await this.playerRepository.findByTelegramId(params.telegramId);
		if (!actor) {
			throw new Error('Player not registered.');
		}

		return this.lockService.withLock(this.battleLockKey(params.battleId), 5000, async () => {
			const snapshot = await this.getBattleSnapshotById(params.battleId);
			if (!snapshot) {
				throw new Error('Battle not found.');
			}

			if (![snapshot.player1.id, snapshot.player2.id].includes(actor.id)) {
				throw new Error('Player is not part of this battle.');
			}

			const cardLookup = await this.cardCatalogService.getLookupForBattleState(snapshot.state);
			const result = applyAction(
				snapshot.state,
				{
					...params.action,
					playerId: actor.id
				} as GameAction,
				cardLookup
			);
			if (!result.ok) {
				throw new Error(result.error ?? 'Action failed.');
			}

			const updatedBattle = await this.battleRepository.saveState(
				snapshot.battle.id,
				result.state
			);
			await this.cacheState(snapshot.battle.id, result.state);

			if (result.state.status === 'finished') {
				await this.redis.del(this.activeBattleKey(snapshot.player1.id));
				await this.redis.del(this.activeBattleKey(snapshot.player2.id));
			}

			return {
				actor,
				snapshot: {
					...snapshot,
					battle: updatedBattle,
					state: result.state
				}
			};
		});
	}

	async storeBattleMessageRef(
		battleId: number,
		playerId: number,
		chatId: string,
		messageId: string
	): Promise<void> {
		await this.redis.hset(
			this.battleViewsKey(battleId),
			String(playerId),
			`${chatId}:${messageId}`
		);
	}

	async getBattleMessageRefs(
		battleId: number
	): Promise<Array<{ playerId: number; chatId: number; messageId: number }>> {
		const entries = await this.redis.hgetall(this.battleViewsKey(battleId));
		return Object.entries(entries).map(([playerId, value]) => {
			const serialized = String(value);
			const [chatId, messageId] = serialized.split(':');
			return {
				playerId: Number(playerId),
				chatId: Number(chatId),
				messageId: Number(messageId)
			};
		});
	}

	private async findAndCacheActiveBattle(playerId: number): Promise<number | null> {
		const battle = await this.battleRepository.findActiveByPlayerId(playerId);
		if (!battle) {
			return null;
		}

		await this.redis.set(this.activeBattleKey(playerId), String(battle.id));
		return battle.id;
	}

	private async loadState(battle: Battle): Promise<BattleState> {
		const cached = await this.redis.get(this.battleStateKey(battle.id));
		if (cached) {
			return JSON.parse(cached) as BattleState;
		}

		const state = battle.battleStateJson as unknown as BattleState;
		await this.cacheState(battle.id, state);
		return state;
	}

	private async cacheState(battleId: number, state: BattleState): Promise<void> {
		await this.redis.set(this.battleStateKey(battleId), JSON.stringify(state));
	}

	private activeBattleKey(playerId: number): string {
		return `dino:player:${playerId}:active_battle`;
	}

	private battleStateKey(battleId: number): string {
		return `dino:battle:${battleId}:state`;
	}

	private battleViewsKey(battleId: number): string {
		return `dino:battle:${battleId}:views`;
	}

	private battleLockKey(battleId: number): string {
		return `dino:battle:${battleId}:lock`;
	}
}

function shuffleDeck(deck: string[]): string[] {
	const copy = [...deck];
	for (let index = copy.length - 1; index > 0; index -= 1) {
		const swapIndex = Math.floor(Math.random() * (index + 1));
		[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
	}
	return copy;
}
