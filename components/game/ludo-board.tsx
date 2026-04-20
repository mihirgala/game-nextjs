"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LudoPiece {
  id: number;
  position: number;
  isHome: boolean;
}

interface LudoPlayer {
  userId: string;
  name: string;
  color: string;
  pieces: LudoPiece[];
  isBot: boolean;
}

interface LudoBoardProps {
  players: LudoPlayer[];
  turnIndex: number;
  onPieceClick: (pieceId: number) => void;
  disabled: boolean;
  diceValue: number | null;
}

// ─── Constants & Calculations ────────────────────────────────────────────────

const CELL_SIZE = 40;
const BOARD_SIZE = CELL_SIZE * 15;

const COLORS: Record<string, string> = {
  red: "#ef4444",
  green: "#22c55e",
  yellow: "#eab308",
  blue: "#3b82f6",
};

// Helper: Get [x, y] in grid units (0-14) for a piece's total position (0-57)
// This is a simplified Ludo path mapping.
function getCoordinates(playerIndex: number, position: number): [number, number] {
  if (position === -1) {
    // Base positions
    const offsets = [[1.5, 1.5], [1.5, 3.5], [3.5, 1.5], [3.5, 3.5]];
    const baseOrigin = [
      [0, 0], [9, 0], [9, 9], [0, 9] // Red, Green, Yellow, Blue bases
    ][playerIndex];
    return [baseOrigin[0] + offsets[position + 1 === 0 ? 0 : 0][0], baseOrigin[1] + offsets[0][1]]; // Just a fallback
  }

  // Real Ludo path mapping is complex. We'll use a simplified set of path arrays.
  const path = LUDO_PATHS[playerIndex];
  if (!path || position >= path.length) return [7, 7]; // Center/Home
  return path[position];
}

// Pre-defined paths for each color (Grid Coords 0-14)
// Total 52 outer steps + 6 home stretch steps
const OUTER_PATH: [number, number][] = [
  [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], // Top Left Path
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0], // Top Up
  [7, 0], [8, 0],                                 // Top Bridge
  [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],         // Top Down
  [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6], // Middle Right
  [14, 7], [14, 8],                               // Right Bridge
  [13, 8], [12, 8], [11, 8], [10, 8], [9, 8], [8, 8], // Bottom Right Path
  [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14], // Bottom Down
  [7, 14], [6, 14],                               // Bottom Bridge
  [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],     // Bottom Up
  [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8], // Middle Left
  [0, 7]                                          // Left Bridge
];

