'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAtom } from 'jotai';
import { socketAtom } from '@/lib/atoms';
import { authClient } from '@/lib/auth-client';
import { Lobby } from './lobby';
import { Board } from './board';
import { toast } from 'sonner';
import { GameState, PlayerColor, Piece } from './types';
import { performRoll, performMove, createInitialPieces, getMovePath } from './game-logic';

interface OnlineGameProps {
    roomId: string;
}

export const LudoOnline = ({ roomId }: OnlineGameProps) => {
    const [socket] = useAtom(socketAtom);
    const { data: session } = authClient.useSession();
    const user = session?.user;

    const [serverOffset, setServerOffset] = useState(0);
    const [remoteRoom, setRemoteRoom] = useState<any>(null);
    const [isValidating, setIsValidating] = useState(true);

    useEffect(() => {
        if (!socket || !roomId || !user) return;

        setIsValidating(true);

        const validateTimer = setTimeout(() => {
            if (isValidating) {
                console.warn("Validation timeout - forcing validation end");
                setIsValidating(false);
            }
        }, 5000);

        socket.emit("room:validate", { roomId, allowCreate: true }, (res: any) => {
            console.log("Room validation response:", res);
            setIsValidating(false);
            clearTimeout(validateTimer);
            if (!res.valid) {
                toast.error(res.error || "Room is invalid.");
                return;
            }

            console.log("Emitting game:join for room:", roomId);
            socket.emit("game:join", {
                roomId,
                game: "ludo",
                userImage: user.image
            });
        });

        const handleState = (state: any) => {
            console.log("Received game state:", state);
            if (state.lastActivity) {
                // Simple clock sync: serverOffset = serverTime - clientTime
                // We use lastActivity as a proxy for current server time
                const offset = state.lastActivity - Date.now();
                setServerOffset(offset);
            }
            if (state.pieces) {
                console.log(`  Piece count in received state: ${state.pieces.length}`);
            }
            setRemoteRoom(state);
        };

        socket.on("game:state", handleState);

        return () => {
            console.log("Leaving room:", roomId);
            socket.emit("game:leave", { roomId });
            socket.off("game:state", handleState);
        };
    }, [socket, roomId, user?.id]);

    const mappedGameState = useCallback((room: any): GameState => {
        if (!room) return {} as GameState;
        return {
            pieces: room.pieces || [],
            currentTurn: (room.players && room.players[room.turnIndex || 0]?.color) as PlayerColor || 'red',
            diceValue: room.diceValue ?? null,
            isRolling: room.isRolling || false,
            winners: room.winners || [],
            playerCount: room.players?.length || 0,
            gameStarted: room.status === 'playing',
            pityCounters: room.pityCounters || { red: 0, green: 0, yellow: 0, blue: 0 },
            isAnimating: room.isAnimating || false,
            timerStartedAt: room.timerStartedAt,
            players: room.players || []
        };
    }, []);

    const gameState = mappedGameState(remoteRoom);
    const isHost = remoteRoom?.players && remoteRoom.players[0]?.userId === user?.id;
    const myPlayer = remoteRoom?.players?.find((p: any) => p.userId === user?.id);
    const myColor = myPlayer?.color as PlayerColor;
    const isMyTurn = gameState.currentTurn === myColor;

    const syncState = useCallback((newState: Partial<GameState> & { status?: string, turnIndex?: number }) => {
        if (!socket || !roomId) return;
        console.log("Syncing state:", newState);
        socket.emit("game:update", { roomId, state: newState });
    }, [socket, roomId]);

    const rollDice = () => {
        if (!isMyTurn || gameState.diceValue !== null || gameState.isRolling) return;

        syncState({ isRolling: true, diceValue: null });

        setTimeout(() => {
            // Re-check turn before applying roll
            setRemoteRoom((currentRoom: any) => {
                if (!currentRoom) return currentRoom;
                const nextState = performRoll(mappedGameState(currentRoom));

                if (nextState._pendingTurn) {
                    const finalTurnColor = nextState._pendingTurn;
                    delete nextState._pendingTurn;
                    syncState(nextState);

                    setTimeout(() => {
                        syncState({
                            diceValue: null,
                            turnIndex: currentRoom.players.findIndex((p: any) => p.color === finalTurnColor)
                        });
                    }, 1000);
                } else {
                    syncState(nextState);
                }
                return currentRoom;
            });
        }, 600);
    };

    const testRollDice = (val: number) => {
        if (!isMyTurn || gameState.isRolling) return;
        
        setRemoteRoom((currentRoom: any) => {
            if (!currentRoom) return currentRoom;
            const nextState = performRoll(mappedGameState(currentRoom), val);

            if (nextState._pendingTurn) {
                const finalTurnColor = nextState._pendingTurn;
                delete nextState._pendingTurn;
                syncState(nextState);

                setTimeout(() => {
                    syncState({
                        diceValue: null,
                        turnIndex: currentRoom.players.findIndex((p: any) => p.color === finalTurnColor)
                    });
                }, 1000);
            } else {
                syncState(nextState);
            }
            return currentRoom;
        });
    };

    const movePiece = (pieceId: string) => {
        if (!isMyTurn || gameState.diceValue === null || gameState.isAnimating) return;

        const piece = gameState.pieces.find(p => p.id === pieceId);
        if (!piece) return;

        const path = getMovePath(piece.position, gameState.currentTurn, gameState.diceValue);
        if (path.length === 0) return;

        const finalState = performMove(gameState, pieceId);

        // Start animation sequence
        let currentStep = 0;
        let animationTimer: any;

        const animate = () => {
            if (currentStep >= path.length) {
                // Finalize move using the PRE-CALCULATED finalState
                const nextTurnIndex = remoteRoom.players.findIndex((p: any) => p.color === finalState.currentTurn);

                syncState({
                    pieces: finalState.pieces,
                    diceValue: null,
                    winners: finalState.winners,
                    turnIndex: nextTurnIndex,
                    isAnimating: false
                });
                return;
            }

            const nextPos = path[currentStep];
            // Only broadcast the moving piece's position change for animation
            syncState({
                isAnimating: true,
                pieces: gameState.pieces.map((p: any) => p.id === pieceId ? { ...p, position: nextPos } : p)
            });

            currentStep++;
            animationTimer = setTimeout(animate, 250);
        };

        animate();
        return () => clearTimeout(animationTimer);
    };

    const startGame = () => {
        if (!socket || !isHost || !remoteRoom) return;

        const initialPieces = createInitialPieces(remoteRoom.players.length);
        console.log("Host initializing game with", initialPieces.length, "pieces");
        syncState({
            status: 'playing',
            pieces: initialPieces,
            pityCounters: { red: 0, green: 0, yellow: 0, blue: 0 },
            diceValue: null,
            isRolling: false,
            winners: [],
            turnIndex: 0
        });
    };

    // Bot Logic (Run by host)
    useEffect(() => {
        if (!isHost || !remoteRoom || remoteRoom.status !== 'playing' || remoteRoom.isGameOver || remoteRoom.isAnimating) return;

        const currentPlayer = remoteRoom.players[remoteRoom.turnIndex];
        if (!currentPlayer || !currentPlayer.isBot) return;

        const timer = setTimeout(() => {
            if (remoteRoom.diceValue === null && !remoteRoom.isRolling) {
                const nextState = performRoll(gameState);

                if (nextState._pendingTurn) {
                    const finalTurnColor = nextState._pendingTurn;
                    delete nextState._pendingTurn;
                    syncState(nextState);
                    setTimeout(() => {
                        syncState({
                            diceValue: null,
                            turnIndex: remoteRoom.players.findIndex((p: any) => p.color === finalTurnColor)
                        });
                    }, 1000);
                } else {
                    syncState(nextState);
                }
            } else if (remoteRoom.diceValue !== null && !remoteRoom.isRolling) {
                const playerPieces = gameState.pieces.filter(p => p.color === gameState.currentTurn);
                const movablePieces = playerPieces.filter(p => {
                    if (p.position === -1) return gameState.diceValue === 6;
                    if (p.position >= 56) return p.position + gameState.diceValue! <= 61;
                    return true;
                });

                if (movablePieces.length > 0) {
                    const pieceToMove = movablePieces.find(p => p.position === -1) || movablePieces.sort((a, b) => b.position - a.position)[0];
                    const nextState = performMove(gameState, pieceToMove.id);
                    const nextTurnIndex = remoteRoom.players.findIndex((p: any) => p.color === nextState.currentTurn);

                    syncState({
                        pieces: nextState.pieces,
                        diceValue: null,
                        winners: nextState.winners,
                        turnIndex: nextTurnIndex
                    });
                }
            }
        }, 1500);

        return () => clearTimeout(timer);
    }, [isHost, remoteRoom?.turnIndex, remoteRoom?.diceValue, remoteRoom?.isRolling, gameState, syncState]);

    // Auto-move for local player
    useEffect(() => {
        if (!isMyTurn || !remoteRoom || remoteRoom.diceValue === null || remoteRoom.isRolling || remoteRoom.isAnimating) return;

        const playerPieces = gameState.pieces.filter(p => p.color === gameState.currentTurn);
        const movablePieces = playerPieces.filter(p => {
            if (p.position === -1) return gameState.diceValue === 6;
            if (p.position >= 56) return p.position + gameState.diceValue! <= 61;
            return true;
        });

        if (movablePieces.length === 1) {
            const timer = setTimeout(() => {
                movePiece(movablePieces[0].id);
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [isMyTurn, remoteRoom?.diceValue, remoteRoom?.isRolling, gameState, movePiece]);

    if (isValidating) {
        return <div className="flex items-center justify-center min-h-screen font-black uppercase italic text-3xl animate-pulse">Validating Arena...</div>;
    }

    if (!remoteRoom) {
        return <div className="flex items-center justify-center min-h-screen font-black uppercase italic text-3xl">Connecting...</div>;
    }

    if (remoteRoom.status === 'waiting') {
        return (
            <Lobby
                roomId={roomId}
                players={remoteRoom.players}
                isHost={isHost}
                onStartGame={startGame}
            />
        );
    }

    return (
        <Board
            gameState={gameState}
            rollDice={rollDice}
            movePiece={movePiece}
            startGame={startGame}
            testRollDice={testRollDice}
            canInteract={isMyTurn}
            serverOffset={serverOffset}
        />
    );
};
