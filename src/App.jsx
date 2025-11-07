import React, { useState } from 'react';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'viem/chains';
import WalletConnect from './components/WalletConnect';
import NFTCheck from './components/NFTCheck';
import MainApp from './components/MainApp';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [hasNFT, setHasNFT] = useState(false);

  return (
    <OnchainKitProvider
      apiKey={process.env.REACT_APP_ONCHAINKIT_API_KEY} // API key gerekli, .env'e ekle
      chain={base}
    >
      <div className="App">
        {!isConnected ? (
          <WalletConnect onConnect={() => setIsConnected(true)} />
        ) : !hasNFT ? (
          <NFTCheck onVerified={() => setHasNFT(true)} />
        ) : (
          <MainApp />
        )}
      </div>
    </OnchainKitProvider>
  );
}

export default App;