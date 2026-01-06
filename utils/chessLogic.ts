
import { Board, Position, Color, PieceType, Move, Piece } from '../types';

export const getSquareId = (row: number, col: number) => `${row}-${col}`;

export const getAlgebraicNotation = (from: Position, to: Position, piece: Piece, captured: boolean, check: boolean, mate: boolean) => {
  const cols = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const rows = ['8', '7', '6', '5', '4', '3', '2', '1'];
  
  let notation = '';
  if (piece.type === PieceType.KING && Math.abs(from.col - to.col) === 2) {
    return to.col > from.col ? 'O-O' : 'O-O-O';
  }

  const pieceLetter = {
    [PieceType.PAWN]: '',
    [PieceType.KNIGHT]: 'N',
    [PieceType.BISHOP]: 'B',
    [PieceType.ROOK]: 'R',
    [PieceType.QUEEN]: 'Q',
    [PieceType.KING]: 'K',
  }[piece.type];

  notation += pieceLetter;
  if (captured) {
    if (piece.type === PieceType.PAWN) notation += cols[from.col];
    notation += 'x';
  }
  notation += cols[to.col] + rows[to.row];
  if (mate) notation += '#';
  else if (check) notation += '+';
  
  return notation;
};

export const isWithinBoard = (row: number, col: number) => row >= 0 && row < 8 && col >= 0 && col < 8;

export const findKing = (board: Board, color: Color): Position => {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === PieceType.KING && p.color === color) return { row: r, col: c };
    }
  }
  return { row: -1, col: -1 };
};

export const getPieceMoves = (board: Board, pos: Position, lastMove: Move | null, ignoreCheck = false): Position[] => {
  const piece = board[pos.row][pos.col];
  if (!piece) return [];
  const moves: Position[] = [];
  const { row, col } = pos;
  const dir = piece.color === 'white' ? -1 : 1;

  const addIfEmpty = (r: number, c: number) => {
    if (isWithinBoard(r, c) && !board[r][c]) {
      moves.push({ row: r, col: c });
      return true;
    }
    return false;
  };

  const addIfEnemy = (r: number, c: number) => {
    if (isWithinBoard(r, c)) {
      const target = board[r][c];
      if (target && target.color !== piece.color) {
        moves.push({ row: r, col: c });
        return true;
      }
    }
    return false;
  };

  switch (piece.type) {
    case PieceType.PAWN:
      // Forward
      if (addIfEmpty(row + dir, col)) {
        if (!piece.hasMoved) addIfEmpty(row + 2 * dir, col);
      }
      // Captures
      addIfEnemy(row + dir, col - 1);
      addIfEnemy(row + dir, col + 1);
      // En Passant
      if (lastMove && lastMove.piece.type === PieceType.PAWN && Math.abs(lastMove.from.row - lastMove.to.row) === 2 && lastMove.to.row === row && Math.abs(lastMove.to.col - col) === 1) {
        moves.push({ row: row + dir, col: lastMove.to.col });
      }
      break;

    case PieceType.KNIGHT:
      const kMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
      kMoves.forEach(([dr, dc]) => {
        const nr = row + dr, nc = col + dc;
        if (isWithinBoard(nr, nc)) {
          const target = board[nr][nc];
          if (!target || target.color !== piece.color) moves.push({ row: nr, col: nc });
        }
      });
      break;

    case PieceType.BISHOP:
    case PieceType.ROOK:
    case PieceType.QUEEN:
      const directions = piece.type === PieceType.BISHOP ? [[-1,-1],[-1,1],[1,-1],[1,1]] : 
                         piece.type === PieceType.ROOK ? [[-1,0],[1,0],[0,-1],[0,1]] :
                         [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]];
      directions.forEach(([dr, dc]) => {
        let nr = row + dr, nc = col + dc;
        while (isWithinBoard(nr, nc)) {
          const target = board[nr][nc];
          if (!target) {
            moves.push({ row: nr, col: nc });
          } else {
            if (target.color !== piece.color) moves.push({ row: nr, col: nc });
            break;
          }
          nr += dr; nc += dc;
        }
      });
      break;

    case PieceType.KING:
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = row + dr, nc = col + dc;
          if (isWithinBoard(nr, nc)) {
            const target = board[nr][nc];
            if (!target || target.color !== piece.color) moves.push({ row: nr, col: nc });
          }
        }
      }
      // Castling
      if (!piece.hasMoved && !ignoreCheck) {
        // Kingside
        const rookK = board[row][7];
        if (rookK && rookK.type === PieceType.ROOK && !rookK.hasMoved && !board[row][5] && !board[row][6]) {
          moves.push({ row, col: 6 });
        }
        // Queenside
        const rookQ = board[row][0];
        if (rookQ && rookQ.type === PieceType.ROOK && !rookQ.hasMoved && !board[row][1] && !board[row][2] && !board[row][3]) {
          moves.push({ row, col: 2 });
        }
      }
      break;
  }
  return moves;
};

export const isSquareAttacked = (board: Board, pos: Position, attackerColor: Color): boolean => {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === attackerColor) {
        const moves = getPieceMoves(board, { row: r, col: c }, null, true);
        if (moves.some(m => m.row === pos.row && m.col === pos.col)) return true;
      }
    }
  }
  return false;
};

export const isKingInCheck = (board: Board, color: Color): boolean => {
  const kingPos = findKing(board, color);
  if (kingPos.row === -1) return false;
  return isSquareAttacked(board, kingPos, color === 'white' ? 'black' : 'white');
};

export const getLegalMoves = (board: Board, pos: Position, lastMove: Move | null): Position[] => {
  const piece = board[pos.row][pos.col];
  if (!piece) return [];
  const rawMoves = getPieceMoves(board, pos, lastMove);
  
  return rawMoves.filter(m => {
    // Basic check prevention
    const simulatedBoard = board.map(r => [...r]);
    const target = simulatedBoard[m.row][m.col];
    simulatedBoard[m.row][m.col] = { ...piece, hasMoved: true };
    simulatedBoard[pos.row][pos.col] = null;
    
    // Handle en passant capture in simulation
    if (piece.type === PieceType.PAWN && m.col !== pos.col && !target) {
      const dir = piece.color === 'white' ? 1 : -1;
      simulatedBoard[m.row + dir][m.col] = null;
    }

    if (isKingInCheck(simulatedBoard, piece.color)) return false;

    // Special King rules: can't castle through check
    if (piece.type === PieceType.KING && Math.abs(m.col - pos.col) === 2) {
      if (isKingInCheck(board, piece.color)) return false;
      const stepCol = m.col > pos.col ? pos.col + 1 : pos.col - 1;
      const stepBoard = board.map(r => [...r]);
      stepBoard[pos.row][stepCol] = { ...piece };
      stepBoard[pos.row][pos.col] = null;
      if (isKingInCheck(stepBoard, piece.color)) return false;
    }

    return true;
  });
};

export const getAllLegalMoves = (board: Board, color: Color, lastMove: Move | null): Move[] => {
  const allMoves: Move[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === color) {
        const legalPos = getLegalMoves(board, { row: r, col: c }, lastMove);
        legalPos.forEach(to => {
          allMoves.push({
            from: { row: r, col: c },
            to,
            piece: p,
            notation: '' // Notation generated later
          });
        });
      }
    }
  }
  return allMoves;
};
