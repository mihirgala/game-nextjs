export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

export interface Piece {
  id: string;
  color: PlayerColor;
  position: number;
}

export interface GameState {
  pieces: Piece[];
  currentTurn: PlayerColor;
  diceValue: number | null;
  isRolling: boolean;
  winners: PlayerColor[];
  playerCount: number;
  gameStarted: boolean;
  status?: 'waiting' | 'playing' | 'finished';
  pityCounters: Record<PlayerColor, number>;
}
