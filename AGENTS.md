# AGENTS.md

## Запуск

Нужны:

- `BOT_TOKEN`
- `DATABASE_URL`
- `REDIS_URL`

Базовый запуск:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Production:

```bash
npm run build
npm run start
```

`npm run start` ожидает `dist/src/bot/index.js`.

## Структура

- `src/bot` — Telegram handlers, keyboards
- `src/bot/middleware` — pending text actions
- `src/app/services` — orchestration
- `src/core` — чистый движок
- `src/infra/prisma` — Prisma repositories
- `src/infra/redis` — Redis queue, locks, cache
- `src/infra/telegram` — rendering
- `prisma` — schema, migrations, seed
- `cards/starterCards.ts` — карточный каталог и стартовые деки

## Модель данных

- `Card` — справочник карт
- `PlayerCard` — инвентарь игрока (`quantity`)
- `DeckCard` — состав колоды
- `Player.currentDeckId` — активная колода игрока

Не возвращайся к предположению “у игрока одна колода”.

## Стартовые данные

Стартовые колоды описаны в `STARTER_DECKS`:

- `Раптор Рывок`
- `Каменная Охрана`
- `Древний Выводок`

Стартовая коллекция собирается из `STARTER_COLLECTION_CARD_IDS`.

Если меняешь стартовые деки:

- синхронизируй `STARTER_DECKS` и derived collection
- запусти `npm run prisma:seed`

## Жесткие правила

- Проект ESM: локальные импорты только с `.js`.
- В `src/core` нельзя добавлять Telegram, Prisma, Redis или любой I/O.
- Бой должен брать колоду только через `DeckRepository.findCurrentByPlayerId(...)`.
- Любое редактирование состава колоды должно идти через `DeckService.updateCards(...)`.
- Проверка доступных копий карт должна идти через `CollectionService`, не через UI.
- Rename flow колоды идет через `src/bot/middleware/pendingTextActions.ts`.
- Не вешай локальный `bot.on('message:text')` в handler-файлах: так легко сломать `/play` и `/battle`.
- Если pending action не найден, middleware обязан делать `next()`.

## /deck

Изменения в deck flow почти всегда требуют проверить вместе:

- `src/app/services/deckService.ts`
- `src/bot/handlers/deck.ts`
- `src/bot/keyboards/deckKeyboard.ts`
- `src/infra/telegram/deckRenderer.ts`
- `src/bot/middleware/pendingTextActions.ts`

Сейчас `/deck` умеет:

- показывать текущую колоду
- показывать карты
- переименовывать колоду
- переключать текущую колоду

Redis key для rename:

- `dino:deck:rename:<telegramId>`

В значении хранится `deckId`, TTL — `300` секунд.

## Частые ошибки

- Изменить `starterCards.ts` и не пересидировать БД.
- Использовать `Card.id` там, где остальной код ждет `slug`.
- Забыть, что состав колоды хранится в `DeckCard`, а не в `Deck`.
- Забыть обновить `BattleService` после изменений выбора колоды.
- Обновить deck UI только в одном месте и оставить клавиатуру/рендер/handler рассинхроненными.
- Проглотить команды через неверный text middleware.
- Использовать в UI лимит вида `x/20` как факт: сейчас такого ограничения в коде нет.

## Проверка

Перед завершением:

```bash
npm run test
npm run lint
npm run format:check
```

Если менялись Prisma schema или seed:

```bash
npm run prisma:generate
npm run prisma:seed
```
