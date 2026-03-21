import type { CardDefinition } from '../../core/entities/Card.js';

export function renderDeckSummary(params: {
	deckName: string;
	totalCards: number;
	groupedCards: Array<{
		definition: CardDefinition;
		count: number;
	}>;
}): string {
	return [
		`Колода: ${params.deckName}`,
		'',
		`Карт: ${params.totalCards}`,
		'',
		...params.groupedCards.map((card) => `${card.definition.name} x${card.count}`)
	].join('\n');
}

export function renderDeckCardsPage(params: {
	deckName: string;
	page: number;
	totalPages: number;
	items: Array<{
		definition: CardDefinition;
		count: number;
	}>;
}): string {
	return [
		`Колода: ${params.deckName}`,
		'',
		`Просмотр карт • Страница ${params.page + 1}/${params.totalPages}`,
		'',
		...params.items.map((card) => `${card.definition.name} x${card.count}`),
		'',
		'Выберите карту для просмотра.'
	].join('\n');
}

export function renderDeckEditMenu(deckName: string): string {
	return ['Редактирование колоды', '', `Текущее название: ${deckName}`, '', 'Выберите действие.'].join(
		'\n'
	);
}

export function renderDeckCardDetails(
	card: CardDefinition,
	cardLookup: (cardId: string) => CardDefinition
): string {
	const effectLines = card.abilities?.map((ability) => formatAbility(ability, cardLookup)) ?? [];

	return [
		card.name,
		'',
		`Стоимость: ${card.cost}`,
		`Атака: ${card.attack}`,
		`Здоровье: ${card.health}`,
		`Описание: ${card.abilityText ?? '-'}`,
		'Эффект:',
		effectLines.length > 0 ? effectLines.join('\n') : '-'
	].join('\n');
}

function formatAbility(
	ability: NonNullable<CardDefinition['abilities']>[number],
	cardLookup: (cardId: string) => CardDefinition
): string {
	if (ability.type === 'guard') {
		return 'Пассивно: противник должен сначала атаковать это существо.';
	}

	if (ability.type === 'pack') {
		const condition = ability.sameSpecies
			? `на вашей стороне есть минимум ${ability.minAllies} другое существо того же вида`
			: `на вашей стороне есть минимум ${ability.minAllies} другое союзное существо`;
		return `Пассивно: получает +${ability.attackBonus} к атаке, пока ${condition}.`;
	}

	const targetName = safeCardName(ability.into, cardLookup);
	return `В начале хода владельца: через ${ability.afterOwnerTurns} ${turnWord(
		ability.afterOwnerTurns
	)} превращается в ${targetName}.`;
}

function safeCardName(cardId: string, cardLookup: (cardId: string) => CardDefinition): string {
	try {
		return cardLookup(cardId).name;
	} catch {
		return cardId;
	}
}

function turnWord(value: number): string {
	if (value % 10 === 1 && value % 100 !== 11) {
		return 'ход';
	}

	if ([2, 3, 4].includes(value % 10) && ![12, 13, 14].includes(value % 100)) {
		return 'хода';
	}

	return 'ходов';
}
