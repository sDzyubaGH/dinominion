# dinominion-telegram-bot

Telegram-бот с пошаговой карточной PvP-игрой про динозавров. Проект написан на Node.js и TypeScript, использует `grammy` для Telegram-интерфейса, Prisma и PostgreSQL для постоянного хранения, Redis для очереди матчмейкинга, блокировок и кэша активных боев.

## Стек

- Node.js
- TypeScript
- `grammy`
- Prisma
- PostgreSQL
- Redis
- `tsx`
- ESLint
- Prettier
- встроенный `node:test`

## Package Manager

- `npm`

Причина: в репозитории есть `package-lock.json`, а команды в проекте оформлены через `npm run ...`.

## Команды

- `npm run dev` — запуск бота через `tsx`
- `npm run build` — сборка TypeScript в `dist`
- `npm run start` — запуск собранной версии из `dist/src/bot/index.js`
- `npm run test` — запуск тестов движка из `src/tests/core/engine/*.test.ts`
- `npm run test:watch` — запуск тестов движка в watch-режиме
- `npm run lint` — проверка ESLint
- `npm run lint:fix` — автоисправление ESLint
- `npm run format` — форматирование Prettier
- `npm run format:check` — проверка форматирования
- `npm run prisma:generate` — генерация Prisma Client
- `npm run prisma:migrate` — запуск Prisma migrations в dev-режиме
- `npm run prisma:seed` — сидирование карточного каталога

## Переменные окружения

Приложение требует:

```env
BOT_TOKEN=...
DATABASE_URL=...
REDIS_URL=...
```

`src/config/env.ts` завершает процесс с ошибкой, если любой из этих параметров отсутствует.

## Быстрый запуск

1. Установить зависимости:

```bash
npm install
```

2. Сгенерировать Prisma Client:

```bash
npm run prisma:generate
```

3. Применить миграции:

```bash
npm run prisma:migrate
```

4. Заполнить каталог карт:

```bash
npm run prisma:seed
```

5. Запустить PostgreSQL и Redis.

6. Запустить бота:

```bash
npm run dev
```

## Telegram-команды

- `/start` — регистрация игрока и создание стартовой колоды
- `/profile` — просмотр профиля
- `/deck` — просмотр колоды
- `/play` — вход в очередь на матч
- `/battle` — открытие активного боя

## Структура проекта

```text
cards/                       Стартовые определения карт для сида и тестов
prisma/                      Prisma schema, миграции и seed
src/
  app/services/              Прикладные сервисы сценариев
  bot/                       Telegram bot entrypoint, handlers, keyboards
  config/                    Чтение env-переменных
  core/                      Чистая игровая модель и правила
    engine/                  Игровой движок, правила, валидаторы
    entities/                Доменные сущности карт и боя
    types/                   Доменные типы состояния и действий
  infra/
    prisma/                  Prisma client и репозитории
    redis/                   Redis-клиент, очередь, блокировки
    telegram/                Рендеринг текста для Telegram
  tests/core/engine/         Тесты доменного движка
```

## Архитектура

Проект построен как слоистое приложение.

- `src/bot` — транспортный слой Telegram. Здесь регистрируются команды и callback-обработчики.
- `src/app/services` — orchestration layer. Сервисы координируют репозитории, Redis и доменный движок.
- `src/core` — чистая доменная логика. `gameEngine.ts`, `rules.ts` и `validators.ts` не зависят от Telegram, Prisma и Redis.
- `src/infra` — адаптеры к внешним системам: Prisma, Redis и Telegram rendering.

Наблюдаемые паттерны в коде:

- Layered architecture
- Repository pattern для доступа к Prisma
- Service layer для сценариев регистрации, колод, матчмейкинга и боя
- Composition root в [`src/bot/index.ts`](/Users/sdzyuba/Documents/dev/dinominion/src/bot/index.ts), где вручную создаются зависимости
- Чистый domain engine, который принимает состояние и действие и возвращает новое состояние
- Redis lock wrapper для сериализации матчмейкинга и действий боя

## Как устроен бой

- При старте бота в [`src/bot/index.ts`](/Users/sdzyuba/Documents/dev/dinominion/src/bot/index.ts) собираются все зависимости.
- `/play` ставит игрока в Redis-очередь через `MatchmakingQueue`.
- При совпадении пары `BattleService` создает запись боя в PostgreSQL и инициализирует `BattleState`.
- Актуальное состояние боя хранится и в PostgreSQL, и в Redis-кэше.
- Действия игрока проходят через `BattleService.applyActionForTelegramId`, затем в `core/engine/applyAction`.
- Telegram-сообщения обновляются через `refreshBattleViews`.

## Тесты

Сейчас тестами покрыт только доменный движок в `src/tests/core/engine`.

- используется встроенный раннер `node:test`
- TypeScript выполняется через `node --import tsx --test`
- есть unit-тесты для правил движка и валидаторов
- инфраструктурных и e2e-тестов в репозитории нет

## Стиль кода

По конфигам проекта:

- TypeScript в `strict`-режиме
- ESM-модули (`"type": "module"`, `module: "NodeNext"`)
- локальные импорты пишутся с расширением `.js`
- Prettier: табы, `tabWidth: 4`, `singleQuote: true`, `semi: true`, `trailingComma: 'none'`
- ESLint игнорирует `dist` и `node_modules`
- `console` разрешен

## TODO

- TODO: в репозитории нет `.env.example`, хотя переменные окружения обязательны
- TODO: версия Node.js явно не зафиксирована через `.nvmrc` или `engines`
- TODO: в `npm run test` запускаются только тесты из `src/tests/core/engine`, остальные слои пока не покрыты
