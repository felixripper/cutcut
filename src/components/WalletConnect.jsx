import React from 'react';
import { ConnectWallet } from '@coinbase/onchainkit/wallet';

const WalletConnect = ({ connectors }) => {
  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1>Elite Membership Platform</h1>
      <p>NFT sahipliğinizi doğrulayarak elit topluluğumuza katılın.</p>
      <ConnectWallet connectors={connectors} />
    </div>
  );
};

export default WalletConnect;