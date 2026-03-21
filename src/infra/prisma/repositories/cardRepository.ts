import type { Card, CardEffect } from '@prisma/client';
import { prisma } from '../client.js';

export type CardWithEffects = Card & { effects: CardEffect[] };

export class CardRepository {
	async findManyBySlugs(cardSlugs: string[]): Promise<Card[]> {
		return prisma.card.findMany({
			where: {
				slug: {
					in: cardSlugs
				}
			}
		});
	}

	async findAllWithEffects(): Promise<CardWithEffects[]> {
		return prisma.card.findMany({
			include: {
				effects: {
					orderBy: {
						sortOrder: 'asc'
					}
				}
			}
		});
	}

	async findAllActiveWithEffects(): Promise<CardWithEffects[]> {
		return prisma.card.findMany({
			where: {
				isActive: true
			},
			include: {
				effects: {
					orderBy: {
						sortOrder: 'asc'
					}
				}
			}
		});
	}

	async findManyBySlugsWithEffects(cardSlugs: string[]): Promise<CardWithEffects[]> {
		return prisma.card.findMany({
			where: {
				slug: {
					in: cardSlugs
				}
			},
			include: {
				effects: {
					orderBy: {
						sortOrder: 'asc'
					}
				}
			}
		});
	}
}
