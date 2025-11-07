import React, { useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { base } from 'viem/chains';

const NFTCheck = ({ onVerified }) => {
  const { address } = useAccount();
  const [isChecking, setIsChecking] = useState(true);

  // Örnek NFT contract adresi (gerçek bir adresle değiştir)
  const nftContractAddress = '0xBa5e05cb26b78eDa3A2f8e3b3814726305dcAc83';
  const { data: balance, error, isLoading } = useReadContract({
    address: nftContractAddress,
    abi: [
      {
        inputs: [{ name: 'owner', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    ],
    functionName: 'balanceOf',
    args: [address],
    chainId: base.id,
  });

  console.log('Address:', address);
  console.log('Balance:', balance);
  console.log('Error:', error);
  console.log('IsLoading:', isLoading);

  React.useEffect(() => {
    if (!isLoading && balance !== undefined) {
      setIsChecking(false);
      if (balance > 0) {
        onVerified();
      }
    }
  }, [balance, isLoading, onVerified]);

  if (isChecking) {
    return <div>Checking NFT ownership...</div>;
  }

  if (error) {
    return <div>Error checking NFT: {error.message}</div>;
  }

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h2>Access Denied</h2>
      <p>You do not own the required NFT. Balance: {balance}</p>
    </div>
  );
};

export default NFTCheck;