const LUDO_PATHS: [number, number][][] = [
  // Red (Starts at [0, 6])
  [...generatePath(0), [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  // Green (Starts at [8, 0])
  [...generatePath(13), [7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  // Yellow (Starts at [14, 8])
  [...generatePath(26), [13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
  // Blue (Starts at [6, 14])
  [...generatePath(39), [7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
];

function generatePath(startIndex: number): [number, number][] {
  const p: [number, number][] = [];
  for (let i = 0; i < 51; i++) {
    p.push(OUTER_PATH[(startIndex + i) % 52]);
  }
  return p;
}

export function LudoBoard({ players, turnIndex, onPieceClick, disabled, diceValue }: LudoBoardProps) {
  // Base rendering helpers ...
  const renderBase = (color: string, x: number, y: number) => (
    <g transform={`translate(${x * CELL_SIZE}, ${y * CELL_SIZE})`}>
      <rect width={CELL_SIZE * 6} height={CELL_SIZE * 6} fill={COLORS[color]} opacity="0.2" rx="8" />
      <rect x={CELL_SIZE} y={CELL_SIZE} width={CELL_SIZE * 4} height={CELL_SIZE * 4} fill="white" rx="4" />
      {/* 4 Slots for pieces */}
      {[0, 1, 2, 3].map(i => (
         <circle 
           key={i} 
           cx={CELL_SIZE * (i < 2 ? 2 : 4)} 
           cy={CELL_SIZE * (i % 2 === 0 ? 2 : 4)} 
           r={CELL_SIZE * 0.6} 
           fill={COLORS[color]} 
           opacity="0.1" 
         />
      ))}
    </g>
  );

  return (
    <div className="relative aspect-square w-full max-w-[600px] bg-background rounded-2xl shadow-2xl border-8 border-muted overflow-hidden">
      <svg viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`} className="w-full h-full p-2">
        {/* Draw Pattern / Grid */}
        <defs>
           <pattern id="grid" width={CELL_SIZE} height={CELL_SIZE} patternUnits="userSpaceOnUse">
             <rect width={CELL_SIZE} height={CELL_SIZE} fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
           </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Home Area Triangles */}
        <polygon points={`${6 * CELL_SIZE},${6 * CELL_SIZE} ${15/2 * CELL_SIZE},${15/2 * CELL_SIZE} ${6 * CELL_SIZE},${9 * CELL_SIZE}`} fill={COLORS.red} opacity="0.3" />
        <polygon points={`${6 * CELL_SIZE},${6 * CELL_SIZE} ${15/2 * CELL_SIZE},${15/2 * CELL_SIZE} ${9 * CELL_SIZE},${6 * CELL_SIZE}`} fill={COLORS.green} opacity="0.3" />
        <polygon points={`${9 * CELL_SIZE},${6 * CELL_SIZE} ${15/2 * CELL_SIZE},${15/2 * CELL_SIZE} ${9 * CELL_SIZE},${9 * CELL_SIZE}`} fill={COLORS.yellow} opacity="0.3" />
        <polygon points={`${6 * CELL_SIZE},${9 * CELL_SIZE} ${15/2 * CELL_SIZE},${15/2 * CELL_SIZE} ${9 * CELL_SIZE},${9 * CELL_SIZE}`} fill={COLORS.blue} opacity="0.3" />

        {/* Bases */}
        {renderBase("red", 0, 0)}
        {renderBase("green", 9, 0)}
        {renderBase("yellow", 9, 9)}
        {renderBase("blue", 0, 9)}

        {/* Home Stretches */}
        {[0, 1, 2, 3, 4].map(i => (
           <React.Fragment key={i}>
             <rect x={(i + 1) * CELL_SIZE} y={7 * CELL_SIZE} width={CELL_SIZE - 2} height={CELL_SIZE - 2} fill={COLORS.red} opacity="0.2" rx="2" />
             <rect x={7 * CELL_SIZE} y={(i + 1) * CELL_SIZE} width={CELL_SIZE - 2} height={CELL_SIZE - 2} fill={COLORS.green} opacity="0.2" rx="2" />
             <rect x={(13 - i) * CELL_SIZE} y={7 * CELL_SIZE} width={CELL_SIZE - 2} height={CELL_SIZE - 2} fill={COLORS.yellow} opacity="0.2" rx="2" />
             <rect x={7 * CELL_SIZE} y={(13 - i) * CELL_SIZE} width={CELL_SIZE - 2} height={CELL_SIZE - 2} fill={COLORS.blue} opacity="0.2" rx="2" />
           </React.Fragment>
        ))}

        {/* Pieces */}
        <AnimatePresence>
          {players.map((player, pIdx) => (
            <React.Fragment key={player.userId}>
              {player.pieces.map((piece) => {
                const [gx, gy] = getExactCoordinates(pIdx, piece.position, piece.id);
                const isMyTurn = turnIndex === pIdx && !disabled;
                const canMove = isMyTurn && (
                   (piece.position === -1 && diceValue === 6) ||
                   (piece.position >= 0 && piece.position + (diceValue || 0) <= 57)
                );

                return (
                  <motion.g
                    key={`${player.userId}-${piece.id}`}
                    initial={false}
                    animate={{ x: gx * CELL_SIZE + CELL_SIZE / 2, y: gy * CELL_SIZE + CELL_SIZE / 2 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    style={{ cursor: canMove ? "pointer" : "default" }}
                    onClick={() => canMove && onPieceClick(piece.id)}
                  >
                    <motion.circle
                      r={CELL_SIZE * 0.4}
                      fill={COLORS[player.color]}
                      stroke="white"
                      strokeWidth="2"
                      whileHover={canMove ? { scale: 1.1, filter: "brightness(1.2)" } : {}}
                      whileTap={canMove ? { scale: 0.9 } : {}}
                      className="shadow-lg transition-colors"
                    />
                    {canMove && (
                       <circle r={CELL_SIZE * 0.5} fill="none" stroke={COLORS[player.color]} strokeWidth="1" opacity="0.5">
                         <animate attributeName="r" from={CELL_SIZE * 0.4} to={CELL_SIZE * 0.6} dur="1.5s" repeatCount="indefinite" />
                         <animate attributeName="opacity" from="0.5" to="0" dur="1.5s" repeatCount="indefinite" />
                       </circle>
                    )}
                  </motion.g>
                );
              })}
            </React.Fragment>
          ))}
        </AnimatePresence>
      </svg>
    </div>
  );
}

function getExactCoordinates(pIdx: number, pos: number, pieceId: number): [number, number] {
  if (pos === -1) {
    const baseOrigins = [[0, 0], [9, 0], [9, 9], [0, 9]];
    // Align with the circles in renderBase: (2, 2), (2, 4), (4, 2), (4, 4)
    // Centering: gx + 0.5 = circle_cx/CELL_SIZE => gx = cx/CELL_SIZE - 0.5
    const offsets = [
      [1.5, 1.5], // Top-Left piece -> (2, 2)
      [1.5, 3.5], // Bottom-Left piece -> (2, 4)
      [3.5, 1.5], // Top-Right piece -> (4, 2)
      [3.5, 3.5], // Bottom-Right piece -> (4, 4)
    ];
    // Use pieceId to distribute pieces across the 4 base slots
    const offset = offsets[pieceId % 4];
    return [baseOrigins[pIdx][0] + offset[0], baseOrigins[pIdx][1] + offset[1]];
  }
  return getCoordinates(pIdx, pos);
}
