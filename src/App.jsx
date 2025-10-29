import { useState } from 'react';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'viem/chains';
import { Wallet } from '@coinbase/onchainkit/wallet';
import { Identity } from '@coinbase/onchainkit/identity';
import { Transaction } from '@coinbase/onchainkit/transaction';
import { Mint } from '@coinbase/onchainkit/mint';
import Game from './Game';
import './App.css'

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
    <OnchainKitProvider
      apiKey={import.meta.env.VITE_CDP_API_KEY}
      chain={base}
    >
      <div className="App">
        {gameState === 'menu' && (
          <div className="menu">
            <h1>Cut and Save</h1>
            <p>Kes ve Kurtar: Eğlenceli bir kesme oyunu! Base ağında onchain özelliklerle.</p>
            <Wallet />
            <Identity />
            <button className="start-btn" onClick={startGame}>
              Oyunu Başlat
            </button>
          </div>
        )}
        {gameState === 'playing' && (
          <div className="game">
            <Game onGameOver={endGame} />
          </div>
        )}
        {gameState === 'gameover' && (
          <div className="menu">
            <h1>Oyun Bitti!</h1>
            <p>Skorun: {score}</p>
            <Transaction
              calls={[{
                to: '0x000000000000000000000000000000000000dEaD',
                value: BigInt(score * 1000000000000), // score * 0.000001 ETH
              }]}
              onSuccess={() => alert('Skor onchain kaydedildi!')}
            >
              <button className="start-btn">Skoru Onchain Kaydet ({(score * 0.000001).toFixed(6)} ETH)</button>
            </Transaction>
            <button className="start-btn" onClick={backToMenu}>
              Ana Menü
            </button>
          </div>
        )}
      </div>
    </OnchainKitProvider>
  );
}

export default App;