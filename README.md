# 🎱 Multiplayer Bingo

A room-based multiplayer Bingo game built with React.

## Getting Started

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Play

1. **Create a Room** — Enter your name and click "Create & Enter Room"
2. **Share the Code** — Share the 5-character room code with friends
3. **Friends Join** — Other players enter the code on the Join tab
4. **Host Starts** — The host clicks "Start Game" when everyone is ready
5. **Play!** — Host calls numbers, players daub their cards
6. **BINGO!** — First player to get 5 in a row wins!

## Features

- 🏠 Room-based multiplayer via localStorage
- 🎴 Unique randomly generated Bingo cards per player
- 🎱 Host-controlled number calling
- ✅ Automatic win detection (rows, columns, diagonals)
- 🏆 Winner announcement for all players
- 🔄 1-second polling for real-time-like sync

## Multiplayer Notes

Rooms sync via `localStorage`. For multi-device play, all players need to be on the same browser/device, or you can swap out localStorage for a real backend (Firebase, Supabase, etc.)..
