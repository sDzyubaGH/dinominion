import type { CardDefinition } from '../src/core/entities/Card.js';

export const STARTER_CARDS: CardDefinition[] = [
	{
		id: 'forest-raptor',
		name: 'Лесной Раптор',
		cost: 2,
		attack: 2,
		health: 1,
		species: 'Raptor',
		abilityText: 'Стая: +1 к атаке, пока на вашей стороне есть другой Раптор.'
	},
	{
		id: 'alpha-raptor',
		name: 'Альфа-Раптор',
		cost: 4,
		attack: 4,
		health: 3,
		species: 'Raptor',
		abilityText: 'Стая: +1 к атаке, пока на вашей стороне есть другой Раптор.'
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
		id: 'horned-guardian',
		name: 'Рогатый Страж',
		cost: 3,
		attack: 1,
		health: 5,
		species: 'Ceratops',
		abilityText: 'Охрана',
		keywords: ['guard']
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
		id: 'ancient-egg',
		name: 'Древнее Яйцо',
		cost: 1,
		attack: 0,
		health: 2,
		species: 'Egg',
		abilityText: 'Яйцо: вылупляется в Болотного Детеныша через 1 полный цикл ходов.',
		egg: {
			hatchesIntoCardId: 'swamp-hatchling',
			turnsToHatch: 1
		}
	},
	{
		id: 'reedback-brute',
		name: 'Камышовый Громила',
		cost: 5,
		attack: 5,
		health: 4,
		species: 'Brute'
	}
];

export const STARTER_DECK_CARD_IDS: string[] = [
	'forest-raptor',
	'forest-raptor',
	'alpha-raptor',
	'ridge-triceratops',
	'ridge-triceratops',
	'horned-guardian',
	'horned-guardian',
	'cliff-stalker',
	'marsh-hunter',
	'marsh-hunter',
	'ancient-egg',
	'reedback-brute'
];

export const STARTER_CARD_MAP = new Map(STARTER_CARDS.map((card) => [card.id, card]));
