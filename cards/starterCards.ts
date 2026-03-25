import type { CardDefinition } from '../src/core/entities/Card.js';

export interface StarterDeckDefinition {
	id: string;
	name: string;
	cardIds: string[];
}

export const STARTER_CARDS: CardDefinition[] = [
	{
		id: 'swift-raptor',
		name: 'Стремительный Раптор',
		cost: 1,
		attack: 1,
		health: 1,
		species: 'Raptor',
		abilityText: 'Стая: +1 к атаке, пока на вашей стороне есть другой Раптор.',
		abilities: [
			{
				type: 'pack',
				attackBonus: 1,
				minAllies: 1,
				sameSpecies: true
			}
		]
	},
	{
		id: 'forest-raptor',
		name: 'Лесной Раптор',
		cost: 2,
		attack: 2,
		health: 1,
		species: 'Raptor',
		abilityText: 'Стая: +1 к атаке, пока на вашей стороне есть другой Раптор.',
		abilities: [
			{
				type: 'pack',
				attackBonus: 1,
				minAllies: 1,
				sameSpecies: true
			}
		]
	},
	{
		id: 'alpha-raptor',
		name: 'Альфа-Раптор',
		cost: 4,
		attack: 4,
		health: 3,
		species: 'Raptor',
		abilityText: 'Стая: +1 к атаке, пока на вашей стороне есть другой Раптор.',
		abilities: [
			{
				type: 'pack',
				attackBonus: 1,
				minAllies: 1,
				sameSpecies: true
			}
		]
	},
	{
		id: 'pack-leader',
		name: 'Вожак Стаи',
		cost: 3,
		attack: 2,
		health: 3,
		species: 'Raptor',
		abilityText: 'Стая: +2 к атаке, пока на вашей стороне есть минимум 2 других Раптора.',
		abilities: [
			{
				type: 'pack',
				attackBonus: 2,
				minAllies: 2,
				sameSpecies: true
			}
		]
	},
	{
		id: 'glass-hunter',
		name: 'Хрупкий Охотник',
		cost: 2,
		attack: 3,
		health: 1,
		species: 'Hunter'
	},
	{
		id: 'ridge-triceratops',
		name: 'Гребнеспин Трицератопс',
		cost: 3,
		attack: 2,
		health: 4,
		species: 'Triceratops'
	},
	{
		id: 'young-ceratops',
		name: 'Юный Цератопс',
		cost: 2,
		attack: 1,
		health: 4,
		species: 'Ceratops',
		abilityText: 'Охрана',
		abilities: [{ type: 'guard' }]
	},
	{
		id: 'horned-guardian',
		name: 'Рогатый Страж',
		cost: 3,
		attack: 1,
		health: 5,
		species: 'Ceratops',
		abilityText: 'Охрана',
		abilities: [{ type: 'guard' }]
	},
	{
		id: 'stone-shell-guardian',
		name: 'Камнепанцирный Страж',
		cost: 4,
		attack: 2,
		health: 6,
		species: 'Ceratops',
		abilityText: 'Охрана',
		abilities: [{ type: 'guard' }]
	},
	{
		id: 'ridge-defender',
		name: 'Хребтовый Защитник',
		cost: 5,
		attack: 3,
		health: 7,
		species: 'Defender'
	},
	{
		id: 'cliff-stalker',
		name: 'Скалистый Охотник',
		cost: 4,
		attack: 4,
		health: 2,
		species: 'Stalker'
	},
	{
		id: 'marsh-hunter',
		name: 'Болотный Охотник',
		cost: 2,
		attack: 2,
		health: 2,
		species: 'Hunter'
	},
	{
		id: 'swamp-hatchling',
		name: 'Болотный Детеныш',
		cost: 1,
		attack: 1,
		health: 2,
		species: 'Hatchling'
	},
	{
		id: 'nursery-egg',
		name: 'Гнездовое Яйцо',
		cost: 1,
		attack: 0,
		health: 3,
		species: 'Egg',
		abilityText: 'Яйцо: вылупляется в Болотного Детеныша через 1 полный цикл ходов.',
		abilities: [
			{
				type: 'hatch',
				into: 'swamp-hatchling',
				afterOwnerTurns: 1
			}
		]
	},
	{
		id: 'ancient-egg',
		name: 'Древнее Яйцо',
		cost: 1,
		attack: 0,
		health: 2,
		species: 'Egg',
		abilityText: 'Яйцо: вылупляется в Болотного Детеныша через 1 полный цикл ходов.',
		abilities: [
			{
				type: 'hatch',
				into: 'swamp-hatchling',
				afterOwnerTurns: 1
			}
		]
	},
	{
		id: 'ancient-nest-egg',
		name: 'Древнее Гнездовое Яйцо',
		cost: 2,
		attack: 0,
		health: 4,
		species: 'Egg',
		abilityText: 'Яйцо: вылупляется в Рогатого Стража через 2 полных цикла ходов.',
		abilities: [
			{
				type: 'hatch',
				into: 'horned-guardian',
				afterOwnerTurns: 2
			}
		]
	},
	{
		id: 'swamp-broodmother',
		name: 'Болотная Наседка',
		cost: 4,
		attack: 3,
		health: 4,
		species: 'Broodmother'
	},
	{
		id: 'marsh-brute',
		name: 'Болотный Громила',
		cost: 4,
		attack: 4,
		health: 4,
		species: 'Brute'
	},
	{
		id: 'reedback-brute',
		name: 'Камышовый Громила',
		cost: 5,
		attack: 5,
		health: 4,
		species: 'Brute'
	},
	{
		id: 'horned-stomper',
		name: 'Рогатый Топтун',
		cost: 5,
		attack: 5,
		health: 5,
		species: 'Ceratops'
	},
	{
		id: 'nest-tender',
		name: 'Наседка гнезда',
		cost: 2,
		attack: 1,
		health: 3,
		species: 'Brood',
		abilityText: 'Наседка: уменьшает время вылупления вашего яйца на 1',
		abilities: [
			{
				type: 'hatch_accelerate_on_play',
				amount: 1,
				selection: 'all'
			}
		]
	},
	{
		id: 'battle-scout',
		name: 'Боевой Разведчик',
		cost: 2,
		attack: 2,
		health: 1,
		species: 'Raptor',
		abilityText: 'При розыгрыше: взять 1 карту',
		abilities: [
			{
				type: 'draw_on_play',
				count: 1,
			}
		]
	},
	{
		id: 'hippocratosaurus',
		name: 'Гиппократозавр',
		cost: 3,
		attack: 2,
		health: 3,
		species: 'Support',
		abilityText: 'При розыгрыше: восстановить 3 здоровья вашему герою.',
		abilities: [
			{
				type: 'heal_hero_on_play',
				amount: 3,
			}
		]
	},
	{
		id: 'venom-spitter',
		name: 'Ядоплюй',
		cost: 3,
		attack: 3,
		health: 2,
		species: 'dilophosaurus',
		abilityText: 'При розыгрыше: нанести 2 урона вражескому существу',
		abilities: [
		  {
			type: 'damage_enemy_unit_on_play',
			amount: 2,
		  }
		]
	  }
];

