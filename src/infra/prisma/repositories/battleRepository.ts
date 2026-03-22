import { BattleStatus, Prisma, type Battle } from '@prisma/client';
import type { BattleState } from '../../../core/types/BattleState.js';
import { prisma } from '../client.js';

export class BattleRepository {
	async create(data: {
		player1Id: number;
		player2Id: number;
		currentTurnPlayerId: number;
		state: BattleState;
	}): Promise<Battle> {
		return prisma.battle.create({
			data: {
				player1Id: data.player1Id,
				player2Id: data.player2Id,
				currentTurnPlayerId: data.currentTurnPlayerId,
				battleStateJson: data.state as unknown as Prisma.InputJsonValue
			}
		});
	}

	async findById(id: number): Promise<Battle | null> {
		return prisma.battle.findUnique({
			where: { id }
		});
	}

	async findActiveByPlayerId(playerId: number): Promise<Battle | null> {
		return prisma.battle.findFirst({
			where: {
				status: BattleStatus.ACTIVE,
				OR: [{ player1Id: playerId }, { player2Id: playerId }]
			},
			orderBy: {
				updatedAt: 'desc'
			}
		});
	}

	async hasActiveBattle(playerId: number): Promise<boolean> {
		const battle = await prisma.battle.findFirst({
			where: {
				status: BattleStatus.ACTIVE,
				OR: [{ player1Id: playerId }, { player2Id: playerId }]
			},
			select: {
				id: true
			}
		});

		return Boolean(battle);
	}

	async saveState(id: number, state: BattleState): Promise<Battle> {
		return prisma.battle.update({
			where: { id },
			data: {
				battleStateJson: state as unknown as Prisma.InputJsonValue,
				currentTurnPlayerId: state.currentPlayerId,
				status: state.status === 'finished' ? BattleStatus.FINISHED : BattleStatus.ACTIVE,
				winnerId: state.winnerId ?? null,
				finishedAt: state.status === 'finished' ? new Date() : null
			}
		});
	}
}
