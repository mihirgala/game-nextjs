"use client";

import { motion } from "framer-motion";
import { Circle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TicTacToeBoardProps {
  board: (string | null)[];
  onMove: (index: number) => void;
  disabled?: boolean;
  winningLine?: number[] | null;
}

export function TicTacToeBoard({ board, onMove, disabled, winningLine }: TicTacToeBoardProps) {
  return (
    <div className="grid grid-cols-3 gap-3 w-full max-w-[400px] aspect-square mx-auto p-4 bg-muted/30 rounded-2xl border-2 border-primary/10">
      {board.map((cell, i) => {
        const isWinningCell = winningLine?.includes(i);
        return (
          <Button
            key={i}
            variant="outline"
            disabled={disabled || !!cell}
            onClick={() => onMove(i)}
            className={`h-full w-full p-0 text-5xl rounded-xl transition-all duration-300 relative overflow-hidden group
              ${cell ? "cursor-default" : "hover:bg-primary/5 active:scale-95"}
              ${isWinningCell ? "bg-primary/20 border-primary shadow-[0_0_20px_rgba(var(--primary),0.3)] z-10" : "bg-card"}
            `}
          >
            {cell === "X" && (
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                className="text-primary"
              >
                <X className="w-16 h-16 stroke-[3px]" />
              </motion.div>
            )}
            {cell === "O" && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-emerald-500"
              >
                <Circle className="w-14 h-14 stroke-[3px]" />
              </motion.div>
            )}
            
            {/* Hover indicator */}
            {!cell && !disabled && (
              <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors" />
            )}
          </Button>
        );
      })}
    </div>
  );
}
