'use client';

import React from 'react';
import { PlayerColor, GameState } from './types';
import {
    BOARD_SIZE,
    TRACK_COORDS,
    HOME_PATHS,
    HOME_BASES
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
        if (r >= 6 && r <= 8 && c >= 6 && c <= 8) return { type: 'finish' };
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
            if (p.position >= 52) {
                const homeP = HOME_PATHS[p.color][p.position - 52];
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
                                    const homeColor = Object.keys(HOME_PATHS).find(color => 
                                        HOME_PATHS[color as PlayerColor].some(coord => coord.r === r && coord.c === c)
                                    ) as PlayerColor | undefined;
                                    const homeIndex = homeColor ? HOME_PATHS[homeColor].findIndex(coord => coord.r === r && coord.c === c) : -1;
                                    const baseColor = Object.keys(HOME_BASES).find(color =>
                                        HOME_BASES[color as PlayerColor].some(coord => coord.r === r && coord.c === c)
                                    ) as PlayerColor | undefined;

                                    return (
                                        <div 
                                            key={`${r}-${c}`}
                                            className={cn(
                                                "border border-gray-200 flex items-center justify-center relative",
                                                cell.type === 'base' && {
                                                    red: 'bg-red-50', green: 'bg-green-50', yellow: 'bg-yellow-50', blue: 'bg-blue-50'
                                                }[cell.color!],
                                                cell.type === 'home-path' && COLOR_MAP[cell.color!],
                                                cell.type === 'track' && cell.color && COLOR_MAP[cell.color!],
                                                cell.type === 'finish' && 'bg-gray-200',
                                                cell.type === 'empty' && 'bg-white'
                                            )}
                                        >
                                            <span className="absolute inset-0 flex items-center justify-center text-[8px] opacity-10 select-none pointer-events-none font-bold">
                                                {trackIndex !== -1 && `P${trackIndex + 1}`}
                                                {homeIndex !== -1 && `${homeColor?.charAt(0).toUpperCase()}H${homeIndex + 1}`}
                                                {baseColor && `${baseColor.charAt(0).toUpperCase()}B`}
                                            </span>

                                            <div className="flex flex-wrap gap-0.5 items-center justify-center p-0.5">
                                                {cellPieces.map((p) => {
                                                    const canMovePiece = diceValue !== null && (
                                                        (p.position === -1 && diceValue === 6) ||
                                                        (p.position >= 0 && p.position <= 51) ||
                                                        (p.position >= 52 && p.position + diceValue <= 57)
                                                    );

                                                    return (
                                                        <button
                                                            key={p.id}
                                                            onClick={() => movePiece(p.id)}
                                                            disabled={p.color !== currentTurn || diceValue === null || !canMovePiece}
                                                            className={cn(
                                                                "w-4 h-4 sm:w-5 sm:h-5 border-2 border-black rounded-full shadow-sm z-10 transition-transform",
                                                                COLOR_MAP[p.color],
                                                                p.color === currentTurn && diceValue !== null && canMovePiece && "ring-2 ring-white scale-125 z-20 animate-pulse",
                                                                (p.color !== currentTurn || !canMovePiece) && "opacity-50 cursor-not-allowed"
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
                                disabled={diceValue !== null || isRolling || !canInteract}
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
