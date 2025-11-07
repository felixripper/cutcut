import React from 'react';
import { useConnect } from 'wagmi';

// Lightweight wallet selector using wagmi's useConnect
const WalletConnect = () => {
  const { connect, connectors, error, isLoading, pendingConnector } = useConnect();

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1>Elite Membership Platform</h1>
      <p>NFT sahipliğinizi doğrulayarak elit topluluğumuza katılın.</p>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
        {connectors.map((c) => (
          <button
            key={c.id}
            onClick={() => connect({ connector: c })}
            disabled={!c.ready || isLoading}
            style={{ padding: '8px 12px', cursor: c.ready ? 'pointer' : 'not-allowed' }}
          >
            {c.name}
            {isLoading && pendingConnector?.id === c.id ? ' (connecting...)' : ''}
            {!c.ready ? ' (install)' : ''}
          </button>
        ))}
      </div>

      {error && <div style={{ color: 'red', marginTop: 12 }}>Connection error: {error.message}</div>}
    </div>
  );
};

export default WalletConnect;