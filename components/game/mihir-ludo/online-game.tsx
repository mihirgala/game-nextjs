'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAtom } from 'jotai';
import { socketAtom } from '@/lib/atoms';
import { authClient } from '@/lib/auth-client';
import { Lobby } from './lobby';
import { Board } from './board';
import { toast } from 'sonner';
import { GameState, PlayerColor } from './types';

interface OnlineGameProps {
    roomId: string;
}

export const LudoOnline = ({ roomId }: OnlineGameProps) => {
    const [socket] = useAtom(socketAtom);
    const { data: session } = authClient.useSession();
    const user = session?.user;

    const [remoteRoom, setRemoteRoom] = useState<any>(null);
    const [isValidating, setIsValidating] = useState(true);

    useEffect(() => {
        if (!socket || !roomId || !user) return;

        setIsValidating(true);

        socket.emit("room:validate", { roomId, allowCreate: true }, (res: any) => {
            setIsValidating(false);
            if (!res.valid) {
                toast.error(res.error || "Room is invalid.");
                return;
            }

            socket.emit("game:join", { 
                roomId, 
                game: "ludo", 
                userImage: user.image 
            });
        });

        const handleState = (state: any) => {
            setRemoteRoom(state);
        };

        socket.on("game:state", handleState);

        return () => {
            socket.off("game:state", handleState);
        };
    }, [socket, roomId, user?.id]);

    if (isValidating) {
        return <div className="flex items-center justify-center min-h-screen font-black uppercase italic">Validating Arena...</div>;
    }

    if (!remoteRoom) {
        return <div className="flex items-center justify-center min-h-screen font-black uppercase italic">Connecting...</div>;
    }

    // Map backend state to frontend Board expectations
    const isHost = remoteRoom.players[0].userId === user?.id;
    const status = remoteRoom.status || 'waiting';

    const rollDice = () => {
        if (!socket) return;
        socket.emit("game:ludo:roll", { roomId });
    };

    const movePiece = (pieceId: string) => {
        if (!socket) return;
        // pieceId in frontend is "color-index", backend expects numeric index (0-3)
        const index = parseInt(pieceId.split('-')[1]);
        socket.emit("game:ludo:move", { roomId, pieceId: index });
    };

    const startGame = () => {
        if (!socket || !isHost) return;
        socket.emit("game:start", { roomId });
    };

    if (status === 'waiting') {
        return (
            <Lobby 
                roomId={roomId}
                players={remoteRoom.players}
                isHost={isHost}
                onStartGame={startGame}
            />
        );
    }

    // Adapt remoteRoom to GameState
    // Backend players have pieces. We need a flattened array of pieces.
    const allPieces: any[] = [];
    remoteRoom.players.forEach((p: any) => {
        p.pieces?.forEach((pc: any) => {
            allPieces.push({
                id: `${p.color}-${pc.id}`,
                color: p.color,
                position: pc.position,
            });
        });
    });

    const currentTurn = remoteRoom.players[remoteRoom.turnIndex].color;

    const mappedGameState: GameState = {
        pieces: allPieces,
        currentTurn: currentTurn as PlayerColor,
        diceValue: remoteRoom.diceValue,
        isRolling: false, // The backend doesn't show rolling state in real-time easily, but we can set it to false when we get state
        winners: remoteRoom.winnerId ? [remoteRoom.players.find((p: any) => p.userId === remoteRoom.winnerId)?.color as PlayerColor] : [],
        playerCount: remoteRoom.players.length,
        gameStarted: true,
        status: remoteRoom.status
    };

    const myColor = remoteRoom.players.find((p: any) => p.userId === user?.id)?.color;

    return (
        <Board 
            gameState={mappedGameState}
            rollDice={rollDice}
            movePiece={movePiece}
            startGame={() => {}} // Not used in online mode board
            canInteract={currentTurn === myColor}
        />
    );
};
