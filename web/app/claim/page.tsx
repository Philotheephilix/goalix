'use client'
import React, { useEffect, useState } from "react";
import { usePrivyWallet } from '../../lib/usePrivyWallet';
import { Button } from '../components/ui/button';
import { client } from '../../lib/client';
// @ts-ignore
import { PlayerTokenABI } from '../../lib/const';

interface Token {
  id: string;
  balance: number;
  name: string;
  image: string;
  contractAddress?: string;
  playerData?: {
    playerId: string;
    playerName: string;
    teamName: string;
    position: string;
    teamCode: string;
    teamLogo: string;
    teamVenue: string;
    teamContractAddress: string;
    teamId: string;
    image: string;
    tokenName: string;
    tokenSymbol: string;
        deployedAt: string;
  };
}

const ClaimPage = () => {
  const { address, walletClient } = usePrivyWallet();
  const isConnected = !!address;
  const [tokensData, setTokensData] = useState<Token[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<{ [id: string]: boolean }>({});

  useEffect(() => {
    if (!address || !isConnected) {
      setTokensData([]);
      return;
    }
    const fetchTokens = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/tokens?address=${address}`);
        const data = await response.json();
        if (data.success) {
          const transformedTokens: Token[] = data.data.map((token: any) => ({
            id: token.contractAddress,
            name: token.playerData?.playerName || token.tokenName || 'Unknown Player',
            image: token.playerData?.image || 'https://via.placeholder.com/80x80/10b981/ffffff?text=?',
            contractAddress: token.contractAddress,
            playerData: token.playerData,
            balance: token.balance
          }));
          setTokensData(transformedTokens);
          console.log(data.data);
        } else {
          setError(data.error || 'Failed to fetch tokens');
        }
      } catch (err) {
        setError('Failed to fetch tokens from wallet');
      } finally {
        setLoading(false);
      }
    };
    fetchTokens();
  }, [address, isConnected]);

  const handleClaim = async (token: Token) => {
    if (!walletClient || !address || !token.contractAddress) {
      alert("Connect your wallet first");
      return;
    }
    setClaiming((prev) => ({ ...prev, [token.id]: true }));
    try {
      const hash = await walletClient.writeContract({
        address: token.contractAddress as `0x${string}`,
        abi: PlayerTokenABI,
        functionName: "claim",
        args: [],
        account: address,
        gas: BigInt(500000),
      });
      await client.waitForTransactionReceipt({ hash });
      alert(`Claimed rewards for ${token.name}! Tx: ${hash}`);
      // refresh holdings
      setTokensData((prev) => prev.filter((t) => t.id !== token.id));
    } catch (e: any) {
      const msg = e?.shortMessage || e?.message || String(e);
      alert(
        msg.includes("Season not ended")
          ? "Season not ended yet — rewards claimable after the season ends."
          : `Claim failed: ${msg}`
      );
    } finally {
      setClaiming((prev) => ({ ...prev, [token.id]: false }));
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen py-10 px-4">
      <h1 className="text-4xl font-extrabold text-red-600 mb-2 tracking-tight">Your Player Portfolio</h1>
      <p className="mb-8 text-lg text-center max-w-xl text-zinc-300">
        View your player tokens and claim your rewards at the end of the season.
      </p>
      <div className="w-full max-w-4xl">
        {!isConnected ? (
          <div className="text-center py-16">
            <p className="text-zinc-400 mb-4">Connect your wallet to see your player tokens</p>
            <div className="text-xs text-zinc-500">
              You need to connect your wallet to view and claim your player token rewards.
            </div>
          </div>
        ) : loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-400 mx-auto mb-4"></div>
            <p className="text-zinc-400">Loading your tokens...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-400 mb-2">Error loading tokens</p>
            <p className="text-xs text-zinc-500">{error}</p>
          </div>
        ) : tokensData.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-400 mb-2">No player tokens found</p>
            <p className="text-xs text-zinc-500">
              You don't have any player tokens in your wallet. Visit the marketplace to purchase some!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {tokensData.map((token) => (
              <div
                key={token.id}
                className="flex flex-col items-center bg-zinc-900/90 rounded-xl border border-red-700 p-6 shadow-none"
              >
                <img
                  src={token.image}
                  alt={token.name}
                  width={90}
                  height={90}
                  className="mx-auto rounded-full mb-3 border-2 border-red-500 bg-zinc-800 object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/80x80/10b981/ffffff?text=?';
                  }}
                />
                <span className="block text-lg text-zinc-200 font-bold mb-1 text-center">
                  {token.name}
                </span>
                <span className="block text-sm text-zinc-300 mb-1 text-center">
                  Holdings: {token.balance}
                </span>
                {token.playerData?.position && (
                  <span className="block text-xs text-zinc-400 mb-2 text-center">
                    {token.playerData.position}
                  </span>
                )}
                <Button
                  className="w-full mt-2 bg-red-600/80 text-white font-semibold py-2 rounded-lg border border-red-700 hover:bg-red-700 transition-all"
                  onClick={() => handleClaim(token)}
                  disabled={claiming[token.id]}
                >
                  {claiming[token.id] ? 'Claiming...' : 'Claim'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClaimPage; 