import { Keyboard } from 'grammy';

export function createMainMenuKeyboard(): Keyboard {
	return new Keyboard()
		.text('/profile')
		.text('/deck')
		.row()
		.text('/play')
		.text('/battle')
		.resized();
}
