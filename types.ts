
export type Color = 'white' | 'black';

export enum PieceType {
  PAWN = 'pawn',
  ROOK = 'rook',
  KNIGHT = 'knight',
  BISHOP = 'bishop',
  QUEEN = 'queen',
  KING = 'king'
}

export interface Position {
  row: number;
  col: number;
}

export interface Piece {
  id: string;
  type: PieceType;
  color: Color;
  hasMoved: boolean;
}

export type Board = (Piece | null)[][];

export interface Move {
  from: Position;
  to: Position;
  piece: Piece;
  captured?: Piece;
  isCastling?: boolean;
  isEnPassant?: boolean;
  isPromotion?: boolean;
  promotedTo?: PieceType;
  notation: string;
}

export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  CHECKMATE = 'CHECKMATE',
  STALEMATE = 'STALEMATE',
  DRAW = 'DRAW'
}

export interface GameState {
  board: Board;
  currentPlayer: Color;
  history: Move[];
  status: GameStatus;
  winner: Color | 'draw' | null;
  selectedSquare: Position | null;
  lastMove: Move | null;
  capturedWhite: Piece[];
  capturedBlack: Piece[];
  isFlipped: boolean;
  timers: {
    white: number;
    black: number;
  };
}
