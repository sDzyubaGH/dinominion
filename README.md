# Dino Clash Bot MVP

Minimal dinosaur-themed turn-based collectible card game MVP for Telegram Bot.

## Stack

- Node.js
- TypeScript
- grammY
- PostgreSQL
- Redis
- Prisma

## MVP Features

- Player registration via `/start`
- Automatic starter deck creation
- Matchmaking queue via Redis
- Persistent players, decks, and battles via PostgreSQL + Prisma
- Active battle state and locks in Redis
- Async 1v1 battles in private Telegram chats
- Turn system, draw, play card, attack, end turn, win/lose
- Simple dinosaur mechanics: Pack, Egg, Guard

## Commands

- `/start` register player and create starter deck
- `/profile` show player info
- `/deck` show starter deck
- `/play` join matchmaking queue
- `/battle` show current active battle

## Environment

Copy `.env.example` and fill values:

```env
BOT_TOKEN=...
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dino_clash
REDIS_URL=redis://localhost:6379
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Generate Prisma client:

```bash
npm run prisma:generate
```

3. Run migration:

```bash
npm run prisma:migrate -- --name init
```

4. Start PostgreSQL and Redis.

5. Start the bot:

```bash
npm run dev
```

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run format`
- `npm run prisma:generate`
- `npm run prisma:migrate`

## Battle Flow

1. Two users run `/start`
2. Both run `/play`
3. Redis queue matches them
4. Bot sends battle messages to both players
5. Current player uses inline buttons:
    - `View hand`
    - `Play card`
    - `Attack`
    - `End turn`
    - `Refresh battle`

## Example Battle Message

```text
🦖 Dino Clash

Turn: @player1
Energy: 3/3

@player1
❤️ 20 HP
Board:
1. Forest Raptor 3/2
2. Ancient Egg (hatches in 1)
Hand: 3 cards

@player2
❤️ 18 HP
Board:
1. Horned Guardian 1/4 [Guard]
Hand: 4 cards
```

## Notes

- The domain engine in `src/domain` is pure and does not depend on Telegram, Prisma, or Redis.
- Redis stores queue, active battle cache, battle view references, and battle locks.
- PostgreSQL stores durable metadata and battle history.
- Long polling is used for simplicity.
