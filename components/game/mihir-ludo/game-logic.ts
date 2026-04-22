'use client';

import { useState, useCallback, useEffect } from 'react';
import { PlayerColor, Piece, GameState } from './types';
import { START_INDICES, SAFE_SPOTS } from './board-constants';

const COLORS: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

export const createInitialPieces = (playerCount: number): Piece[] => {
  const pieces: Piece[] = [];
  const activeColors = COLORS.slice(0, playerCount);
  // For 2 players, use Red and Yellow for better balance (opposite sides)
  const finalColors: PlayerColor[] = playerCount === 2 ? ['red', 'yellow'] : activeColors;

  finalColors.forEach((color) => {
    for (let i = 0; i < 4; i++) {
      pieces.push({
        id: `${color}-${i}`,
        color,
        position: -1,
      });
    }
  });
  return pieces;
};

export const getActiveColors = (count: number): PlayerColor[] => {
  if (count === 2) return ['red', 'yellow'];
  return COLORS.slice(0, count);
};

export const getNextTurn = (
  currentColor: PlayerColor,
  diceValue: number | null,
  pieces: Piece[],
  count: number,
  forceNext: boolean = false
): PlayerColor => {
  if (diceValue === 6 && !forceNext) return currentColor;

  const activeColors = getActiveColors(count);
  const currentIndex = activeColors.indexOf(currentColor);

  for (let i = 1; i < activeColors.length; i++) {
    const nextIndex = (currentIndex + i) % activeColors.length;
    const nextColor = activeColors[nextIndex];
    const playerPieces = pieces.filter(p => p.color === nextColor);
    const isFinished = playerPieces.every(p => p.position === 57);
    if (!isFinished) return nextColor;
  }
  return currentColor;
};

// Pure logic for rolling dice
export const performRoll = (state: GameState, forcedRoll?: number): GameState => {
  const playerPieces = state.pieces.filter(p => p.color === state.currentTurn);
  const allAtHome = playerPieces.every(p => p.position === -1);
  const currentPity = state.pityCounters[state.currentTurn];

  let roll: number;
  if (forcedRoll !== undefined) {
    roll = forcedRoll;
  } else if (allAtHome && currentPity >= 10) {
    roll = 6;
  } else {
    roll = Math.floor(Math.random() * 6) + 1;
  }

  const newPityCounters = { ...state.pityCounters };
  if (roll === 6) {
    newPityCounters[state.currentTurn] = 0;
  } else if (allAtHome) {
    newPityCounters[state.currentTurn] += 1;
  }

  const canMove = playerPieces.length > 0 && playerPieces.some(p => {
    if (p.position === -1) return roll === 6;
    if (p.position >= 52) return p.position + roll <= 57;
    return true;
  });

  if (!canMove) {
    const nextTurn = getNextTurn(state.currentTurn, roll, state.pieces, state.playerCount, true);
    return {
      ...state,
      diceValue: roll,
      isRolling: false,
      pityCounters: newPityCounters,
      // We'll handle the delay for turn change in the hook or online manager
      _pendingTurn: nextTurn 
    };
  }

  return {
    ...state,
    diceValue: roll,
    isRolling: false,
    pityCounters: newPityCounters
  };
};

export const getMovePath = (startPos: number, color: PlayerColor, steps: number): number[] => {
  const path: number[] = [];
  const startIdx = START_INDICES[color];
  const preHomeIdx = (startIdx + 51) % 52;

  if (startPos === -1) {
    if (steps === 6) return [startIdx];
    return [];
  }

  let current = startPos;
  for (let i = 0; i < steps; i++) {
    if (current >= 0 && current <= 51) {
      if (current === preHomeIdx) {
        current = 52;
      } else {
        current = (current + 1) % 52;
      }
    } else if (current >= 52) {
      if (current < 58) {
        current++;
      } else {
        break; // Already at home
      }
    }
    path.push(current);
  }
  return path;
};

