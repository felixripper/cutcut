import React, { useState } from 'react';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'viem/chains';
import { WagmiProvider, createConfig, http, useAccount } from 'wagmi';
import { metaMask, coinbaseWallet, walletConnect, injected } from '@wagmi/connectors';
import WalletConnect from './components/WalletConnect';
import NFTCheck from './components/NFTCheck';
import MainApp from './components/MainApp';

const connectors = [
  metaMask(),
  coinbaseWallet(),
  walletConnect({ projectId: '25713046a3b7af4df595c1131b6819ed' }),
];

const config = createConfig({
  chains: [base],
  connectors,
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
        <WalletConnect connectors={connectors} />
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