import type { JsonValue } from '@prisma/client/runtime/library';
import { collectBattleCardIds, createCardLookup } from '../../core/cardCatalog.js';
import type { CardAbility, CardDefinition } from '../../core/entities/Card.js';
import type { BattleState } from '../../core/types/BattleState.js';
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
		return createCardLookup([...map.values()]);
	}

	async getLookupByIds(cardIds: string[]): Promise<CardLookup> {
		const uniqueIds = [...new Set(cardIds)];
		if (uniqueIds.length === 0) {
			return createCardLookup([]);
		}

		const cards = this.buildMap(await this.cardRepository.findManyBySlugsWithEffects(uniqueIds));
		const missingCardId = uniqueIds.find((cardId) => !cards.has(cardId));
		if (missingCardId) {
			throw new Error(`Unknown card: ${missingCardId}`);
		}

		return createCardLookup([...cards.values()]);
	}

	async getLookupForBattleState(state: BattleState): Promise<CardLookup> {
		return this.getLookupByIds(collectBattleCardIds(state));
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

		const updatedCache = {
			map: built,
			loadedAt: now
		};
		if (activeOnly) {
			this.activeCardsCache = updatedCache;
		} else {
			this.allCardsCache = updatedCache;
		}
		return built;
	}

	private buildMap(cards: CardWithEffects[]): Map<string, CardDefinition> {
		return new Map(
			cards.map((card) => [
				card.slug,
				{
					id: card.slug,
					name: card.name,
					cost: card.cost,
					attack: card.attack ?? 0,
					health: card.health ?? 0,
					species: card.species ?? 'Neutral',
					abilityText: card.abilityText ?? undefined,
					abilities: toAbilities(card)
				} satisfies CardDefinition
			])
		);
	}
}

function toAbilities(card: CardWithEffects): CardAbility[] | undefined {
	const abilities: CardAbility[] = [];

	for (const effect of card.effects) {
		if (effect.effectType === 'GUARD_PASSIVE') {
			abilities.push({ type: 'guard' });
			continue;
		}

		if (effect.effectType === 'PACK_ATTACK') {
			const params = getObject(effect.params);
			abilities.push({
				type: 'pack',
				attackBonus: effect.value ?? readNumber(params, 'attackBonus') ?? 1,
				minAllies: readNumber(params, 'minAllies') ?? 1,
				sameSpecies: readBoolean(params, 'sameSpecies') ?? true
			});
			continue;
		}

		if (effect.effectType === 'HATCH_ACCELERATE') {
			const params = getObject(effect.params);

			const rawSelection =  readString(params, 'selection')
			const selection = 
				rawSelection === 'lowest_timer' || rawSelection === 'all'
					? rawSelection
					: 'all';
			abilities.push({
				type: 'hatch_accelerate_on_play',
				amount: effect.value ?? 1,
				selection
			});
			continue;
		}

		if (effect.effectType === 'DRAW_CARD') {
			abilities.push({
				type: 'draw_on_play',
				count: effect.value ?? 1,
			});
			continue;
		}

		if (effect.effectType === 'HEAL_HERO') {
			abilities.push({
				type: 'heal_hero_on_play',
				amount: effect.value ?? 1
			});
			continue;
		}

		if (effect.effectType === 'DAMAGE_UNIT') {
			abilities.push({
				type: 'heal_hero_on_play',
				amount: effect.value ?? 1
			})
		}

		if (effect.effectType === 'HATCH') {
			const params = getObject(effect.params);
			const into = readString(params, 'intoSlug') ?? readString(params, 'hatchesIntoCardId');
			const afterOwnerTurns =
				effect.durationEffect ??
				readNumber(params, 'turns') ??
				readNumber(params, 'turnsToHatch');
			if (!into || afterOwnerTurns === undefined) {
				continue;
			}
			abilities.push({
				type: 'hatch',
				into,
				afterOwnerTurns
			});
		}
	}

	return abilities.length > 0 ? abilities : undefined;
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

function readBoolean(object: Record<string, JsonValue> | null, key: string): boolean | undefined {
	const value = object?.[key];
	return typeof value === 'boolean' ? value : undefined;
}
