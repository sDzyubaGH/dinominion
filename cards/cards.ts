import type { CardDefinition } from '../bot/card.js';

export const CARD_LIBRARY: CardDefinition[] = [
	{
		id: 'embercrest-raptor',
		name: 'Раптор Углегребня',
		type: 'dinosaur',
		species: 'Raptor',
		attack: 3,
		health: 2,
		energyCost: 2,
		description: 'Стая: получает +1 к атаке, пока на вашей стороне есть другой Раптор.',
		ability: 'pack_fury'
	},
	{
		id: 'shellguard-trike',
		name: 'Трик Шеллгард',
		type: 'dinosaur',
		species: 'Trike',
		attack: 2,
		health: 5,
		energyCost: 4,
		description: 'Провокация. Враги должны атаковать его первым.',
		ability: 'taunt'
	},
	{
		id: 'crownmaw-rex',
		name: 'Рекс Короноклык',
		type: 'dinosaur',
		species: 'Rex',
		attack: 7,
		health: 6,
		energyCost: 8,
		description: 'Рык: при выходе наносит 2 урона вражескому командиру.',
		ability: 'battlecry_face_2'
	},
	{
		id: 'sunspore-egg',
		name: 'Яйцо Солнцеспоры',
		type: 'dinosaur',
		species: 'Egg',
		attack: 0,
		health: 3,
		energyCost: 1,
		description: 'Яйцо. Вылупляется в Детеныша Рассветной Чешуи через 2 ваших хода.',
		ability: 'egg',
		hatchesInto: 'dawnscale-hatchling',
		hatchTurns: 2
	},
	{
		id: 'dawnscale-hatchling',
		name: 'Детеныш Рассветной Чешуи',
		type: 'dinosaur',
		species: 'Hatchling',
		attack: 2,
		health: 2,
		energyCost: 2,
		description: 'Быстрый и юркий динозавр, только что вылупившийся из яйца.',
		ability: 'none'
	},
	{
		id: 'mosshide-grazer',
		name: 'Мохоспин Травоед',
		type: 'dinosaur',
		species: 'Grazer',
		attack: 1,
		health: 4,
		energyCost: 2,
		description: 'В конце вашего хода восстанавливает 1 здоровье вашему командиру.',
		ability: 'end_turn_heal_1'
	},
	{
		id: 'ridgeback-alpha',
		name: 'Хребтоспин Альфа',
		type: 'dinosaur',
		species: 'Raptor',
		attack: 4,
		health: 4,
		energyCost: 4,
		description: 'Эволюция 2: превращается в Хребтоспина Апекса.',
		ability: 'evolve',
		evolvesTo: 'ridgeback-apex',
		evolveCost: 2
	},
	{
		id: 'ridgeback-apex',
		name: 'Хребтоспин Апекс',
		type: 'dinosaur',
		species: 'Raptor',
		attack: 6,
		health: 6,
		energyCost: 6,
		description: 'Вожак стаи с особенно мощным укусом.',
		ability: 'pack_fury'
	},
	{
		id: 'reefclaw-stalker',
		name: 'Рифокоготь Охотник',
		type: 'dinosaur',
		species: 'Stalker',
		attack: 3,
		health: 3,
		energyCost: 3,
		description: 'При выходе наносит 1 урон вражескому динозавру.',
		ability: 'battlecry_ping_enemy_minion'
	},
	{
		id: 'skyfin-ptera',
		name: 'Небоплав Птера',
		type: 'dinosaur',
		species: 'Ptera',
		attack: 5,
		health: 3,
		energyCost: 5,
		description: 'Может атаковать вражеского командира, даже если на столе есть враги.',
		ability: 'direct_strike'
	},
	{
		id: 'fernburst-mutation',
		name: 'Мутация Папоротниковый Всплеск',
		type: 'mutation',
		attack: 0,
		health: 0,
		energyCost: 2,
		description: 'Дает вашему динозавру +2 к атаке и +2 к здоровью.',
		ability: 'buff_friendly_2_2'
	},
	{
		id: 'primal-stormfront',
		name: 'Первобытный Штормовой Фронт',
		type: 'catastrophe',
		attack: 0,
		health: 0,
		energyCost: 5,
		description: 'Наносит 2 урона всем динозаврам.',
		ability: 'aoe_all_2'
	}
];

export function buildStarterDeck(): string[] {
	return [
		'embercrest-raptor',
		'embercrest-raptor',
		'embercrest-raptor',
		'shellguard-trike',
		'shellguard-trike',
		'crownmaw-rex',
		'sunspore-egg',
		'sunspore-egg',
		'sunspore-egg',
		'dawnscale-hatchling',
		'dawnscale-hatchling',
		'mosshide-grazer',
		'mosshide-grazer',
		'mosshide-grazer',
		'ridgeback-alpha',
		'ridgeback-alpha',
		'ridgeback-apex',
		'reefclaw-stalker',
		'reefclaw-stalker',
		'reefclaw-stalker',
		'skyfin-ptera',
		'skyfin-ptera',
		'fernburst-mutation',
		'fernburst-mutation',
		'fernburst-mutation',
		'fernburst-mutation',
		'primal-stormfront',
		'primal-stormfront',
		'shellguard-trike',
		'crownmaw-rex'
	];
}

export const CARD_MAP = new Map(CARD_LIBRARY.map((card) => [card.id, card]));
