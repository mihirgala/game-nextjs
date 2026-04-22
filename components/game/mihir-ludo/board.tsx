'use client';

import React from 'react';
import { PlayerColor, GameState } from './types';
import {
    BOARD_SIZE,
    TRACK_COORDS,
    HOME_PATHS,
    HOME_BASES,
    SAFE_SPOTS
} from './board-constants';
import { cn } from '@/lib/utils';
import { Dice } from '@/components/game/mihir-ludo/dice';
import { useLudoLogic } from './game-logic';

const COLOR_MAP: Record<PlayerColor, string> = {
    red: 'bg-red-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-400',
    blue: 'bg-blue-500',
};

const COLOR_TEXT: Record<PlayerColor, string> = {
    red: 'text-red-500',
    green: 'text-green-500',
    yellow: 'text-yellow-600',
    blue: 'text-blue-500',
};

interface BoardProps {
    gameState: GameState;
    rollDice: () => void;
    movePiece: (pieceId: string) => void;
    startGame: (count: number) => void;
    canInteract?: boolean;
}

export const Board = ({ gameState, rollDice, movePiece, startGame, canInteract = true }: BoardProps) => {
    const { pieces, currentTurn, diceValue, isRolling, winners, gameStarted } = gameState;

    const getCellType = (r: number, c: number) => {
        for (const [color, coords] of Object.entries(HOME_BASES)) {
            if (coords.some(coord => coord.r === r && coord.c === c)) return { type: 'base-slot', color: color as PlayerColor };
        }
        for (const [color, coords] of Object.entries(HOME_PATHS)) {
            if (coords.some(coord => coord.r === r && coord.c === c)) return { type: 'home-path', color: color as PlayerColor };
        }
        if (TRACK_COORDS.some(coord => coord.r === r && coord.c === c)) {
            if (r === 6 && c === 1) return { type: 'track', color: 'red' as PlayerColor };
            if (r === 1 && c === 8) return { type: 'track', color: 'green' as PlayerColor };
            if (r === 8 && c === 13) return { type: 'track', color: 'yellow' as PlayerColor };
            if (r === 13 && c === 6) return { type: 'track', color: 'blue' as PlayerColor };
            return { type: 'track' };
        }
        if (r < 6 && c < 6) return { type: 'base', color: 'red' as PlayerColor };
        if (r < 6 && c > 8) return { type: 'base', color: 'green' as PlayerColor };
        if (r > 8 && c > 8) return { type: 'base', color: 'yellow' as PlayerColor };
        if (r > 8 && c < 6) return { type: 'base', color: 'blue' as PlayerColor };
        if (r === 7 && c === 7) return { type: 'finish' };
        return { type: 'empty' };
    };

    const getPiecesAt = (r: number, c: number) => {
        return pieces.filter(p => {
            if (p.position === -1) {
                const baseArray = HOME_BASES[p.color];
                const pieceIdx = parseInt(p.id.split('-')[1]);
                const baseS = baseArray[pieceIdx];
                return baseS.r === r && baseS.c === c;
            }
            if (p.position >= 56) {
                const homeP = HOME_PATHS[p.color][p.position - 56];
                return homeP.r === r && homeP.c === c;
            }
            const trackP = TRACK_COORDS[p.position];
            return trackP.r === r && trackP.c === c;
        });
    };

    if (!gameStarted) {
        return (
            <div className="flex flex-col items-center justify-center gap-8 p-10 bg-white min-h-screen text-black font-sans">
                <h1 className="text-5xl font-black tracking-tighter border-b-8 border-black pb-2">LUDO LOCAL</h1>
                <div className="flex flex-col gap-6 w-full max-w-md">
                    <p className="text-xl font-bold uppercase text-center">Select Players</p>
                    <div className="grid grid-cols-3 gap-4">
                        {[2, 3, 4].map((count) => (
                            <button
                                key={count}
                                onClick={() => startGame(count)}
                                className="border-4 border-black p-6 text-3xl font-black hover:bg-black hover:text-white transition-colors active:scale-95"
                            >
                                {count}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center gap-4 p-4 bg-white min-h-screen text-black font-sans">
            <div className="flex flex-col border-4 border-black p-6 gap-6 max-w-2xl w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex justify-between items-center border-b-4 border-black pb-2">
                    <div className="text-2xl font-black uppercase">
                        TURN: <span className={cn(COLOR_TEXT[currentTurn], "underline")}>{currentTurn}</span>
                    </div>
                    {winners.length > 0 && (
                        <div className="text-sm font-bold bg-black text-white px-2 py-1">
                            WINNERS: {winners.join(', ')}
                        </div>
                    )}
                </div>
                
                <div className="flex justify-center">
                    <div className="border-4 border-black p-1 bg-black">
                        <div 
                            className="grid grid-cols-[repeat(15,1fr)] bg-white"
                            style={{ width: 'min(90vw, 550px)', height: 'min(90vw, 550px)' }}
                        >
                            {Array.from({ length: BOARD_SIZE }).map((_, r) => (
                                Array.from({ length: BOARD_SIZE }).map((_, c) => {
                                    const cell = getCellType(r, c);
                                    const cellPieces = getPiecesAt(r, c);
                                    const trackIndex = TRACK_COORDS.findIndex(coord => coord.r === r && coord.c === c);

                                    return (
                                        <div 
                                            key={`${r}-${c}`}
                                            className={cn(
                                                "border border-gray-200 flex items-center justify-center relative overflow-hidden",
                                                cell.type === 'base' && {
                                                    red: 'bg-red-50', green: 'bg-green-50', yellow: 'bg-yellow-50', blue: 'bg-blue-50'
                                                }[cell.color!],
                                                cell.type === 'home-path' && COLOR_MAP[cell.color!],
                                                cell.type === 'track' && cell.color && COLOR_MAP[cell.color!],
                                                cell.type === 'finish' && 'bg-white',
                                                cell.type === 'empty' && 'bg-white'
                                            )}
                                            style={{ minWidth: 0, minHeight: 0 }}
                                        >
                                            {cell.type === 'finish' && r === 7 && c === 7 && (
                                                <div className="absolute inset-0 overflow-hidden">
                                                    <div className="w-full h-full relative border-2 border-black">
                                                        <div className="absolute inset-0 bg-red-500" style={{ clipPath: 'polygon(0 0, 50% 50%, 0 100%)' }} />
                                                        <div className="absolute inset-0 bg-green-500" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 50%)' }} />
                                                        <div className="absolute inset-0 bg-yellow-400" style={{ clipPath: 'polygon(100% 0, 100% 100%, 50% 50%)' }} />
                                                        <div className="absolute inset-0 bg-blue-500" style={{ clipPath: 'polygon(0 100%, 100% 100%, 50% 50%)' }} />
                                                        <div className="absolute inset-[25%] bg-white border-2 border-black rounded-full" />
                                                    </div>
                                                </div>
                                            )}

                                            {cell.type === 'home-path' && (
                                                <div className={cn(
                                                    "absolute inset-0 opacity-40",
                                                    cell.color === 'red' && "bg-red-500",
                                                    cell.color === 'green' && "bg-green-500",
                                                    cell.color === 'yellow' && "bg-yellow-400",
                                                    cell.color === 'blue' && "bg-blue-500",
                                                    // Higher opacity for the "End" cell
                                                    ((r === 7 && c === 6) || (r === 6 && c === 7) || (r === 7 && c === 8) || (r === 8 && c === 7)) && "opacity-80"
                                                )} />
                                            )}

                                            {trackIndex !== -1 && SAFE_SPOTS.includes(trackIndex) && (
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                                                    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
                                                        <path d="M12 .587l3.668 7.431 8.332 1.21-6.001 5.85 1.416 8.297L12 18.897l-7.415 3.898 1.416-8.297-6.001-5.85 8.332-1.21L12 .587z" />
                                                    </svg>
                                                </div>
                                            )}

                                            {/* Directional Arrows for Home Entrance */}
                                            {r === 7 && c === 0 && <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40 text-red-500 text-xl font-black">→</div>}
                                            {r === 0 && c === 7 && <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40 text-green-500 text-xl font-black">↓</div>}
                                            {r === 7 && c === 14 && <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40 text-yellow-600 text-xl font-black">←</div>}
                                            {r === 14 && c === 7 && <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40 text-blue-500 text-xl font-black">↑</div>}
                                            
                                            <span className="absolute inset-0 flex items-center justify-center text-[8px] opacity-10 select-none pointer-events-none font-bold">
                                                {trackIndex !== -1 && (trackIndex + 1)}
                                                {((r === 7 && c === 6) || (r === 6 && c === 7) || (r === 7 && c === 8) || (r === 8 && c === 7)) && "End"}
                                            </span>

                                            <div className={cn(
                                                "absolute inset-0 flex flex-wrap gap-0.5 items-center justify-center p-0.5 pointer-events-none",
                                                ((r === 7 && c === 7) || (r === 7 && c === 6) || (r === 6 && c === 7) || (r === 7 && c === 8) || (r === 8 && c === 7)) && "flex-col" // Stack pieces in finish area
                                            )}>
                                                {cellPieces.map((p) => {
                                                    const canMovePiece = diceValue !== null && (
                                                        (p.position === -1 && diceValue === 6) ||
                                                        (p.position >= 0 && p.position <= 55) ||
                                                        (p.position >= 56 && p.position + diceValue <= 61)
                                                    );

                                                    return (
                                                        <button
                                                            key={p.id}
                                                            onClick={() => movePiece(p.id)}
                                                            disabled={p.color !== currentTurn || diceValue === null || !canMovePiece || gameState.isAnimating}
                                                            className={cn(
                                                                "w-4 h-4 sm:w-5 sm:h-5 border-2 border-black rounded-full shadow-sm z-10 transition-all duration-300 pointer-events-auto",
                                                                COLOR_MAP[p.color],
                                                                p.color === currentTurn && diceValue !== null && canMovePiece && "ring-2 ring-white scale-125 z-20 animate-pulse",
                                                                (p.color !== currentTurn || !canMovePiece) && "opacity-50 cursor-not-allowed",
                                                                // Custom positioning in the finish area cells
                                                                ((r === 7 && c === 6) || (r === 6 && c === 7) || (r === 7 && c === 8) || (r === 8 && c === 7)) && 
                                                                p.position === 61 && "scale-90" // Slightly smaller when finished
                                                            )}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                         <Dice value={diceValue || 1} isRolling={isRolling} onRoll={rollDice} disabled={diceValue !== null || isRolling} color={currentTurn} />
                         <div className="flex-1">
                            <button 
                                onClick={rollDice} 
                                disabled={diceValue !== null || isRolling || !canInteract || gameState.isAnimating}
                                className={cn(
                                    "w-full py-4 font-black transition-all active:scale-95 disabled:opacity-50 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                                    COLOR_MAP[currentTurn],
                                    "text-white text-xl uppercase tracking-widest",
                                    (!canInteract && diceValue === null) && "grayscale opacity-50 cursor-not-allowed"
                                )}
                            >
                                {isRolling ? 'ROLLING...' : 'ROLL DICE'}
                            </button>
                         </div>
                    </div>
                    <button 
                        onClick={() => startGame(gameState.playerCount)}
                        className="text-xs font-bold uppercase underline text-right opacity-50 hover:opacity-100"
                    >
                        Restart Game
                    </button>
                </div>

            </div>
        </div>
    );
};
