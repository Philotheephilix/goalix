'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import NavBar1 from '../../components/ui/NavBar1';
import { client } from '../../../lib/client';
import { GAME_CONTRACT_ABI } from '../../../lib/const';
import { usePrivyWallet } from '../../../lib/usePrivyWallet';
import { CheckCircle, XCircle, Loader2, Trophy, Users } from 'lucide-react';
import { getGameContractAddress } from '../../../lib/contract-config';

const GAME_CONTRACT_ADDRESS = getGameContractAddress();

interface GameDetails {
  creator: string;
  creatorContracts: string[];
  joiner: string;
  joinerContracts: string[];
  winner: string;
  isActive: boolean;
}

interface GameResult {
  winner: string;
  isActive: boolean;
  userRole: 'creator' | 'joiner' | null;
  userWon: boolean;
  gameCode: string;
}

const validatingTexts = [
  'Validating your team',
  'Calculating match stats',
  'Checking player stamina',
  'Rolling the ball',
  'Final whistle coming up',
];

const BattleContent = () => {
  const searchParams = useSearchParams();
  const gameId = searchParams.get('gameId');
  const { address } = usePrivyWallet();
  const isConnected = !!address;
  const [statusIdx, setStatusIdx] = useState(0);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [gameDetails, setGameDetails] = useState<GameDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch game details from mock API or URL params
  useEffect(() => {
    if (!gameId || !isConnected || !address) {
      setLoading(false);
      return;
    }

    const fetchGameDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        // Read real game result from the Game contract on X Layer.
        // Poll to tolerate public-RPC read-after-write lag.
        const GAME = getGameContractAddress() as `0x${string}`;
        let d = [] as any[];
        for (let i = 0; i < 6; i++) {
          d = (await client.readContract({
            address: GAME,
            abi: GAME_CONTRACT_ABI,
            functionName: 'getGameDetails',
            args: [gameId as `0x${string}`],
          })) as any[];
          if (d && d[0] && d[0] !== '0x0000000000000000000000000000000000000000') break;
          await new Promise((r) => setTimeout(r, 1500));
        }
        const details: GameDetails = {
          creator: String(d[0]),
          creatorContracts: (d[1] as string[]) || [],
          joiner: String(d[2]),
          joinerContracts: (d[3] as string[]) || [],
          winner: String(d[4]),
          isActive: Boolean(d[5]),
        };
        setGameDetails(details);
        setGameResult({
          winner: details.winner,
          isActive: details.isActive,
          userRole:
            address.toLowerCase() === details.creator.toLowerCase()
              ? 'creator'
              : 'joiner',
          userWon: details.winner.toLowerCase() === address.toLowerCase(),
          gameCode: gameId,
        });

      } catch (err) {
        console.error('Error fetching game details:', err);
        setError('Failed to load game details');
      } finally {
        setLoading(false);
      }
    };

    fetchGameDetails();
  }, [gameId, address, isConnected, searchParams]);

  if (!isConnected) {
    return (
      <div className="relative min-h-screen w-full flex flex-col items-center bg-black">
        <NavBar1 />
        <div className="flex-1 flex flex-col items-center justify-center w-full z-10 px-4 pt-24">
          <h1 className="text-5xl font-extrabold text-red-600 mb-2 tracking-tight">BATTLE ARENA</h1>
          <p className="text-zinc-300 mb-6">Please connect your wallet to view game details</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="relative min-h-screen w-full flex flex-col items-center bg-black">
        <NavBar1 />
        <div className="flex-1 flex flex-col items-center justify-center w-full z-10 px-4 pt-24">
          <Loader2 className="animate-spin h-12 w-12 text-red-400 mb-4" />
          <h1 className="text-5xl font-extrabold text-red-600 mb-2 tracking-tight">BATTLE ARENA</h1>
          <p className="text-zinc-300">Loading game details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative min-h-screen w-full flex flex-col items-center bg-black">
        <NavBar1 />
        <div className="flex-1 flex flex-col items-center justify-center w-full z-10 px-4 pt-24">
          <XCircle className="h-12 w-12 text-red-400 mb-4" />
          <h1 className="text-5xl font-extrabold text-red-600 mb-2 tracking-tight">BATTLE ARENA</h1>
          <p className="text-red-400 mb-6">{error}</p>
          <p className="text-zinc-300">Game ID: {gameId}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen w-full flex flex-col items-center bg-black"
      style={{
        minHeight: '100vh',
        height: '100vh',
        background:
          'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(34,34,34,0.85) 60%, rgba(207,10,10,0.7) 100%), url(/football-ground.jpg) center/cover no-repeat',
      }}
    >
      <NavBar1 />
      <div className="flex-1 flex flex-col items-center justify-center w-full z-10 px-4 pt-24">
        <h1 className="text-5xl font-extrabold text-red-600 mb-2 tracking-tight" style={{fontFamily: 'Oswald, sans-serif'}}>BATTLE ARENA</h1>
        <p className="text-base text-zinc-300 mb-6 font-mono">
          Game ID: <span className="text-red-400">{gameId || 'N/A'}</span>
        </p>
        
        {gameResult && (
          <div className="text-center">
            <div className={`text-2xl font-bold mb-2 flex items-center justify-center gap-2 ${
              gameResult.userWon ? 'text-green-400' : 'text-red-500'
            }`}>
              {gameResult.userWon ? (
                <>
                  <Trophy className="w-6 h-6" />
                  You Won!
                </>
              ) : (
                <>
                  <XCircle className="w-6 h-6" />
                  You Lost
                </>
              )}
            </div>
          </div>
        )}
              
        
        {gameResult && !gameResult.isActive && (
          <div className="mt-6 w-full max-w-2xl">
            {/* Game Results */}
            <div className="bg-zinc-900/90 rounded-xl border border-red-700 p-6 mb-4">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Game Results
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-zinc-300 mb-2">Creator Team</h4>
                  <p className="text-xs text-zinc-400 mb-1">Address: 0xCreator...789</p>
                  <p className="text-xs text-zinc-400">Tokens: 5 tokens staked</p>
                </div>
                
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-zinc-300 mb-2">Joiner Team</h4>
                  <p className="text-xs text-zinc-400 mb-1">Address: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
                  <p className="text-xs text-zinc-400">Tokens: 5 tokens staked</p>
                </div>
              </div>
              
              <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-green-400 mb-2">Winner</h4>
                <p className="text-xs text-green-300">
                  {gameResult.winner === '0xCreatorAddress123456789' ? 'Creator' : 'Joiner'} 
                  ({gameResult.winner.slice(0, 6)}...{gameResult.winner.slice(-4)})
                </p>
                <p className="text-xs text-green-300 mt-1">
                  All 10 tokens (200 each) transferred to winner
                </p>
              </div>
            </div>
            
            {/* Token Transfers */}
            <div className="bg-zinc-900/90 rounded-xl border border-red-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Token Transfers
              </h3>
              
              <div className="space-y-2">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between bg-zinc-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-white">{i + 1}</span>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-300">Token {i + 1}</p>
                        <p className="text-xs text-zinc-400">0xToken{i + 1}Address...</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-green-400 font-medium">200 tokens</p>
                      <p className="text-xs text-zinc-400">
                        → {gameResult.winner.slice(0, 6)}...{gameResult.winner.slice(-4)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-green-900/20 border border-green-700 rounded-lg">
                <p className="text-sm text-green-400 font-medium">
                  Total: 2,000 tokens transferred to winner
                </p>
                <p className="text-xs text-green-300 mt-1">
                  Transaction completed successfully
                </p>
              </div>
            </div>
          </div>
        )}
        
        {gameResult?.isActive && (
          <div className="mt-6 text-sm text-zinc-400 italic">
            Opponent's team is hidden until the match is over.
          </div>
        )}
      </div>
    </div>
  );
};

export default function BattlePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BattleContent />
    </Suspense>
  );
} 