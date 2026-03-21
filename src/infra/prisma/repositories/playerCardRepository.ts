import type { Card, PlayerCard } from '@prisma/client';
import { prisma } from '../client.js';

export type PlayerCardWithCard = PlayerCard & { card: Card };

export class PlayerCardRepository {
	async findManyByPlayerId(playerId: number): Promise<PlayerCardWithCard[]> {
		return prisma.playerCard.findMany({
			where: { playerId },
			include: {
				card: true
			}
		});
	}

	async upsertQuantity(playerId: number, cardId: number, quantity: number): Promise<PlayerCard> {
		return prisma.playerCard.upsert({
			where: {
				playerId_cardId: {
					playerId,
					cardId
				}
			},
			update: {
				quantity
			},
			create: {
				playerId,
				cardId,
				quantity
			}
		});
	}
}
