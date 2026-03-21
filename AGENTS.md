# AGENTS.md

## Перед запуском

Нужны:

- `BOT_TOKEN`
- `DATABASE_URL`
- `REDIS_URL`

Без них [`src/config/env.ts`](src/config/env.ts) сразу падает с ошибкой.

Базовая последовательность запуска:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Сборка и запуск production-версии:

```bash
npm run build
npm run start
```

`npm run start` ожидает файл `dist/src/bot/index.js`. Если меняешь `tsconfig.json`, не ломай этот путь без обновления `package.json`.

## Что где находится

- `src/bot` — Telegram entrypoint, handlers и inline keyboards
- `src/app/services` — сценарии уровня приложения
- `src/core` — чистый игровой движок и типы боя
- `src/infra/prisma` — Prisma client и repository classes
- `src/infra/redis` — Redis client, очередь, блокировки, кэш состояния
- `src/infra/telegram` — текстовый рендеринг боя
- `src/tests/core/engine` — все текущие тесты
- `prisma` — schema, migrations, seed
- `cards/starterCards.ts` — исходные определения стартовых карт

## Правила, которые здесь реально важны

- Проект ESM. Во всех локальных импортах нужен суффикс `.js`, даже в `.ts` файлах.
- В `src/core` нельзя тащить Telegram, Prisma, Redis и любые I/O-зависимости. Этот слой сейчас чистый и тестируется отдельно.
- Состояние боя должно оставаться JSON-сериализуемым. [`BattleService`](src/app/services/battleService.ts) кладет его в PostgreSQL и в Redis через `JSON.stringify`.
- `Deck.cardsJson` хранит не числовые `Card.id`, а строковые `slug` карт. Не переключай логику боя или колод на integer `id` без полной миграции.
- Каталог карт в runtime читается из БД, а не из `cards/starterCards.ts`. После изменения [`cards/starterCards.ts`](/Users/sdzyuba/Documents/dev/dinominion/cards/starterCards.ts) нужно запускать `npm run prisma:seed`.
- `CardCatalogService` падает, если в БД нет карт или если в колоде/состоянии встречается неизвестный slug. Любые новые card slugs должны быть согласованы между seed, стартовой колодой и тестовыми данными.
- `BattleService.applyActionForTelegramId` уже заворачивает обновление боя в Redis lock. Не пиши обходные обновления battle state мимо этого пути.
- `MatchmakingQueue.enqueueOrMatch` тоже использует lock. Не добавляй второй путь матчмейкинга без синхронизации через Redis.
- В пользовательских сообщениях и логах уже используется русский текст. Новые ответы бота и ошибки движка пиши в том же стиле.
- В `src/bot/handlers/battle.ts` поддерживаются два формата callback data: короткий `b:...` и длинный `battle:...`. Не удаляй короткий формат без замены, он нужен как более компактный.
- При обновлении структуры `BattleState` проверь не только `src/core`, но и рендеринг, callback-flow, кэш в Redis и чтение состояния из Prisma.

## Типичные ошибки в этом проекте

- Изменить доменные типы и забыть, что старое состояние читается из `battleStateJson` и Redis-кэша.
- Добавить новую карту только в `starterCards.ts` и не пересидировать БД.
- Использовать Prisma `Card.id` там, где остальной код ждет `slug`.
- Добавить импорт без `.js` и получить runtime-ошибку в NodeNext/ESM.
- Расширить тесты, но забыть, что `npm run test` запускает только `src/tests/core/engine/*.test.ts`.
- Менять battle callbacks без учета двух существующих форматов парсинга.

## Как здесь писать код

- Новую Telegram-команду регистрируй в `src/bot/index.ts` и выноси обработчик в `src/bot/handlers`.
- Сценарную логику размещай в `src/app/services`, а доступ к БД оставляй в `src/infra/prisma/repositories`.
- Если меняешь правила боя, сначала обновляй `src/core`, затем рендеринг в `src/infra/telegram/renderer.ts`, потом обработчики кнопок при необходимости.
- Если меняешь сидирование карт, проверь соответствие между [`prisma/seed.ts`](/Users/sdzyuba/Documents/dev/dinominion/prisma/seed.ts), [`cards/starterCards.ts`](/Users/sdzyuba/Documents/dev/dinominion/cards/starterCards.ts) и стартовой колодой в [`src/app/services/deckService.ts`](/Users/sdzyuba/Documents/dev/dinominion/src/app/services/deckService.ts).
- Не добавляй новую инфраструктурную зависимость в `src/core`; адаптер должен оставаться снаружи.

## Тесты

Используй только текущий способ, который уже принят в репозитории:

```bash
npm run test
npm run test:watch
```

Фактически это:

- `node:test`
- `node:assert/strict`
- запуск TypeScript через `tsx`
- тесты только в `src/tests/core/engine/*.test.ts`

Практика для новых тестов:

- если меняешь `gameEngine`, `rules` или `validators`, добавляй тесты в `src/tests/core/engine`
- используй утилиты из [`src/tests/core/engine/testUtils.ts`](/Users/sdzyuba/Documents/dev/dinominion/src/tests/core/engine/testUtils.ts)
- если добавляешь новый сценарий карт, синхронизируй тестовые данные со slug-ами реальных карт

## Что прогонять перед завершением

```bash
npm run test
npm run lint
npm run format:check
```

Если менялись Prisma schema, seed или карточный каталог:

```bash
npm run prisma:generate
npm run prisma:seed
```

## TODO

- В репозитории нет `.env.example`.
- В репозитории не зафиксирована версия Node.js через `.nvmrc` или `engines`.
- Для сервисов и инфраструктуры нет отдельной тестовой команды в `package.json`.
