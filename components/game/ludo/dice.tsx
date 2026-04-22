'use client';

import React, { useEffect, useState } from 'react';
import { PlayerColor } from './types';
import { cn } from '@/lib/utils';
import { motion, useAnimation } from 'framer-motion';

interface DiceProps {
  value: number | null;
  isRolling: boolean;
  color: PlayerColor;
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

export const Dice = ({ value, isRolling, color }: DiceProps) => {
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
    <div className="flex flex-col items-center gap-3">
      <div 
        className="relative w-[50px] h-[50px]"
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
      </div>
      
      <div className={cn(
        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border-2",
        color === 'red' && "border-red-500 text-red-500",
        color === 'green' && "border-green-500 text-green-500",
        color === 'yellow' && "border-yellow-500 text-yellow-600",
        color === 'blue' && "border-blue-500 text-blue-500",
        isRolling && "animate-pulse"
      )}>
        {isRolling ? 'Rolling...' : `Result: ${value || '-'}`}
      </div>
    </div>
  );
};
