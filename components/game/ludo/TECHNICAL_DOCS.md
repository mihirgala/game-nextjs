# LudoMihir: Technical Architecture & Gameplay Logic

This document explains the full working of the LudoMihir game, from initialization to winning conditions, covering both local and online multiplayer modes.

## 1. Core State Structure (`GameState`)
The entire game is driven by a central `GameState` object:
- `pieces`: Array of 16 pieces (4 per color), each with an `id`, `color`, and `position`.
- `currentTurn`: The color of the player whose turn it is.
- `diceValue`: The result of the current roll (1-6) or `null` if waiting for a roll.
- `isRolling`: Boolean to trigger the dice animation.
- `winners`: Array tracking players who have finished the game.
- `pityCounters`: Tracks consecutive non-6 rolls for players stuck at home.

## 2. The Game Lifecycle

### Step 1: Initialization
- **Function**: `createInitialPieces(playerCount)`
- **Logic**: 
    - If 2 players, colors are **Red** and **Yellow** (opposite sides for balance).
    - If 4 players, colors are **Red**, **Green**, **Yellow**, and **Blue**.
    - Each player starts with 4 pieces at `position: -1` (Home Base).

### Step 2: The Dice Roll
- **Function**: `performRoll(state)`
- **Logic**:
    1. Checks if the player is "stuck at home" (all pieces at `-1`).
    2. **Pity Logic**: If a player is stuck at home and has rolled 10 times without a 6, the next roll is forced to be a `6`.
    3. **Movable Check**: After rolling, the system checks if any piece can move.
    4. **Auto-Pass**: If no pieces can move (e.g., rolled a 3 but all pieces are at base), the turn automatically passes to the next player after a 1-second delay (`_pendingTurn`).

### Step 3: Piece Movement
- **Function**: `performMove(state, pieceId)`
- **Logic**:
    - **Exiting Base**: A piece can only exit base (`position: -1`) if the roll is a `6`. It moves to the player's `START_INDEX`.
    - **Global Track**: Pieces move around a 52-cell global track.
    - **Home Stretch**: When a piece completes its lap, it enters the "Home Stretch" (positions 52-56).
    - **Finishing**: A piece must land exactly on position `57` to finish.

### Step 4: Special Rules (Cutting & Extra Turns)
- **Cutting**: If a piece lands on an opponent's piece on a non-safe spot, the opponent's piece is sent back to `-1`. This grants the current player an **Extra Turn**.
- **Safe Spots**: There are 8 safe spots on the board where pieces cannot be cut.
- **Rolling a 6**: Grants an **Extra Turn**.
- **Reaching Home**: Successfully moving a piece to position 57 grants an **Extra Turn**.

### Step 5: Turn Transition
- **Function**: `getNextTurn(...)`
- **Logic**: Cycles through active colors. If a player has already finished (all pieces at 57), they are skipped.

## 3. Online Multiplayer Synchronization

### The "Relay" Architecture
The backend (`express-socket/src/index.ts`) does not calculate any game logic. Instead:
1. **Action**: A player rolls or moves.
2. **Local Calculation**: The player's client calculates the *new state* using the shared functions in `game-logic.ts`.
3. **Sync**: The client sends the new state to the backend via `game:update`.
4. **Broadcast**: The backend sends this state to all other players in the room.

### Host-Side Bot Logic
If the match includes a Bot:
- The **Host** (first player) is responsible for the Bot.
- The Host's client detects when it's the Bot's turn, performs the roll/move locally, and syncs the result to everyone else.

### Auto-Move Logic
To speed up gameplay:
- If a player rolls a value and only **one piece** is capable of moving, the game will automatically execute that move after a 600ms delay.

## 4. Winning & Rematch
- When a player gets all 4 pieces to position 57, they are added to the `winners` list.
- Once the game is over, players can vote for a **Rematch**.
- When all players (and the bot) vote yes, the Host resets the state via `syncState`, and a new game begins with the starter index rotated.
