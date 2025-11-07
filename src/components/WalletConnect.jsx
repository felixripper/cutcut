import React from 'react';
import { ConnectWallet } from '@coinbase/onchainkit/wallet';

const WalletConnect = ({ onConnect }) => {
  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1>Elite Membership Platform</h1>
      <p>NFT sahipliğinizi doğrulayarak elit topluluğumuza katılın.</p>
      <ConnectWallet onConnect={onConnect} />
    </div>
  );
};

export default WalletConnect;