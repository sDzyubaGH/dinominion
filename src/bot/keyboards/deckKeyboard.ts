import { InlineKeyboard } from 'grammy';
import type { CardDefinition } from '../../core/entities/Card.js';

const PAGE_SIZE = 5;

export type DeckViewMode =
	| {
			type: 'summary';
	  }
	| {
			type: 'edit';
	  }
	| {
			type: 'switch';
	  }
	| {
			type: 'cards';
			page: number;
	  }
	| {
			type: 'card';
			page: number;
			cardId: string;
	  };

export function createDeckKeyboard(
	groupedCards: Array<{
		cardId: string;
		definition: CardDefinition;
		count: number;
	}>,
	decks: Array<{
		id: number;
		name: string;
		isCurrent: boolean;
	}>,
	mode: DeckViewMode
): InlineKeyboard {
	const keyboard = new InlineKeyboard();

	if (mode.type === 'summary') {
		return keyboard
			.text('👁 Карты', 'd:v:0')
			.row()
			.text('🔁 Поменять колоду', 'd:w')
			.row()
			.text('✏️ Редактирование', 'd:m');
	}

	if (mode.type === 'edit') {
		return keyboard
			.text('✏️ Изменить название', 'd:r')
			.row()
			.text('◀️ Назад', 'd:s');
	}

	if (mode.type === 'switch') {
		for (const deck of decks) {
			keyboard
				.text(`${deck.isCurrent ? '✅ ' : ''}${deck.name}`, `d:sc:${deck.id}`)
				.row();
		}

		return keyboard.text('◀️ Назад', 'd:s');
	}

	if (mode.type === 'cards') {
		const totalPages = Math.max(1, Math.ceil(groupedCards.length / PAGE_SIZE));
		const page = clampPage(mode.page, totalPages);
		const pageItems = groupedCards.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

		for (const card of pageItems) {
			keyboard.text(card.definition.name, `d:c:${page}:${card.cardId}`).row();
		}

		if (totalPages > 1) {
			if (page > 0) {
				keyboard.text('◀️', `d:v:${page - 1}`);
			}
			keyboard.text(`${page + 1}/${totalPages}`, 'd:i');
			if (page < totalPages - 1) {
				keyboard.text('▶️', `d:v:${page + 1}`);
			}
			keyboard.row();
		}

		return keyboard.text('◀️ Назад', 'd:s');
	}

	return keyboard.text('◀️ Назад', `d:v:${mode.page}`);
}

export function getDeckPageSize(): number {
	return PAGE_SIZE;
}

function clampPage(page: number, totalPages: number): number {
	return Math.min(Math.max(page, 0), totalPages - 1);
}
