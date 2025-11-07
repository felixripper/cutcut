import React, { useState } from 'react';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'viem/chains';
import { WagmiProvider, createConfig, http, useAccount } from 'wagmi';
import WalletConnect from './components/WalletConnect';
import NFTCheck from './components/NFTCheck';
import MainApp from './components/MainApp';

const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
});

function AppContent() {
  const { address } = useAccount();
  const [hasNFT, setHasNFT] = useState(false);

  const isConnected = !!address;

  return (
    <div className="App">
      {!isConnected ? (
        <WalletConnect />
      ) : !hasNFT ? (
        <NFTCheck onVerified={() => setHasNFT(true)} />
      ) : (
        <MainApp />
      )}
    </div>
  );
}

function App() {
  return (
    <WagmiProvider config={config}>
      <OnchainKitProvider
        apiKey={process.env.REACT_APP_ONCHAINKIT_API_KEY}
        chain={base}
      >
        <AppContent />
      </OnchainKitProvider>
    </WagmiProvider>
  );
}

export default App;