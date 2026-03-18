import type { JsonValue } from '@prisma/client/runtime/library';
import type { CardDefinition } from '../../domain/entities/Card.js';
import {
	CardRepository,
	type CardWithEffects
} from '../../infra/prisma/repositories/cardRepository.js';

type CardLookup = (cardId: string) => CardDefinition;

export class CardCatalogService {
	private readonly cacheTtlMs = 30_000;
	private allCardsCache:
		| {
				map: Map<string, CardDefinition>;
				loadedAt: number;
		  }
		| undefined;
	private activeCardsCache:
		| {
				map: Map<string, CardDefinition>;
				loadedAt: number;
		  }
		| undefined;

	constructor(private readonly cardRepository: CardRepository) {}

	async getLookup(options?: { activeOnly?: boolean }): Promise<CardLookup> {
		const map = await this.getCardMap(options?.activeOnly ?? false);
		return (cardId: string) => {
			const card = map.get(cardId);
			if (!card) {
				throw new Error(`Unknown card: ${cardId}`);
			}
			return card;
		};
	}

	async getCardName(cardId: string): Promise<string> {
		const map = await this.getCardMap(false);
		return map.get(cardId)?.name ?? cardId;
	}

	private async getCardMap(activeOnly: boolean): Promise<Map<string, CardDefinition>> {
		const now = Date.now();
		const cache = activeOnly ? this.activeCardsCache : this.allCardsCache;
		if (cache && now - cache.loadedAt < this.cacheTtlMs) {
			return cache.map;
		}

		const cards = activeOnly
			? await this.cardRepository.findAllActiveWithEffects()
			: await this.cardRepository.findAllWithEffects();
		const built = this.buildMap(cards);

		if (built.size === 0) {
			throw new Error('Нет карт в базе данных.');
		}

		const result = built;

		const updatedCache = {
			map: result,
			loadedAt: now
		};
		if (activeOnly) {
			this.activeCardsCache = updatedCache;
		} else {
			this.allCardsCache = updatedCache;
		}
		return result;
	}

	private buildMap(cards: CardWithEffects[]): Map<string, CardDefinition> {
		return new Map(
			cards.map((card) => {
				const keywords = card.effects.some((effect) => effect.effectType === 'GUARD_PASSIVE')
					? (['guard'] as Array<'guard'>)
					: undefined;
				const hatchEffect = card.effects.find((effect) => effect.effectType === 'HATCH');
				const hatchParams = getObject(hatchEffect?.params ?? null);
				const hatchInto =
					readString(hatchParams, 'intoSlug') ?? readString(hatchParams, 'hatchesIntoCardId');
				const turnsToHatch =
					readNumber(hatchParams, 'turns') ?? readNumber(hatchParams, 'turnsToHatch');

				const definition: CardDefinition = {
					id: card.slug,
					name: card.name,
					cost: card.cost,
					attack: card.attack ?? 0,
					health: card.health ?? 0,
					species: card.species ?? 'Neutral',
					abilityText: card.abilityText ?? undefined,
					keywords,
					egg:
						hatchInto && turnsToHatch !== undefined
							? {
									hatchesIntoCardId: hatchInto,
									turnsToHatch
								}
							: undefined
				};

				return [definition.id, definition];
			})
		);
	}
}

function getObject(value: JsonValue | null): Record<string, JsonValue> | null {
	if (!value || Array.isArray(value) || typeof value !== 'object') {
		return null;
	}
	return value as Record<string, JsonValue>;
}

function readString(object: Record<string, JsonValue> | null, key: string): string | undefined {
	const value = object?.[key];
	return typeof value === 'string' ? value : undefined;
}

function readNumber(object: Record<string, JsonValue> | null, key: string): number | undefined {
	const value = object?.[key];
	return typeof value === 'number' ? value : undefined;
}
