import type { Card, CardEffect } from '@prisma/client';
import { prisma } from '../client.js';

export type CardWithEffects = Card & { effects: CardEffect[] };

export class CardRepository {
	async findAllWithEffects(): Promise<CardWithEffects[]> {
		return prisma.card.findMany({
			include: {
				effects: true
			}
		});
	}

	async findAllActiveWithEffects(): Promise<CardWithEffects[]> {
		return prisma.card.findMany({
			where: {
				isActive: true
			},
			include: {
				effects: true
			}
		});
	}
}
