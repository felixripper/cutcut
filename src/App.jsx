import { useState, useEffect } from 'react';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'viem/chains';
import { Wallet } from '@coinbase/onchainkit/wallet';
import { Identity } from '@coinbase/onchainkit/identity';
import { Transaction } from '@coinbase/onchainkit/transaction';
import { encodeFunctionData } from 'viem';
import Game from './Game';
import './App.css'
import AdminPanel from './AdminPanel';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminRoute from './routes/AdminRoute';

function App() {
  const [gameState, setGameState] = useState('menu'); // 'menu', 'playing', 'gameover'
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (window.sdk && window.sdk.actions) {
      window.sdk.actions.ready();
    }
  }, []);

  const startGame = () => setGameState('playing');
  const endGame = (finalScore) => {
    setScore(finalScore);
    setGameState('gameover');
  };
  const backToMenu = () => setGameState('menu');

  const MenuScreen = () => (
    <div className="App">
      <h1>Cut and Save</h1>
      <p>Kes ve Kurtar: Eğlenceli bir kesme oyunu! Base ağında onchain özelliklerle.</p>
      <Wallet />
      <Identity />
      <button className="start-btn" onClick={startGame}>
        Oyunu Başlat
      </button>
    </div>
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <OnchainKitProvider apiKey={import.meta.env.VITE_CDP_API_KEY} chain={base}>
            {gameState === 'menu' && <MenuScreen />}
            {gameState === 'playing' && <Game onGameOver={endGame} />}
            {gameState === 'gameover' && (
              <div className="App">
                <h2>Oyun Bitti! Skor: {score}</h2>
                <Transaction
                  calls={[{
                    to: '0x4caA73f2D477B38795e8b6f9A7FB4ed493882684',
                    data: encodeFunctionData({
                      abi: [{"inputs":[{"internalType":"uint256","name":"score","type":"uint256"}],"name":"saveScore","outputs":[],"stateMutability":"nonpayable","type":"function"}],
                      functionName: 'saveScore',
                      args: [score]
                    })
                  }]}
                >
                  Skoru Kaydet
                </Transaction>
                <button onClick={backToMenu}>Tekrar Oyna</button>
              </div>
            )}
          </OnchainKitProvider>
        } />
        <Route path="/admin" element={<AdminRoute />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;