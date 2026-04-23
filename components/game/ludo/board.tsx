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
import { Dice } from '@/components/game/ludo/dice';

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

const COLOR_BORDER: Record<PlayerColor, string> = {
    red: 'border-red-500',
    green: 'border-green-500',
    yellow: 'border-yellow-400',
    blue: 'border-blue-500',
};

interface BoardProps {
    gameState: GameState;
    rollDice: () => void;
    movePiece: (pieceId: string) => void;
    startGame: (count: number) => void;
    testRollDice?: (val: number) => void;
    canInteract?: boolean;
    serverOffset?: number;
}

const PlayerIndicator = (props: { 
    player: any, 
    isCurrentTurn: boolean, 
    timerStartedAt?: number,
    position: 'tl' | 'tr' | 'bl' | 'br',
    serverOffset?: number
}) => {
    const { player, isCurrentTurn, timerStartedAt, position, serverOffset = 0 } = props;
    const [progress, setProgress] = React.useState(100);

    React.useEffect(() => {
        if (!isCurrentTurn || !timerStartedAt) {
            setProgress(100);
            return;
        }

        const update = () => {
            const now = Date.now() + (serverOffset || 0);
            const elapsed = (now - timerStartedAt) / 1000;
            const remaining = Math.max(0, 20 - elapsed);
            setProgress((remaining / 20) * 100);
        };

        const interval = setInterval(update, 50);
        return () => clearInterval(interval);
    }, [isCurrentTurn, timerStartedAt, serverOffset]);

    const posClasses = {
        tl: "-top-16 -left-2 rounded-t-sm",
        tr: "-top-16 -right-2 rounded-t-sm",
        bl: "-bottom-16 -left-2 rounded-b-sm",
        br: "-bottom-16 -right-2 rounded-b-sm",
    };

    return (
        <div className={cn(
            "absolute w-28 h-16 lg:w-32 lg:h-16 flex flex-col items-center justify-center border-4 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] z-20 transition-all duration-300",
            COLOR_MAP[player.color as PlayerColor],
            isCurrentTurn ? "scale-110 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] ring-4 ring-white/30" : "opacity-90 grayscale-[0.2]",
            posClasses[position]
        )}>
            {/* Status & Timer Header */}
            <div className="flex items-center gap-2 mb-1">
                <div className={cn(
                    "w-3 h-3 rounded-full border-2 border-foreground shadow-inner",
                    player.isConnected ? "bg-green-400 animate-pulse" : "bg-red-500"
                )} />
                {isCurrentTurn && (
                    <span className="text-[12px] font-black text-white drop-shadow-md animate-pulse">
                        {Math.ceil((progress / 100) * 20)}s
                    </span>
                )}
            </div>
            
            <p className="text-[11px] font-black uppercase text-white tracking-tight drop-shadow-md">
                {player.name}
            </p>

            {/* Linear Timer at Bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-2 lg:h-1.5 bg-black/40 overflow-hidden">
                <div 
                    className={cn(
                        "h-full bg-white transition-all duration-100 ease-linear",
                        progress < 30 ? "bg-red-500" : progress < 60 ? "bg-yellow-400" : "bg-white"
                    )}
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Connection line to board */}
            <div className={cn(
                "absolute bg-foreground",
                (position === 'tl' || position === 'tr') ? "h-2 w-1.5 -bottom-2" : "h-2 w-1.5 -top-2",
                (position === 'tl' || position === 'bl') ? "left-8" : "right-8"
            )} />
        </div>
    );
};


