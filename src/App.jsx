import { useState } from 'react';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'viem/chains';
import { Wallet } from '@coinbase/onchainkit/wallet';
import Game from './Game';
import './App.css'

function App() {
  const [gameStarted, setGameStarted] = useState(false);

  return (
    <OnchainKitProvider
      apiKey={process.env.VITE_CDP_API_KEY}
      chain={base}
    >
      <div className="App">
        {!gameStarted ? (
          <div className="menu">
            <h1>Cut and Save</h1>
            <p>Kes ve Kurtar: Eğlenceli bir kesme oyunu! Base ağında onchain özelliklerle.</p>
            <Wallet />
            <button className="start-btn" onClick={() => setGameStarted(true)}>
              Oyunu Başlat
            </button>
          </div>
        ) : (
          <div className="game">
            <Game />
          </div>
        )}
      </div>
    </OnchainKitProvider>
  );
}

export default App;