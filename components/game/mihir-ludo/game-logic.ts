'use client';

import { useState, useCallback, useEffect } from 'react';
import { PlayerColor, Piece, GameState } from './types';
import { START_INDICES } from './board-constants';

const COLORS: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

const createInitialPieces = (playerCount: number): Piece[] => {
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
  });

  const getActiveColors = (count: number): PlayerColor[] => {
    if (count === 2) return ['red', 'yellow'];
    return COLORS.slice(0, count);
  };

  const getNextTurn = (
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
    });
  };

  const rollDice = useCallback(() => {
    if (gameState.isRolling || gameState.diceValue !== null || !gameState.gameStarted) return;

    setGameState((prev) => ({ ...prev, isRolling: true, diceValue: null }));

    setTimeout(() => {
      setGameState((prev) => {
        const playerPieces = prev.pieces.filter(p => p.color === prev.currentTurn);
        const allAtHome = playerPieces.every(p => p.position === -1);
        const currentPity = prev.pityCounters[prev.currentTurn];
        
        // Pity threshold set to 10 non-6 rolls while stuck at home
        let roll: number;
        if (allAtHome && currentPity >= 10) {
          roll = 6;
        } else {
          roll = Math.floor(Math.random() * 6) + 1;
        }

        const newPityCounters = { ...prev.pityCounters };
        if (roll === 6) {
          newPityCounters[prev.currentTurn] = 0;
        } else if (allAtHome) {
          newPityCounters[prev.currentTurn] += 1;
        }

        const canMove = playerPieces.length > 0 && playerPieces.some(p => {
          if (p.position === -1) return roll === 6;
          if (p.position >= 52) return p.position + roll <= 57;
          return true;
        });

        if (!canMove) {
          // AUTO PASS - Delay turn change until dice is cleared
          const nextTurn = getNextTurn(prev.currentTurn, roll, prev.pieces, prev.playerCount, true);
          
          setTimeout(() => {
            setGameState(st => {
              // Ensure we only clear if turn hasn't changed manually
              if (st.currentTurn === prev.currentTurn && st.diceValue === roll) {
                return { 
                  ...st, 
                  diceValue: null, 
                  currentTurn: nextTurn 
                };
              }
              return st;
            });
          }, 1000);

          return { 
            ...prev, 
            diceValue: roll, 
            isRolling: false, 
            pityCounters: newPityCounters
          };
        }

        return { 
          ...prev, 
          diceValue: roll, 
          isRolling: false,
          pityCounters: newPityCounters
        };
      });
    }, 600);
  }, [gameState.isRolling, gameState.diceValue, gameState.gameStarted, gameState.currentTurn]);

  const movePiece = useCallback((pieceId: string) => {
    setGameState((prev) => {
      const { currentTurn, diceValue, pieces, playerCount, winners, gameStarted } = prev;
      if (diceValue === null || !gameStarted) return prev;

      const piece = pieces.find((p) => p.id === pieceId);
      if (!piece || piece.color !== currentTurn) return prev;

      let nextPos = piece.position;
      const startIdx = START_INDICES[currentTurn];
      const preHomeIdx = (startIdx + 51) % 52;

      if (piece.position === -1) {
        if (diceValue === 6) nextPos = startIdx;
        else return prev;
      } else if (piece.position >= 0 && piece.position <= 51) {
        const stepsToPreHome = (preHomeIdx - piece.position + 52) % 52;
        if (diceValue > stepsToPreHome) {
          const remainingSteps = diceValue - stepsToPreHome - 1;
          nextPos = 52 + remainingSteps;
        } else {
          nextPos = (piece.position + diceValue) % 52;
        }
      } else if (piece.position >= 52) {
        if (piece.position + diceValue <= 57) nextPos = piece.position + diceValue;
        else return prev;
      }

      if (nextPos === piece.position && piece.position !== -1) return prev;

      let newPieces = [...pieces];
      let extraTurn = false;

      if (nextPos >= 0 && nextPos <= 51) {
        const IS_SAFE = [0, 8, 13, 21, 26, 34, 39, 47].some(idx => idx === nextPos);
        if (!IS_SAFE) {
          const victimIdx = newPieces.findIndex(p => p.position === nextPos && p.color !== currentTurn);
          if (victimIdx !== -1) {
            newPieces[victimIdx] = { ...newPieces[victimIdx], position: -1 };
            extraTurn = true;
          }
        }
      }

      newPieces = newPieces.map(p => p.id === pieceId ? { ...p, position: nextPos } : p);
      if (nextPos === 57) extraTurn = true;

      const isFinished = newPieces.filter(p => p.color === currentTurn).every(p => p.position === 57);
      let newWinners = winners;
      if (isFinished && !winners.includes(currentTurn)) {
        newWinners = [...winners, currentTurn];
      }

      const nextTurn = (extraTurn || diceValue === 6) 
        ? currentTurn 
        : getNextTurn(currentTurn, diceValue, newPieces, playerCount);
      
      return {
        ...prev,
        pieces: newPieces,
        diceValue: null,
        winners: newWinners,
        currentTurn: nextTurn,
      };
    });
  }, []);

  // Auto-move logic
  useEffect(() => {
    const { diceValue, isRolling, pieces, currentTurn, gameStarted } = gameState;
    
    if (gameStarted && diceValue !== null && !isRolling) {
      const movablePieces = pieces.filter(p => {
        if (p.color !== currentTurn) return false;
        
        // Piece movement rules
        if (p.position === -1) return diceValue === 6;
        if (p.position >= 52) return p.position + diceValue <= 57;
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