export const Board = ({ gameState, rollDice, movePiece, startGame, testRollDice, canInteract = true, serverOffset = 0 }: BoardProps) => {
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

    const getPlayerByColor = (color: PlayerColor) => {
        return gameState.players?.find(p => p.color === color);
    };

    if (!gameStarted) {
        return (
            <div className="flex flex-col items-center justify-center gap-8 p-10 bg-background min-h-screen text-foreground">
                <h1 className="text-5xl font-black tracking-tighter border-b-8 border-foreground pb-2 uppercase">Ludo Arena</h1>
                <div className="flex flex-col gap-6 w-full max-w-md">
                    <p className="text-xl font-bold uppercase text-center opacity-70">Select Players</p>
                    <div className="grid grid-cols-3 gap-4">
                        {[2, 3, 4].map((count) => (
                            <button
                                key={count}
                                onClick={() => startGame(count)}
                                className="border-4 border-foreground p-6 text-3xl font-black hover:bg-foreground hover:text-background transition-all active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]"
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
        <div className="flex flex-col lg:flex-row items-center justify-center lg:items-start p-2 lg:p-10 bg-background min-h-screen text-foreground overflow-hidden gap-4 lg:gap-16">
            <div className="relative flex items-center justify-center py-20">
                <div className="relative border-4 lg:border-8 border-foreground p-1 bg-foreground shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)]">
                    {/* Corner Indicators Attached to the Board */}
                    {getPlayerByColor('red') && (
                        <PlayerIndicator 
                            player={getPlayerByColor('red')} 
                            isCurrentTurn={currentTurn === 'red'} 
                            timerStartedAt={gameState.timerStartedAt}
                            position="tl"
                            serverOffset={serverOffset}
                        />
                    )}
                    {getPlayerByColor('green') && (
                        <PlayerIndicator 
                            player={getPlayerByColor('green')} 
                            isCurrentTurn={currentTurn === 'green'} 
                            timerStartedAt={gameState.timerStartedAt}
                            position="tr"
                            serverOffset={serverOffset}
                        />
                    )}
                    {getPlayerByColor('blue') && (
                        <PlayerIndicator 
                            player={getPlayerByColor('blue')} 
                            isCurrentTurn={currentTurn === 'blue'} 
                            timerStartedAt={gameState.timerStartedAt}
                            position="bl"
                            serverOffset={serverOffset}
                        />
                    )}
                    {getPlayerByColor('yellow') && (
                        <PlayerIndicator 
                            player={getPlayerByColor('yellow')} 
                            isCurrentTurn={currentTurn === 'yellow'} 
                            timerStartedAt={gameState.timerStartedAt}
                            position="br"
                            serverOffset={serverOffset}
                        />
                    )}
                    <div 
                        className="grid grid-cols-[repeat(15,1fr)] bg-background"
                        style={{ width: 'min(90vw, 750px, 70vh)', height: 'min(90vw, 750px, 70vh)' }}
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
                                                "border border-muted flex items-center justify-center relative overflow-hidden",
                                                cell.type === 'base' && {
                                                    red: 'bg-red-500/5', green: 'bg-green-500/5', yellow: 'bg-yellow-500/5', blue: 'bg-blue-500/5'
                                                }[cell.color!],
                                                cell.type === 'home-path' && COLOR_MAP[cell.color!],
                                                cell.type === 'track' && cell.color && COLOR_MAP[cell.color!],
                                                cell.type === 'finish' && 'bg-background',
                                                cell.type === 'empty' && 'bg-background'
                                            )}
                                            style={{ minWidth: 0, minHeight: 0 }}
                                        >
                                            {cell.type === 'finish' && r === 7 && c === 7 && (
                                                <div className="absolute inset-0 overflow-hidden">
                                                    <div className="w-full h-full relative border-2 border-foreground">
                                                        <div className="absolute inset-0 bg-red-500" style={{ clipPath: 'polygon(0 0, 50% 50%, 0 100%)' }} />
                                                        <div className="absolute inset-0 bg-green-500" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 50%)' }} />
                                                        <div className="absolute inset-0 bg-yellow-400" style={{ clipPath: 'polygon(100% 0, 100% 100%, 50% 50%)' }} />
                                                        <div className="absolute inset-0 bg-blue-500" style={{ clipPath: 'polygon(0 100%, 100% 100%, 50% 50%)' }} />
                                                        <div className="absolute inset-[25%] bg-background border-2 border-foreground rounded-full" />
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
                                                    ((r === 7 && c === 6) || (r === 6 && c === 7) || (r === 7 && c === 8) || (r === 8 && c === 7)) && "opacity-80"
                                                )} />
                                            )}

                                            {trackIndex !== -1 && SAFE_SPOTS.includes(trackIndex) && (
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                                                    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-foreground">
                                                        <path d="M12 .587l3.668 7.431 8.332 1.21-6.001 5.85 1.416 8.297L12 18.897l-7.415 3.898 1.416-8.297-6.001-5.85 8.332-1.21L12 .587z" />
                                                    </svg>
                                                </div>
                                            )}

                                            {/* Directional Arrows for Home Entrance */}
                                            {r === 7 && c === 0 && <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40 text-red-500 text-sm font-black">→</div>}
                                            {r === 0 && c === 7 && <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40 text-green-500 text-sm font-black">↓</div>}
                                            {r === 7 && c === 14 && <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40 text-yellow-600 text-sm font-black">←</div>}
                                            {r === 14 && c === 7 && <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40 text-blue-500 text-sm font-black">↑</div>}
                                            
                                            <div className={cn(
                                                "absolute inset-0 grid gap-0.5 items-center justify-center p-0.5 pointer-events-none",
                                                cellPieces.length === 1 && "grid-cols-1",
                                                cellPieces.length === 2 && "grid-cols-2",
                                                cellPieces.length >= 3 && "grid-cols-2 grid-rows-2",
                                                ((r === 7 && c === 7) || (r === 7 && c === 6) || (r === 6 && c === 7) || (r === 7 && c === 8) || (r === 8 && c === 7)) && "flex flex-col"
                                            )}>
                                                {cellPieces.map((p) => {
                                                    const canMovePiece = diceValue !== null && (
                                                        (p.position === -1 && diceValue === 6) ||
                                                        (p.position >= 0 && p.position <= 55) ||
                                                        (p.position >= 56 && p.position + diceValue <= 61)
                                                    );

                                                    const isMovable = p.color === currentTurn && diceValue !== null && canMovePiece && !gameState.isAnimating;

                                                    return (
                                                        <button
                                                            key={p.id}
                                                            onClick={() => movePiece(p.id)}
                                                            disabled={!isMovable}
                                                            className={cn(
                                                                "border-2 border-foreground rounded-full shadow-sm z-10 transition-all duration-300 pointer-events-auto relative overflow-hidden",
                                                                COLOR_MAP[p.color],
                                                                cellPieces.length === 1 ? "w-[18px] h-[18px] sm:w-5 sm:h-5 lg:w-8 lg:h-8" : "w-3 h-3 sm:w-3 sm:h-3 lg:w-5 lg:h-5",
                                                                isMovable && "ring-2 ring-background scale-110 z-20 shadow-[0_0_10px_rgba(255,255,255,0.5)] movable-stripes",
                                                                (!canMovePiece && diceValue !== null && p.color === currentTurn) && "opacity-30 grayscale",
                                                                (p.color !== currentTurn) && "opacity-80",
                                                                ((r === 7 && c === 6) || (r === 6 && c === 7) || (r === 7 && c === 8) || (r === 8 && c === 7)) && 
                                                                p.position === 61 && "scale-75 opacity-50"
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

            <div className="flex flex-col gap-6 w-full max-w-sm lg:mt-16 items-center">
                <div className="flex flex-col items-center justify-center p-4">
                     <Dice 
                        value={diceValue} 
                        isRolling={isRolling} 
                        color={currentTurn} 
                        onClick={rollDice}
                        disabled={diceValue !== null || !canInteract || gameState.isAnimating}
                     />
                </div>

                {winners.length > 0 && (
                    <div className="bg-foreground text-background p-4 border-4 border-foreground font-black uppercase text-center animate-bounce text-sm">
                        Winners: {winners.join(' 🏆 ')}
                    </div>
                )}
                
                {process.env.NODE_ENV !== 'production' && testRollDice && (
                    <div className="flex flex-col gap-2 p-3 border-2 border-dashed border-primary/30 rounded-lg bg-primary/5">
                        <p className="text-[9px] font-black uppercase tracking-widest text-primary opacity-60">Debug Dice (Dev Only)</p>
                        <div className="flex gap-1.5">
                            {[1, 2, 3, 4, 5, 6].map(val => (
                                <button
                                    key={val}
                                    onClick={() => testRollDice(val)}
                                    className="flex-1 py-1.5 border-2 border-primary/30 font-black hover:bg-primary hover:text-white transition-all text-xs rounded"
                                >
                                    {val}
                                </button>
                            ))}
                        </div>
                        <button 
                            onClick={() => startGame(gameState.playerCount)}
                            className="w-full mt-1 py-1.5 border-2 border-red-500/30 text-red-500 font-black hover:bg-red-500 hover:text-white transition-all text-[9px] uppercase rounded"
                        >
                            Restart Game (Reset Board)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
