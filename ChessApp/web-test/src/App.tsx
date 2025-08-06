import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import ChessBoard from './components/ChessBoard';
import './App.css';

type ViewState = 'home' | 'play' | 'loading';

export default function App() {
  const [view, setView] = useState<ViewState>('home');
  const [chess] = useState(new Chess());
  const [fen, setFen] = useState(chess.fen());
  const [isAITurn, setIsAITurn] = useState(false);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);

  // Handle player move
  const handleMove = async (move: any) => {
    try {
      chess.move(move);
      setFen(chess.fen());
      setMoveHistory([...moveHistory, move.san]);

      // Check for game over
      if (chess.isGameOver()) {
        let message = '';
        if (chess.isCheckmate()) {
          message = `Checkmate! ${chess.turn() === 'w' ? 'Black' : 'White'} wins!`;
        } else if (chess.isDraw()) {
          message = 'Game is a draw!';
        }
        alert(message);
        return;
      }

      // Simple AI move (random)
      setIsAITurn(true);
      setTimeout(() => {
        const moves = chess.moves();
        if (moves.length > 0) {
          const randomMove = moves[Math.floor(Math.random() * moves.length)];
          chess.move(randomMove);
          setFen(chess.fen());
          setMoveHistory(prev => [...prev, randomMove]);
        }
        setIsAITurn(false);
      }, 500);
    } catch (error) {
      console.error('Move error:', error);
    }
  };

  const resetGame = () => {
    chess.reset();
    setFen(chess.fen());
    setMoveHistory([]);
    setIsAITurn(false);
  };

  if (view === 'loading') {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading chess engine...</p>
      </div>
    );
  }

  if (view === 'home') {
    return (
      <div className="home-container">
        <h1>♔ Chess Master</h1>
        <p>Next-level chess experience with AI coaching</p>
        <div className="button-container">
          <button className="play-button" onClick={() => setView('play')}>
            🎮 PLAY NOW
          </button>
          <button className="coach-button" disabled>
            🤖 ASK COACH (Coming Soon)
          </button>
        </div>
        <div className="features">
          <h3>Features:</h3>
          <ul>
            <li>✅ Play against AI</li>
            <li>🚧 Stockfish integration (in progress)</li>
            <li>🚧 Mistral AI coaching (in progress)</li>
            <li>🚧 P2P multiplayer (in progress)</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="game-container">
      <div className="game-header">
        <h2>Chess Game</h2>
        <button onClick={() => setView('home')}>← Back</button>
      </div>
      
      <div className="game-content">
        <div className="board-section">
          <ChessBoard 
            fen={fen} 
            onMove={handleMove}
            playable={!isAITurn}
          />
          {isAITurn && <p className="thinking">AI is thinking...</p>}
        </div>
        
        <div className="info-section">
          <div className="controls">
            <button onClick={resetGame}>New Game</button>
          </div>
          
          <div className="move-history">
            <h3>Move History</h3>
            <div className="moves">
              {moveHistory.map((move, index) => (
                <span key={index} className="move">
                  {index % 2 === 0 && `${Math.floor(index / 2) + 1}. `}
                  {move}{' '}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}