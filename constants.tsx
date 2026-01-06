
import React from 'react';
import { PieceType, Color, Board, Piece } from './types';

export const INITIAL_BOARD_LAYOUT: (PieceType | null)[][] = [
  [PieceType.ROOK, PieceType.KNIGHT, PieceType.BISHOP, PieceType.QUEEN, PieceType.KING, PieceType.BISHOP, PieceType.KNIGHT, PieceType.ROOK],
  [PieceType.PAWN, PieceType.PAWN, PieceType.PAWN, PieceType.PAWN, PieceType.PAWN, PieceType.PAWN, PieceType.PAWN, PieceType.PAWN],
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  [PieceType.PAWN, PieceType.PAWN, PieceType.PAWN, PieceType.PAWN, PieceType.PAWN, PieceType.PAWN, PieceType.PAWN, PieceType.PAWN],
  [PieceType.ROOK, PieceType.KNIGHT, PieceType.BISHOP, PieceType.QUEEN, PieceType.KING, PieceType.BISHOP, PieceType.KNIGHT, PieceType.ROOK],
];

export const PIECES = {
  white: {
    king: '♔',
    queen: '♕',
    rook: '♖',
    bishop: '♗',
    knight: '♘',
    pawn: '♙'
  },
  black: {
    king: '♚',
    queen: '♛',
    rook: '♜',
    bishop: '♝',
    knight: '♞',
    pawn: '♟'
  }
};

export const createInitialBoard = (): Board => {
  return INITIAL_BOARD_LAYOUT.map((row, rIdx) => 
    row.map((type, cIdx) => {
      if (!type) return null;
      const color: Color = rIdx < 2 ? 'black' : 'white';
      return {
        id: `${type}-${color}-${rIdx}-${cIdx}`,
        type,
        color,
        hasMoved: false
      };
    })
  );
};

export const PieceIcon: React.FC<{ type: PieceType; color: Color; className?: string }> = ({ type, color, className }) => {
  const symbol = PIECES[color][type];
  
  return (
    <span className={`select-none flex items-center justify-center leading-none ${className}`} style={{ fontSize: 'inherit' }}>
      {symbol}
    </span>
  );
};