export const STARTER_DECKS: StarterDeckDefinition[] = [
	{
		id: 'raptor-rush',
		name: 'Раптор Рывок',
		cardIds: [
			'swift-raptor',
			'swift-raptor',
			'forest-raptor',
			'forest-raptor',
			'glass-hunter',
			'glass-hunter',
			'marsh-hunter',
			'marsh-hunter',
			'pack-leader',
			'pack-leader',
			'alpha-raptor',
			'cliff-stalker'
		]
	},
	{
		id: 'stone-guard',
		name: 'Каменная Охрана',
		cardIds: [
			'young-ceratops',
			'young-ceratops',
			'ridge-triceratops',
			'ridge-triceratops',
			'horned-guardian',
			'horned-guardian',
			'stone-shell-guardian',
			'stone-shell-guardian',
			'ridge-defender',
			'ridge-defender',
			'reedback-brute',
			'horned-stomper'
		]
	},
	{
		id: 'ancient-brood',
		name: 'Древний Выводок',
		cardIds: [
			'nursery-egg',
			'nursery-egg',
			'nest-tender',
			'ancient-egg',
			'ancient-nest-egg',
			'ancient-nest-egg',
			'swamp-hatchling',
			'swamp-hatchling',
			'marsh-hunter',
			'marsh-hunter',
			'swamp-broodmother',
			'marsh-brute'
		]
	}
];

export const STARTER_COLLECTION_CARD_IDS: string[] = buildStarterCollectionCardIds(STARTER_DECKS);

function buildStarterCollectionCardIds(decks: StarterDeckDefinition[]): string[] {
	const maxCounts = new Map<string, number>();

	for (const deck of decks) {
		const deckCounts = new Map<string, number>();
		for (const cardId of deck.cardIds) {
			deckCounts.set(cardId, (deckCounts.get(cardId) ?? 0) + 1);
		}

		for (const [cardId, count] of deckCounts.entries()) {
			maxCounts.set(cardId, Math.max(maxCounts.get(cardId) ?? 0, count));
		}
	}

	return [...maxCounts.entries()].flatMap(([cardId, count]) => Array.from({ length: count }, () => cardId));
}
