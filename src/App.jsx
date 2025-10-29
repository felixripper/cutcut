import { useState } from 'react';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'viem/chains';
import { Wallet } from '@coinbase/onchainkit/wallet';
import { Identity } from '@coinbase/onchainkit/identity';
import { Transaction } from '@coinbase/onchainkit/transaction';
import Game from './Game';
import './App.css'
import AdminPanel from './AdminPanel';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminRoute from './routes/AdminRoute';

function App() {
  const [gameState, setGameState] = useState('menu'); // 'menu', 'playing', 'gameover'
  const [score, setScore] = useState(0);

  const startGame = () => setGameState('playing');
  const endGame = (finalScore) => {
    setScore(finalScore);
    setGameState('gameover');
  };
  const backToMenu = () => setGameState('menu');

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <OnchainKitProvider apiKey={import.meta.env.VITE_CDP_API_KEY} chain={base}>
            <div className="App">
              <h1>Cut and Save</h1>
              <p>Kes ve Kurtar: Eğlenceli bir kesme oyunu! Base ağında onchain özelliklerle.</p>
              <Wallet />
              <Identity />
              <button className="start-btn" onClick={startGame}>
                Oyunu Başlat
              </button>
            </div>
          </OnchainKitProvider>
        } />
        <Route path="/admin" element={<AdminRoute />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;