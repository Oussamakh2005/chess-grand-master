
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GameStatus, GameState, Color, Position, Move, PieceType, Piece } from './types';
import { createInitialBoard, PieceIcon } from './constants';
import * as ChessLogic from './utils/chessLogic';

// --- Components ---

const Button: React.FC<{ onClick: () => void; children: React.ReactNode; variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; className?: string }> = ({ onClick, children, variant = 'primary', className = '' }) => {
  const base = "px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95";
  const variants = {
    primary: "bg-[#8b5e3c] hover:bg-[#a67c52] text-white shadow-lg shadow-black/20",
    secondary: "bg-[#3e2723] hover:bg-[#4e342e] text-[#efebe9]",
    danger: "bg-rose-600 hover:bg-rose-500 text-white",
    ghost: "bg-transparent hover:bg-white/5 text-slate-300"
  };
  return (
    <button onClick={onClick} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const PromotionDialog: React.FC<{ color: Color; onSelect: (type: PieceType) => void }> = ({ color, onSelect }) => (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-[#2d1b0d] p-8 rounded-2xl border border-[#4e342e] shadow-2xl max-w-sm w-full animate-in zoom-in-95">
      <h3 className="text-2xl brand-font text-center text-[#d7ccc8] mb-6">Promote Pawn</h3>
      <div className="grid grid-cols-2 gap-4">
        {[PieceType.QUEEN, PieceType.ROOK, PieceType.BISHOP, PieceType.KNIGHT].map((type) => (
          <button 
            key={type} 
            onClick={() => onSelect(type)}
            className="flex flex-col items-center gap-2 p-4 bg-[#3e2723] hover:bg-[#4e342e] rounded-xl transition-colors border border-transparent hover:border-[#8b5e3c]"
          >
            <div className="text-5xl h-16 w-16 flex items-center justify-center">
              <PieceIcon type={type} color={color} className="" />
            </div>
            <span className="capitalize text-sm font-medium text-[#efebe9]">{type}</span>
          </button>
        ))}
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    board: createInitialBoard(),
    currentPlayer: 'white',
    history: [],
    status: GameStatus.MENU,
    winner: null,
    selectedSquare: null,
    lastMove: null,
    capturedWhite: [],
    capturedBlack: [],
    isFlipped: false,
    timers: { white: 600, black: 600 }
  });

  const [promotionPending, setPromotionPending] = useState<{ from: Position; to: Position } | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Computed
  const validMoves = useMemo(() => {
    if (!gameState.selectedSquare) return [];
    return ChessLogic.getLegalMoves(gameState.board, gameState.selectedSquare, gameState.lastMove);
  }, [gameState.board, gameState.selectedSquare, gameState.lastMove]);

  const isInCheck = useMemo(() => ChessLogic.isKingInCheck(gameState.board, gameState.currentPlayer), [gameState.board, gameState.currentPlayer]);

  // Actions
  const startGame = () => setGameState(prev => ({ ...prev, status: GameStatus.PLAYING, board: createInitialBoard(), history: [], currentPlayer: 'white', lastMove: null, capturedWhite: [], capturedBlack: [], winner: null }));
  const togglePause = () => setGameState(prev => ({ ...prev, status: prev.status === GameStatus.PLAYING ? GameStatus.PAUSED : GameStatus.PLAYING }));
  const resetGame = () => { if (window.confirm("Start a new game? Current progress will be lost.")) startGame(); };
  const goToMenu = () => { if (gameState.status === GameStatus.PLAYING && !window.confirm("Quit to menu?")) return; setGameState(prev => ({ ...prev, status: GameStatus.MENU })); };

  const handleSquareClick = (row: number, col: number) => {
    if (gameState.status !== GameStatus.PLAYING) return;
    const piece = gameState.board[row][col];
    const { selectedSquare } = gameState;

    // Selection
    if (piece && piece.color === gameState.currentPlayer) {
      setGameState(prev => ({ ...prev, selectedSquare: { row, col } }));
      return;
    }

    // Move
    if (selectedSquare) {
      const isLegal = validMoves.some(m => m.row === row && m.col === col);
      if (isLegal) {
        const movingPiece = gameState.board[selectedSquare.row][selectedSquare.col]!;
        // Check for promotion
        if (movingPiece.type === PieceType.PAWN && (row === 0 || row === 7)) {
          setPromotionPending({ from: selectedSquare, to: { row, col } });
          return;
        }
        executeMove(selectedSquare, { row, col });
      } else {
        setGameState(prev => ({ ...prev, selectedSquare: null }));
      }
    }
  };

  const executeMove = useCallback((from: Position, to: Position, promotedTo?: PieceType) => {
    setGameState(prev => {
      const newBoard = prev.board.map(r => [...r]);
      const piece = { ...newBoard[from.row][from.col]!, hasMoved: true };
      const captured = newBoard[to.row][to.col];
      
      let isEnPassant = false;
      let finalCaptured = captured;

      // Handle Promotion
      if (promotedTo) {
        piece.type = promotedTo;
      }

      // Handle Castling visual move for rook
      let isCastling = false;
      if (piece.type === PieceType.KING && Math.abs(from.col - to.col) === 2) {
        isCastling = true;
        const rookCol = to.col > from.col ? 7 : 0;
        const rookNewCol = to.col > from.col ? 5 : 3;
        const rook = { ...newBoard[from.row][rookCol]!, hasMoved: true };
        newBoard[from.row][rookCol] = null;
        newBoard[from.row][rookNewCol] = rook;
      }

      // Handle En Passant
      if (piece.type === PieceType.PAWN && from.col !== to.col && !captured) {
        isEnPassant = true;
        const dir = piece.color === 'white' ? 1 : -1;
        finalCaptured = newBoard[to.row + dir][to.col];
        newBoard[to.row + dir][to.col] = null;
      }

      newBoard[to.row][to.col] = piece;
      newBoard[from.row][from.col] = null;

      const nextPlayer: Color = prev.currentPlayer === 'white' ? 'black' : 'white';
      
      // Meta checks
      const check = ChessLogic.isKingInCheck(newBoard, nextPlayer);
      const allLegalMoves = ChessLogic.getAllLegalMoves(newBoard, nextPlayer, { 
        from, 
        to, 
        piece, 
        captured: finalCaptured || undefined,
        notation: ''
      });
      const mate = check && allLegalMoves.length === 0;
      const stalemate = !check && allLegalMoves.length === 0;

      const move: Move = {
        from, to, piece, 
        captured: finalCaptured || undefined,
        isCastling, isEnPassant, isPromotion: !!promotedTo, promotedTo,
        notation: ChessLogic.getAlgebraicNotation(from, to, piece, !!finalCaptured, check, mate)
      };

      const status = mate ? GameStatus.CHECKMATE : stalemate ? GameStatus.STALEMATE : GameStatus.PLAYING;

      return {
        ...prev,
        board: newBoard,
        currentPlayer: nextPlayer,
        history: [...prev.history, move],
        lastMove: move,
        selectedSquare: null,
        status,
        winner: mate ? prev.currentPlayer : stalemate ? 'draw' : null,
        capturedWhite: finalCaptured?.color === 'white' ? [...prev.capturedWhite, finalCaptured] : prev.capturedWhite,
        capturedBlack: finalCaptured?.color === 'black' ? [...prev.capturedBlack, finalCaptured] : prev.capturedBlack
      };
    });
    setPromotionPending(null);
  }, []);

  const handlePromotion = (type: PieceType) => {
    if (promotionPending) executeMove(promotionPending.from, promotionPending.to, type);
  };

  // Timer simulation
  useEffect(() => {
    let interval: any;
    if (gameState.status === GameStatus.PLAYING) {
      interval = setInterval(() => {
        setGameState(prev => ({
          ...prev,
          timers: {
            ...prev.timers,
            [prev.currentPlayer]: Math.max(0, prev.timers[prev.currentPlayer] - 1)
          }
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState.status, gameState.currentPlayer]);

  // Render Helpers
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen bg-[#1a120b] flex flex-col items-center overflow-hidden">
      {/* --- Main Menu --- */}
      {gameState.status === GameStatus.MENU && (
        <div className="flex-1 w-full flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#3d2b1f] via-[#1a120b] to-[#000]">
          <div className="max-w-md w-full text-center space-y-12 fade-in">
            <div className="space-y-4">
              <h1 className="text-6xl md:text-8xl brand-font text-transparent bg-clip-text bg-gradient-to-b from-[#f0d9b5] to-[#b58863]">
                GRAND<br/>MASTER
              </h1>
              <p className="text-[#8b5e3c] font-medium tracking-[0.2em] uppercase text-sm">Professional Chess Experience</p>
            </div>
            
            <div className="space-y-4">
              <Button onClick={startGame} className="w-full py-6 text-xl">Start New Game</Button>
              <Button variant="secondary" onClick={() => setShowExitConfirm(true)} className="w-full">Exit Game</Button>
            </div>

            <p className="text-[#4e342e] text-xs mt-12">Built with Gemini GenAI & React</p>
          </div>
        </div>
      )}

      {/* --- Main Game Interface --- */}
      {(gameState.status !== GameStatus.MENU) && (
        <div className="w-full h-full flex flex-col lg:flex-row max-w-7xl mx-auto p-4 md:p-8 gap-8 overflow-y-auto lg:overflow-hidden">
          
          {/* Left Panel: Stats & Board */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {/* Player Info (Top - Black) */}
            <div className={`flex items-center justify-between p-4 rounded-xl border ${gameState.currentPlayer === 'black' ? 'bg-[#2d1b0d] border-[#8b5e3c]/50 shadow-lg' : 'bg-[#1a120b] border-[#2d1b0d]'}`}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#3e2723] rounded-lg flex items-center justify-center border border-[#4e342e]">
                  <div className="text-2xl flex items-center justify-center h-full w-full">
                    <PieceIcon type={PieceType.KING} color="black" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-[#efebe9]">Black</h3>
                  <div className="flex gap-1">
                    {gameState.capturedWhite.slice(0, 10).map((p, i) => (
                      <PieceIcon key={i} type={p.type} color="white" className="text-sm opacity-60 text-white" />
                    ))}
                  </div>
                </div>
              </div>
              <div className={`text-2xl font-mono ${gameState.currentPlayer === 'black' ? 'text-[#a67c52]' : 'text-[#4e342e]'}`}>
                {formatTime(gameState.timers.black)}
              </div>
            </div>

            {/* Chess Board */}
            <div className="relative chess-board-container shadow-2xl rounded-sm overflow-hidden border-8 border-[#3e2723]">
              <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
                {(gameState.isFlipped ? [...gameState.board].reverse() : gameState.board).map((rowArr, r) => {
                  const actualRow = gameState.isFlipped ? 7 - r : r;
                  return (gameState.isFlipped ? [...rowArr].reverse() : rowArr).map((piece, c) => {
                    const actualCol = gameState.isFlipped ? 7 - c : c;
                    const isDark = (actualRow + actualCol) % 2 === 1;
                    const isSelected = gameState.selectedSquare?.row === actualRow && gameState.selectedSquare?.col === actualCol;
                    const isLastMove = (gameState.lastMove?.from.row === actualRow && gameState.lastMove?.from.col === actualCol) || 
                                       (gameState.lastMove?.to.row === actualRow && gameState.lastMove?.to.col === actualCol);
                    const isValidTarget = validMoves.some(m => m.row === actualRow && m.col === actualCol);
                    const isCheckSquare = piece?.type === PieceType.KING && piece.color === gameState.currentPlayer && isInCheck;

                    return (
                      <div 
                        key={ChessLogic.getSquareId(actualRow, actualCol)}
                        onClick={() => handleSquareClick(actualRow, actualCol)}
                        className={`
                          relative flex items-center justify-center cursor-pointer transition-all duration-150
                          ${isDark ? 'bg-[#b58863]' : 'bg-[#f0d9b5]'}
                          ${isSelected ? 'after:absolute after:inset-0 after:bg-yellow-500/40' : ''}
                          ${isLastMove ? 'after:absolute after:inset-0 after:bg-yellow-200/20' : ''}
                          ${isCheckSquare ? 'bg-rose-500/80' : ''}
                        `}
                      >
                        {/* Valid move indicators */}
                        {isValidTarget && (
                          <div className={`absolute z-10 w-4 h-4 rounded-full ${piece ? 'border-4 border-black/10 w-12 h-12' : 'bg-black/10'}`} />
                        )}

                        {piece && (
                          <div className={`w-[90%] h-[90%] flex items-center justify-center text-[min(8vw,8vh)] transition-transform duration-300 ${isSelected ? 'scale-110 drop-shadow-xl z-20' : 'z-10'} active:scale-90 ${piece.color === 'white' ? 'text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]' : 'text-black'}`}>
                            <PieceIcon type={piece.type} color={piece.color} className="w-full h-full" />
                          </div>
                        )}

                        {/* Rank/File labels */}
                        {actualCol === 0 && (
                          <span className={`absolute top-0.5 left-0.5 text-[10px] font-bold ${isDark ? 'text-[#f0d9b5]' : 'text-[#b58863]'}`}>
                            {8 - actualRow}
                          </span>
                        )}
                        {actualRow === 7 && (
                          <span className={`absolute bottom-0.5 right-0.5 text-[10px] font-bold ${isDark ? 'text-[#f0d9b5]' : 'text-[#b58863]'}`}>
                            {String.fromCharCode(97 + actualCol)}
                          </span>
                        )}
                      </div>
                    );
                  });
                })}
              </div>

              {/* Status Overlay (Checkmate/Stalemate) */}
              {(gameState.status === GameStatus.CHECKMATE || gameState.status === GameStatus.STALEMATE) && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-500">
                  <div className="bg-[#2d1b0d] p-8 rounded-3xl border border-[#4e342e] shadow-2xl text-center space-y-6 max-w-xs scale-in">
                    <div className="w-20 h-20 bg-[#8b5e3c]/10 rounded-full flex items-center justify-center mx-auto border border-[#8b5e3c]/30">
                      <div className="text-5xl">
                        <PieceIcon type={PieceType.KING} color={gameState.winner === 'white' ? 'white' : 'black'} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-4xl brand-font text-[#efebe9]">
                        {gameState.status === GameStatus.CHECKMATE ? 'Checkmate' : 'Stalemate'}
                      </h2>
                      <p className="text-[#a67c52] font-medium uppercase tracking-widest">
                        {gameState.winner === 'draw' ? "It's a draw!" : `${gameState.winner} WINS`}
                      </p>
                    </div>
                    <Button onClick={startGame} className="w-full">Play Again</Button>
                    <Button variant="ghost" onClick={goToMenu} className="w-full text-[#efebe9]/50">Back to Menu</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Player Info (Bottom - White) */}
            <div className={`flex items-center justify-between p-4 rounded-xl border ${gameState.currentPlayer === 'white' ? 'bg-[#2d1b0d] border-[#8b5e3c]/50 shadow-lg' : 'bg-[#1a120b] border-[#2d1b0d]'}`}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#f0d9b5] rounded-lg flex items-center justify-center border border-[#d7ccc8]">
                  <div className="text-2xl text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] flex items-center justify-center h-full w-full">
                    <PieceIcon type={PieceType.KING} color="white" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-[#efebe9]">White</h3>
                  <div className="flex gap-1">
                    {gameState.capturedBlack.slice(0, 10).map((p, i) => (
                      <PieceIcon key={i} type={p.type} color="black" className="text-sm opacity-60 text-black" />
                    ))}
                  </div>
                </div>
              </div>
              <div className={`text-2xl font-mono ${gameState.currentPlayer === 'white' ? 'text-[#a67c52]' : 'text-[#4e342e]'}`}>
                {formatTime(gameState.timers.white)}
              </div>
            </div>
          </div>

          {/* Right Panel: Controls & History */}
          <div className="w-full lg:w-80 flex flex-col gap-6">
            {/* Header Controls */}
            <div className="flex gap-2">
              <Button onClick={togglePause} variant="secondary" className="flex-1">
                {gameState.status === GameStatus.PAUSED ? 'Resume' : 'Pause'}
              </Button>
              <Button onClick={() => setGameState(prev => ({ ...prev, isFlipped: !prev.isFlipped }))} variant="secondary" className="px-4">
                Flip
              </Button>
            </div>

            {/* Move History */}
            <div className="flex-1 flex flex-col bg-[#2d1b0d] rounded-2xl border border-[#3e2723] overflow-hidden min-h-[300px]">
              <div className="p-4 border-b border-[#3e2723] flex justify-between items-center bg-[#1a120b]/50">
                <h3 className="font-bold text-[#a67c52] uppercase text-xs tracking-widest">Move History</h3>
                <span className="text-[#4e342e] text-xs font-mono">{gameState.history.length} moves</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#2d1b0d]">
                {gameState.history.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[#4e342e] italic text-sm">Game starting...</div>
                ) : (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {Array.from({ length: Math.ceil(gameState.history.length / 2) }).map((_, i) => (
                      <React.Fragment key={i}>
                        <div className="flex gap-4 text-sm items-center">
                          <span className="text-[#4e342e] font-mono w-4">{i + 1}.</span>
                          <span className="text-[#d7ccc8] font-medium">{gameState.history[i * 2].notation}</span>
                        </div>
                        {gameState.history[i * 2 + 1] && (
                          <div className="text-sm flex items-center">
                            <span className="text-[#d7ccc8] font-medium">{gameState.history[i * 2 + 1].notation}</span>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <Button variant="ghost" onClick={resetGame} className="w-full text-sm text-[#a67c52]">Restart Game</Button>
              <Button variant="ghost" onClick={goToMenu} className="w-full text-sm text-[#4e342e] hover:text-rose-400">Exit to Main Menu</Button>
            </div>
          </div>
        </div>
      )}

      {/* --- Modals --- */}
      {promotionPending && (
        <PromotionDialog 
          color={gameState.currentPlayer} 
          onSelect={handlePromotion} 
        />
      )}

      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-[#2d1b0d] p-8 rounded-3xl border border-[#3e2723] max-w-sm w-full space-y-8">
            <h3 className="text-2xl brand-font text-center text-[#efebe9]">Are you sure you want to quit?</h3>
            <div className="flex gap-4">
              <Button variant="danger" onClick={() => window.close()} className="flex-1">Exit</Button>
              <Button variant="secondary" onClick={() => setShowExitConfirm(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* --- Pause Screen --- */}
      {gameState.status === GameStatus.PAUSED && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center">
          <div className="text-center space-y-8 animate-in zoom-in-95">
            <h2 className="text-6xl brand-font text-[#efebe9]">Paused</h2>
            <div className="flex flex-col gap-4">
              <Button onClick={togglePause} className="w-64">Resume Game</Button>
              <Button variant="secondary" onClick={resetGame} className="w-64">New Game</Button>
              <Button variant="ghost" onClick={goToMenu} className="w-64">Main Menu</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
