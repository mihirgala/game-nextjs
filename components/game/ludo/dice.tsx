'use client';

import React, { useEffect, useState } from 'react';
import { PlayerColor } from './types';
import { cn } from '@/lib/utils';
import { motion, useAnimation } from 'framer-motion';

interface DiceProps {
  value: number | null;
  isRolling: boolean;
  color: PlayerColor;
  onClick?: () => void;
  disabled?: boolean;
}

const DOTS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const FACE_ROTATIONS: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: -90 },
  3: { x: 0, y: -180 },
  4: { x: 0, y: 90 },
  5: { x: -90, y: 0 },
  6: { x: 90, y: 0 },
};

export const Dice = ({ value, isRolling, color, onClick, disabled }: DiceProps) => {
  const controls = useAnimation();
  const [displayValue, setDisplayValue] = useState(value || 1);

  useEffect(() => {
    // Set initial rotation based on initial value (usually 1)
    if (value && !isRolling) {
      const rotation = FACE_ROTATIONS[value];
      controls.set({ rotateX: rotation.x, rotateY: rotation.y });
    } else if (!value && !isRolling) {
      const rotation = FACE_ROTATIONS[displayValue];
      controls.set({ rotateX: rotation.x, rotateY: rotation.y });
    }
  }, []); // Only on mount

  useEffect(() => {
    if (isRolling) {
      controls.start({
        rotateX: [null, 360, 720, 1080],
        rotateY: [null, 360, 720, 1080],
        transition: { duration: 0.6, ease: "linear", repeat: Infinity }
      });
    } else if (value) {
      setDisplayValue(value);
      const rotation = FACE_ROTATIONS[value];
      controls.start({
        rotateX: rotation.x + (Math.floor(Math.random() * 3) * 360),
        rotateY: rotation.y + (Math.floor(Math.random() * 3) * 360),
        transition: { duration: 0.4, type: "spring", stiffness: 200, damping: 20 }
      });
    }
  }, [isRolling, value, controls]);

  const DiceFace = ({ faceValue }: { faceValue: number }) => (
    <div 
      className={cn(
        "absolute inset-0 w-full h-full bg-white border-2 border-black/20 rounded-xl grid grid-cols-3 grid-rows-3 p-2 shadow-inner",
        faceValue === 1 && "z-[6]",
        faceValue === 2 && "z-[5]",
        faceValue === 3 && "z-[4]",
        faceValue === 4 && "z-[3]",
        faceValue === 5 && "z-[2]",
        faceValue === 6 && "z-[1]",
      )}
      style={{
        transform: getFaceTransform(faceValue),
        backfaceVisibility: 'hidden',
      }}
    >
      {[...Array(9)].map((_, i) => (
        <div key={i} className="flex items-center justify-center">
          {DOTS[faceValue].includes(i) && (
            <div className={cn("w-2 h-2 rounded-full shadow-sm", getDotColor(color))} />
          )}
        </div>
      ))}
    </div>
  );

  const getFaceTransform = (val: number) => {
    switch (val) {
      case 1: return 'translateZ(25px)';
      case 2: return 'rotateY(90deg) translateZ(25px)';
      case 3: return 'rotateY(180deg) translateZ(25px)';
      case 4: return 'rotateY(-90deg) translateZ(25px)';
      case 5: return 'rotateX(90deg) translateZ(25px)';
      case 6: return 'rotateX(-90deg) translateZ(25px)';
      default: return '';
    }
  };

  const getDotColor = (c: PlayerColor) => {
    switch (c) {
      case 'red': return 'bg-red-600';
      case 'green': return 'bg-green-600';
      case 'yellow': return 'bg-yellow-500';
      case 'blue': return 'bg-blue-600';
      default: return 'bg-gray-800';
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button 
        onClick={onClick}
        disabled={disabled || isRolling}
        className={cn(
          "relative w-[60px] h-[60px] transition-all duration-300",
          !disabled && !isRolling && "hover:scale-110 active:scale-95 cursor-pointer",
          disabled && "opacity-40 grayscale-[0.5] cursor-not-allowed",
          isRolling && "scale-105"
        )}
        style={{ perspective: '600px' }}
      >
        <motion.div
          animate={controls}
          className="w-full h-full relative"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <DiceFace faceValue={1} />
          <DiceFace faceValue={2} />
          <DiceFace faceValue={3} />
          <DiceFace faceValue={4} />
          <DiceFace faceValue={5} />
          <DiceFace faceValue={6} />
        </motion.div>
        
        {/* Click Glow Effect */}
        {!disabled && !isRolling && (
          <div className="absolute inset-0 bg-white/20 rounded-xl blur-xl animate-pulse -z-10" />
        )}
      </button>
      
      <div className={cn(
        "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border-2 bg-background/50 backdrop-blur-sm",
        color === 'red' && "border-red-500/30 text-red-600",
        color === 'green' && "border-green-500/30 text-green-600",
        color === 'yellow' && "border-yellow-500/30 text-yellow-700",
        color === 'blue' && "border-blue-500/30 text-blue-600",
        isRolling && "animate-pulse"
      )}>
        {isRolling ? 'ROLLING' : value ? `Result: ${value}` : 'TAP DICE'}
      </div>
    </div>
  );
};
