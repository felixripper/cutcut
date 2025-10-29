import { useState } from 'react';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'viem/chains';
import { Wallet, Identity } from '@coinbase/onchainkit/wallet';
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
      apiKey={process.env.VITE_CDP_API_KEY}
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
            {score > 50 && (
              <Mint
                contractAddress="0x..." // Placeholder, add NFT contract
                onSuccess={() => alert('NFT kazandın!')}
              >
                <button className="start-btn">NFT Kazan</button>
              </Mint>
            )}
            <Transaction
              calls={[]} // Placeholder, later add contract call
              onSuccess={() => alert('Puan kaydedildi!')}
            >
              <button className="start-btn">Puanı Kaydet</button>
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