import React, { useState } from 'react';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'viem/chains';
import { WagmiProvider, createConfig, http } from 'wagmi';
import WalletConnect from './components/WalletConnect';
import NFTCheck from './components/NFTCheck';
import MainApp from './components/MainApp';

const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
});

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [hasNFT, setHasNFT] = useState(false);

  return (
    <WagmiProvider config={config}>
      <OnchainKitProvider
        apiKey={process.env.REACT_APP_ONCHAINKIT_API_KEY}
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
    </WagmiProvider>
  );
}

export default App;