// Pure logic for moving a piece
export const performMove = (state: GameState, pieceId: string): GameState => {
  const { currentTurn, diceValue, pieces, playerCount, winners, gameStarted } = state;
  if (diceValue === null || !gameStarted) return state;

  const piece = pieces.find((p) => p.id === pieceId);
  if (!piece || piece.color !== currentTurn) return state;

  const path = getMovePath(piece.position, currentTurn, diceValue);
  if (path.length === 0) return state;
  
  const nextPos = path[path.length - 1];

  let newPieces = [...pieces];
  let extraTurn = false;

  if (nextPos >= 0 && nextPos <= 51) {
    const IS_SAFE = SAFE_SPOTS.includes(nextPos);
    if (!IS_SAFE) {
      const opponentPieces = newPieces.filter(p => p.position === nextPos && p.color !== currentTurn);
      // Blockade: 2 or more pieces of the same color on a non-safe spot cannot be captured
      const isBlockade = opponentPieces.length >= 2;
      
      if (!isBlockade && opponentPieces.length > 0) {
        newPieces = newPieces.map(p => 
          (p.position === nextPos && p.color !== currentTurn) 
            ? { ...p, position: -1 } 
            : p
        );
        extraTurn = true;
      }
    }
  }

  newPieces = newPieces.map(p => p.id === pieceId ? { ...p, position: nextPos } : p);
  if (nextPos === 58) extraTurn = true;

  const isFinished = newPieces.filter(p => p.color === currentTurn).every(p => p.position === 58);
  let newWinners = winners;
  if (isFinished && !winners.includes(currentTurn)) {
    newWinners = [...winners, currentTurn];
  }

  const nextTurn = (extraTurn || diceValue === 6)
    ? currentTurn
    : getNextTurn(currentTurn, diceValue, newPieces, playerCount);

  return {
    ...state,
    pieces: newPieces,
    diceValue: null,
    winners: newWinners,
    currentTurn: nextTurn,
  };
};

export const useLudoLogic = () => {
  const [gameState, setGameState] = useState<GameState>({
    pieces: createInitialPieces(4),
    currentTurn: 'red',
    diceValue: null,
    isRolling: false,
    winners: [],
    playerCount: 4,
    gameStarted: false,
    pityCounters: { red: 0, green: 0, yellow: 0, blue: 0 },
    isAnimating: false,
  });

  const startGame = (count: number) => {
    const players = getActiveColors(count);
    setGameState({
      pieces: createInitialPieces(count),
      currentTurn: players[0],
      diceValue: null,
      isRolling: false,
      winners: [],
      playerCount: count,
      gameStarted: true,
      pityCounters: { red: 0, green: 0, yellow: 0, blue: 0 },
      isAnimating: false,
    });
  };

  const rollDice = useCallback(() => {
    if (gameState.isRolling || gameState.diceValue !== null || !gameState.gameStarted) return;

    setGameState((prev) => ({ ...prev, isRolling: true, diceValue: null }));

    setTimeout(() => {
      setGameState((prev) => {
        const nextState = performRoll(prev);
        
        if (nextState._pendingTurn) {
          const finalTurn = nextState._pendingTurn;
          delete nextState._pendingTurn;
          
          setTimeout(() => {
            setGameState(st => ({
              ...st,
              diceValue: null,
              currentTurn: finalTurn
            }));
          }, 1000);
        }

        return nextState;
      });
    }, 600);
  }, [gameState.isRolling, gameState.diceValue, gameState.gameStarted, gameState.currentTurn]);

  const movePiece = useCallback((pieceId: string) => {
    setGameState((prev) => {
      const piece = prev.pieces.find(p => p.id === pieceId);
      if (!piece || prev.diceValue === null || prev.isAnimating) return prev;

      const path = getMovePath(piece.position, prev.currentTurn, prev.diceValue);
      if (path.length === 0) return prev;

      // Start animation
      let currentStep = 0;
      const animate = () => {
        if (currentStep >= path.length) {
          // Finalize move
          setGameState(st => {
            const finalState = performMove({ ...st, isAnimating: false }, pieceId);
            return finalState;
          });
          return;
        }

        const nextPos = path[currentStep];
        setGameState(st => ({
          ...st,
          isAnimating: true,
          pieces: st.pieces.map(p => p.id === pieceId ? { ...p, position: nextPos } : p)
        }));

        currentStep++;
        setTimeout(animate, 250);
      };

      // We need to return an intermediate state that starts the animation
      // or just call animate() and return the current state with isAnimating: true
      setTimeout(animate, 0);
      return { ...prev, isAnimating: true };
    });
  }, []);

  // Auto-move logic
  useEffect(() => {
    const { diceValue, isRolling, pieces, currentTurn, gameStarted } = gameState;

    if (gameStarted && diceValue !== null && !isRolling) {
      const playerPieces = pieces.filter(p => p.color === currentTurn);
      const movablePieces = playerPieces.filter(p => {
        if (p.position === -1) return diceValue === 6;
        if (p.position >= 52) return p.position + diceValue <= 58;
        return true;
      });

      if (movablePieces.length === 1) {
        const timer = setTimeout(() => {
          movePiece(movablePieces[0].id);
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, [gameState.diceValue, gameState.isRolling, gameState.currentTurn, gameState.gameStarted, movePiece, gameState.pieces]);

  return {
    gameState,
    rollDice,
    movePiece,
    startGame,
  };
};

