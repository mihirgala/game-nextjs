'use client';

import React from 'react';
import { Board } from './board';
import { useLudoLogic } from './game-logic';
import { useSearchParams } from 'next/navigation';

export const LocalGame = () => {
    const searchParams = useSearchParams();
    const playerCount = parseInt(searchParams.get('players') || '4');
    const { gameState, rollDice, movePiece, startGame } = useLudoLogic();

    React.useEffect(() => {
        startGame(playerCount);
    }, [playerCount]);

    return (
        <Board
            gameState={gameState}
            rollDice={rollDice}
            movePiece={movePiece}
            startGame={startGame}
        />
    );
};
