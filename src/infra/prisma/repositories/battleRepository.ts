import { BattleStatus, Prisma, type Battle } from '@prisma/client';
import type { BattleState } from '../../../domain/types/BattleState.js';
import { prisma } from '../client.js';

export class BattleRepository {
	async create(data: {
		id: string;
		player1Id: string;
		player2Id: string;
		currentTurnPlayerId: string;
		state: BattleState;
	}): Promise<Battle> {
		return prisma.battle.create({
			data: {
				id: data.id,
				player1Id: data.player1Id,
				player2Id: data.player2Id,
				currentTurnPlayerId: data.currentTurnPlayerId,
				battleStateJson: data.state as unknown as Prisma.InputJsonValue
			}
		});
	}

	async findById(id: string): Promise<Battle | null> {
		return prisma.battle.findUnique({
			where: { id }
		});
	}

	async findActiveByPlayerId(playerId: string): Promise<Battle | null> {
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

	async saveState(id: string, state: BattleState): Promise<Battle> {
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
