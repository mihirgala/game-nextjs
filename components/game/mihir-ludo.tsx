"use client"

import React from 'react'

interface piece {
    id: number,
    position: [number, number],
}

interface player {
    colour: "red" | "blue" | "green" | "yellow",
    pieces: piece[]
    isBot: boolean
}

interface gameState {
    players: player[]
    turnIndex: number
    diceValue: number
    waitingForRoll: boolean
    isGameOver: boolean
    winnerId: string | null
    rematchVotes: string[]
    isBotMatch: boolean
    difficulty?: string
}

export const MihirLudo = () => {

    const home = {
        red: {
            1: [1, 1],
            2: [1, 3],
            3: [3, 1],
            4: [3, 3],
        },
        blue: {
            1: [1, 10],
            2: [1, 12],
            3: [3, 10],
            4: [3, 12],
        },
        green: {
            1: [10, 1],
            2: [12, 1],
            3: [10, 3],
            4: [12, 3],
        },
        yellow: {
            1: [10, 10],
            2: [12, 10],
            3: [10, 12],
            4: [12, 12],
        }
    }

    const homeLookup: Record<string, string> = {}

    Object.entries(home).forEach(([colour, pieces]) => {
        Object.values(pieces).forEach(([row, col]) => {
            homeLookup[`${row}-${col}`] = colour
        })
    })

    const getColor = (row: number, col: number) => {
        const colour = homeLookup[`${row}-${col}`]

        switch (colour) {
            case "red":
                return "#ef4444"
            case "blue":
                return "#3b82f6"
            case "green":
                return "#22c55e"
            case "yellow":
                return "#eab308"
            default:
                return "#fef3c7"
        }
    }

    const [gameState, setGameState] = React.useState<gameState>({
        players: [
            {
                colour: "red",
                pieces: [
                    { id: 1, position: home.red[1] as [number, number] },
                    { id: 2, position: home.red[2] as [number, number] },
                    { id: 3, position: home.red[3] as [number, number] },
                    { id: 4, position: home.red[4] as [number, number] },
                ],
                isBot: false,
            },
            {
                colour: "blue",
                pieces: [
                    { id: 1, position: home.blue[1] as [number, number] },
                    { id: 2, position: home.blue[2] as [number, number] },
                    { id: 3, position: home.blue[3] as [number, number] },
                    { id: 4, position: home.blue[4] as [number, number] },
                ],
                isBot: false,
            },
            {
                colour: "green",
                pieces: [
                    { id: 1, position: home.green[1] as [number, number] },
                    { id: 2, position: home.green[2] as [number, number] },
                    { id: 3, position: home.green[3] as [number, number] },
                    { id: 4, position: home.green[4] as [number, number] },
                ],
                isBot: false,
            },
            {
                colour: "yellow",
                pieces: [
                    { id: 1, position: home.yellow[1] as [number, number] },
                    { id: 2, position: home.yellow[2] as [number, number] },
                    { id: 3, position: home.yellow[3] as [number, number] },
                    { id: 4, position: home.yellow[4] as [number, number] },
                ],
                isBot: false,
            },
        ],
        turnIndex: 0,
        diceValue: 0,
        waitingForRoll: true,
        isGameOver: false,
        winnerId: null,
        rematchVotes: [],
        isBotMatch: false,
        difficulty: "easy",
    })

    return (
        <div className='flex h-screen justify-center gap-1 items-center flex-col'>
            {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="grid grid-cols-14 gap-1">
                    {Array.from({ length: 14 }).map((_, j) => (
                        <div
                            key={j}
                            className='w-8 h-8 border border-gray-300'
                            style={{
                                backgroundColor: getColor(i, j)
                            }}
                        />
                    ))}
                </div>
            ))}
        </div>
    )
}