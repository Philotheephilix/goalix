'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import { client } from "../../lib/client";
import { usePrivyWallet } from '../../lib/usePrivyWallet';
import { getGameContractAddress } from '../../lib/contract-config';

const GAME_CONTRACT_ADDRESS = getGameContractAddress();

interface Token {
  id: string;
  name: string;
  contractAddress?: string;
}

interface TokenApprovalHelperProps {
  tokens: Token[];
  onApprovalComplete: () => void;
  onClose: () => void;
}

const ERC20_ABI = [
  {
    "constant": true,
    "inputs": [
      { "name": "owner", "type": "address" },
      { "name": "spender", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [{ "name": "", "type": "uint256" }],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      { "name": "spender", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "name": "", "type": "bool" }],
    "type": "function"
  }
];

export default function TokenApprovalHelper({ tokens, onApprovalComplete, onClose }: TokenApprovalHelperProps) {
  const { address, walletClient } = usePrivyWallet();
  const isConnected = !!address;
  const [approving, setApproving] = useState<string | null>(null);
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const TOKENS_PER_CONTRACT = 200;

  const approveToken = async (token: Token) => {
    if (!walletClient || !address || !token.contractAddress) return;

    try {
      setApproving(token.id);
      setError(null);

      const hash = await walletClient.writeContract({
        address: token.contractAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [GAME_CONTRACT_ADDRESS as `0x${string}`, BigInt(TOKENS_PER_CONTRACT)],
        account: address as `0x${string}`,
        gas: BigInt(100000),
      });

      await client.waitForTransactionReceipt({ hash });
      setApproved(prev => new Set([...prev, token.id]));

    } catch (err: any) {
      console.error('Error approving token:', err);
      setError(`Failed to approve ${token.name}: ${err?.message || 'Unknown error'}`);
    } finally {
      setApproving(null);
    }
  };

  const approveAllTokens = async () => {
    if (!isConnected) return;

    setLoading(true);
    setError(null);

    for (const token of tokens) {
      if (!approved.has(token.id)) {
        await approveToken(token);
        // Small delay between approvals
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setLoading(false);
    onApprovalComplete();
  };

  const allApproved = tokens.every(token => approved.has(token.id));

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl border border-red-700 p-6 max-w-md w-full">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-400" />
          Token Approval Required
        </h2>
        
        <p className="text-zinc-300 mb-4 text-sm">
          To participate in the game, you need to approve the game contract to spend your tokens. 
          This is a one-time approval per token.
        </p>

        <div className="space-y-3 mb-6">
          {tokens.map((token) => (
            <div key={token.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
              <span className="text-zinc-200 text-sm">{token.name}</span>
              <div className="flex items-center gap-2">
                {approved.has(token.id) ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : approving === token.id ? (
                  <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                ) : (
                  <Button
                    size="sm"
                    onClick={() => approveToken(token)}
                    disabled={!isConnected}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Approve
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={approveAllTokens}
            disabled={!isConnected || loading || allApproved}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Approving All...
              </>
            ) : allApproved ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                All Approved
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4 mr-2" />
                Approve All
              </>
            )}
          </Button>
          
          <Button
            onClick={onClose}
            variant="outline"
            className="border-zinc-600 text-zinc-300 hover:bg-zinc-800"
          >
            Close
          </Button>
        </div>

        {allApproved && (
          <div className="mt-4 p-3 bg-green-900/20 border border-green-700 rounded-lg">
            <p className="text-green-400 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              All tokens approved! You can now start or join a game.
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 