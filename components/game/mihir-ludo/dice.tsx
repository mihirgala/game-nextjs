'use client';

import React from 'react';
import { PlayerColor } from './types';
import { cn } from '@/lib/utils';

interface DiceProps {
  value: number;
  isRolling: boolean;
  onRoll: () => void;
  disabled: boolean;
  color: PlayerColor;
}

export const Dice = ({ value, isRolling, color }: DiceProps) => {
  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        "w-10 h-10 border border-black flex items-center justify-center font-bold text-lg bg-white",
        isRolling && "animate-pulse"
      )}>
        {isRolling ? '?' : value}
      </div>
      <div className="text-sm">Value</div>
    </div>
  );
};
