"use client";

import { useState } from "react";
import { TicTacToeBoard } from "./board";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Trophy, ArrowLeft, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function LocalTicTacToe() {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [winner, setWinner] = useState<string | null>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);

  const checkWinner = (squares: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
      [0, 4, 8], [2, 4, 6],           // diags
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line: lines[i] };
      }
    }
    if (squares.every(s => s !== null)) return { winner: 'draw', line: null };
    return null;
  };

  const handleClick = (i: number) => {
    if (board[i] || winner) return;
    
    const newBoard = [...board];
    newBoard[i] = isXNext ? "X" : "O";
    setBoard(newBoard);
    
    const result = checkWinner(newBoard);
    if (result) {
      setWinner(result.winner);
      setWinningLine(result.line);
    } else {
      setIsXNext(!isXNext);
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setWinner(null);
    setWinningLine(null);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-8 animate-in fade-in duration-500 min-h-[60vh] p-4">
      <div className="flex flex-col gap-6 w-full max-w-md">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
             <h2 className="text-3xl font-black tracking-tight">LOCAL DUEL</h2>
             <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Two players, one machine</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => window.location.href = '/game/tictactoe'} className="gap-2 font-bold uppercase text-[10px]">
            <ArrowLeft className="w-3 h-3" /> Menu
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <Card className={cn("transition-all border-2", isXNext && !winner ? "border-primary ring-4 ring-primary/10" : "opacity-40")}>
                <CardContent className="p-4 flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                        <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] font-black uppercase opacity-50">Player 1</p>
                        <p className="font-bold">Team X</p>
                    </div>
                </CardContent>
            </Card>
            <Card className={cn("transition-all border-2", !isXNext && !winner ? "border-emerald-500 ring-4 ring-emerald-500/10" : "opacity-40")}>
                <CardContent className="p-4 flex items-center gap-3">
                    <div className="bg-emerald-500/10 p-2 rounded-lg">
                        <User className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] font-black uppercase opacity-50">Player 2</p>
                        <p className="font-bold">Team O</p>
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="relative group">
            <TicTacToeBoard 
                board={board} 
                onMove={handleClick} 
                winningLine={winningLine}
                disabled={!!winner} 
            />

            {winner && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center rounded-2xl animate-in zoom-in-95 duration-300">
                    <Card className="border-2 border-primary shadow-2xl p-6 text-center">
                        <Trophy className={cn("w-12 h-12 mx-auto mb-4", winner === 'draw' ? "text-muted-foreground" : "text-yellow-500")} />
                        <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">
                            {winner === 'draw' ? "IT'S A DRAW!" : `TEAM ${winner} WINS!`}
                        </h3>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6">
                            {winner === 'draw' ? "Perfect symmetry." : "Complete domination."}
                        </p>
                        <Button onClick={resetGame} className="w-full gap-2 font-bold shadow-lg shadow-primary/20">
                            <RefreshCw className="w-4 h-4" /> PLAY AGAIN
                        </Button>
                    </Card>
                </div>
            )}
        </div>

        {!winner && (
             <Button variant="ghost" onClick={resetGame} className="text-[10px] font-black uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity">
                Reset Match
             </Button>
        )}
      </div>
    </div>
  );
}
