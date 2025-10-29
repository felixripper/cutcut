import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'viem/chains';
import { Wallet } from '@coinbase/onchainkit/wallet';
import './App.css'

function App() {
  return (
    <OnchainKitProvider
      apiKey={process.env.VITE_CDP_API_KEY}
      chain={base}
    >
      <div className="App">
        <h1>Cut and Save Game</h1>
        <Wallet />
        {/* Game canvas will go here */}
        <div id="game-container">
          <canvas id="game"></canvas>
        </div>
        {/* OnchainKit components */}
        {/* Add wallet connect, etc. */}
      </div>
    </OnchainKitProvider>
  );
}

export default App;