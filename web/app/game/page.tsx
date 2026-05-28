'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Users, CheckCircle, Loader2 } from 'lucide-react';
import GameControls from '../components/GameControls';
import QRCodeModal from '../components/QRCodeModal';
import { useRouter } from 'next/navigation';
import { usePrivyWallet } from '../../lib/usePrivyWallet';
import { isValidGameCode } from '../../lib/game-utils';
import { client } from '../../lib/client';
import { decodeEventLog } from 'viem';
// @ts-ignore
import { GAME_CONTRACT_ABI } from '../../lib/const';
import { getGameContractAddress } from '../../lib/contract-config';



// Types
interface Player {
  name: string;
  asset: string;
  origin: string;
  height: string;
  shirt: string;
  pos: string;
  dob: string;
  goals: number;
  games: number;
  x: number;
  y: number;
}

interface Token {
  id: string;
  name: string;
  image: string;
  contractAddress?: string;
  isOwned?: boolean;
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

interface GameState {
  isInGame: boolean;
  gameCode: string | null;
  gameDetails: any | null;
  userRole: 'creator' | 'joiner' | null;
}

// Formation positions for 5-a-side, on one half of the pitch
const formationPositions = [
  { x: 30, y: -270 },    // GK
  { x: 120, y: -360 },  // Defender L
  { x: 120, y: -180 },   // Defender R
  { x: 210, y: -315 },   // Forward L
  { x: 210, y: -225 },    // Forward R
];

const positionForIndex = (index: number) => formationPositions[index] || { x: 0, y: 0 };

// Convert token to field player
const toFieldPlayer = (token: Token, index: number): Player => {
  const pos = positionForIndex(index);
  return {
    name: token.name,
    asset: token.image,
    origin: 'N/A',
    height: 'N/A',
    shirt: (index + 1).toString(),
    pos: token.playerData?.position || 'N/A',
    dob: 'N/A',
    goals: 0,
    games: 0,
    x: pos.x,
    y: pos.y,
  };
  };

// Player component
const PlayerDot = ({ player, active, onClick }: { player: Player; active: boolean; onClick(): void }) => (
  <div
    className="ff-player"
    style={{ 
      transform: `translateX(${player.x}px) translateY(${player.y}px)`,
      position: 'absolute',
      width: '50px',
      height: '50px',
      cursor: 'pointer',
      textAlign: 'center',
      zIndex: 10
    }}
    onClick={onClick}
  >
    <div className="ff-player__img">
      <img 
        src={player.asset} 
        alt={player.name} 
        width={50} 
        height={50}
        style={{
          borderRadius: '50%',
          border: active ? '2px solid #facc15' : '2px solid #10b981',
          boxShadow: active ? '0 0 8px #facc15' : 'none'
        }}
      />
    </div>
    <span 
      className="ff-player__label"
      style={{
        fontSize: '0.65rem',
        color: '#e5e7eb',
        whiteSpace: 'nowrap',
        textShadow: '0 1px 2px rgba(0,0,0,0.8)',
        display: 'block',
        marginTop: '2px'
      }}
    >
      {player.name}
    </span>
  </div>
);



// Main component
export default function FootballGame() {
  const [selected, setSelected] = useState<Token[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [gameCode, setGameCode] = useState<string | null>(null);
  const [tokensData, setTokensData] = useState<Token[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    isInGame: false,
    gameCode: null,
    gameDetails: null,
    userRole: null
  });
  const [validationStatus, setValidationStatus] = useState<{
    balances: boolean[];
    allowances: boolean[];
    allValid: boolean;
  }>({
    balances: [],
    allowances: [],
    allValid: false
  });

  const [showOnlyOwned, setShowOnlyOwned] = useState(false);
  
  const router = useRouter();
  const fieldRef = useRef<HTMLDivElement>(null);
  const { address, walletClient } = usePrivyWallet();
  const isConnected = !!address;

  // Check user's game status when address changes (mock version)
  useEffect(() => {
    if (!address || !isConnected) {
      setGameState({
        isInGame: false,
        gameCode: null,
        gameDetails: null,
        userRole: null
      });
      return;
    }

    // For demo purposes, we'll assume user is not in a game initially
    // In a real implementation, this would check the blockchain
    setGameState({
      isInGame: false,
      gameCode: null,
      gameDetails: null,
      userRole: null
    });
  }, [address, isConnected, router]);

  // Fetch user's tokens when address changes
  useEffect(() => {
    if (!address || !isConnected) {
      setTokensData([]);
      setSelected([]);
      return;
    }

    const fetchTokens = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch all available tokens, not just the ones the user owns
        const response = await fetch(`/api/tokens?address=${address}&showAll=true`);
        const data = await response.json();
        
        if (data.success) {
          // Transform API data to match our Token interface
          const transformedTokens: Token[] = data.data.map((token: any) => ({
            id: token.contractAddress,
            name: token.playerData?.playerName || token.tokenName || 'Unknown Player',
            image: token.playerData?.image || 'https://via.placeholder.com/80x80/10b981/ffffff?text=?',
            contractAddress: token.contractAddress,
            playerData: token.playerData,
            isOwned: token.isOwned || false
          }));
          
          setTokensData(transformedTokens);
        } else {
          setError(data.error || 'Failed to fetch tokens');
        }
      } catch (err) {
        console.error('Error fetching tokens:', err);
        setError('Failed to fetch tokens from wallet');
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();
  }, [address, isConnected]);

  // Token validation - allow any 5 tokens for demo
  useEffect(() => {
    if (!address || !isConnected || selected.length === 0) {
      setValidationStatus({
        balances: [],
        allowances: [],
        allValid: false
      });
      return;
    }

    // For demo purposes, allow any 5 tokens
    const balanceChecks = selected.map(() => true);
    const allowanceChecks = selected.map(() => true);
    const allValid = selected.length === 5;

    setValidationStatus({
      balances: balanceChecks,
      allowances: allowanceChecks,
      allValid
    });
  }, [selected, address, isConnected]);

  const toggleSelect = (token: Token) => {
    setSelected((prev) => {
      const already = prev.find((t) => t.id === token.id);
      if (already) {
        return prev.filter((t) => t.id !== token.id);
      }
      if (prev.length >= 5) return prev; // MAX 5 PLAYERS
      return [...prev, token];
    });
  };

  // Enhanced join game logic with mock API
  async function handleJoinGameContract(joinCode: string) {
    if (!address || selected.length !== 5) {
      setError('Please select exactly 5 tokens to join a game.');
      return;
    }

    // Validate game code format
    if (!isValidGameCode(joinCode)) {
      setError('Invalid game code format. Game code should be a 32-byte hex string starting with 0x.');
      return;
    }

    if (!walletClient) {
      setError('Connect your wallet to join a game.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const GAME = getGameContractAddress() as `0x${string}`;
      const contractAddresses = selected.map(t => t.contractAddress as `0x${string}`);

      // Join + play on-chain (joinGame triggers _playGame, sets winner)
      const hash = await walletClient.writeContract({
        address: GAME,
        abi: GAME_CONTRACT_ABI,
        functionName: 'joinGame',
        args: [joinCode as `0x${string}`, contractAddresses],
        account: address,
        gas: BigInt(1500000),
      });
      await client.waitForTransactionReceipt({ hash });

      // Read result; poll until the game resolves (RPC node lag tolerance).
      let details = [] as any[];
      for (let i = 0; i < 8; i++) {
        details = (await client.readContract({
          address: GAME,
          abi: GAME_CONTRACT_ABI,
          functionName: 'getGameDetails',
          args: [joinCode as `0x${string}`],
        })) as any[];
        if (details && details[4] && !details[5]) break; // winner set, not active
        await new Promise((r) => setTimeout(r, 1500));
      }
      const creator = String(details[0]);
      const winner = String(details[4]);
      const isCreatorWinner = winner.toLowerCase() === creator.toLowerCase();
      console.log('Game played on-chain. winner:', winner);

      setGameState({
        isInGame: true,
        gameCode: joinCode,
        gameDetails: { creator, winner },
        userRole: 'joiner'
      });

      router.push(`/game/battle?gameId=${joinCode}&winner=${winner}&isCreatorWinner=${isCreatorWinner}`);

    } catch (err: any) {
      setError(err?.shortMessage || err?.message || "Failed to join game. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Enhanced start game logic with mock API
  async function handleStartGameContract() {
    console.log('handleStartGameContract called');
    console.log('address:', address);
    console.log('selected.length:', selected.length);
    
    if (!address || !walletClient || selected.length !== 5) {
      setError('Connect wallet and select exactly 5 players to start a game');
      return;
    }

    try {
      console.log('Starting game creation...');
      setLoading(true);
      setError(null);

      const GAME = getGameContractAddress() as `0x${string}`;
      const contractAddresses = selected.map((t) => t.contractAddress as `0x${string}`);

      // Create game on-chain
      const hash = await walletClient.writeContract({
        address: GAME,
        abi: GAME_CONTRACT_ABI,
        functionName: 'createGame',
        args: [contractAddresses],
        account: address,
        gas: BigInt(900000),
      });
      const receipt = await client.waitForTransactionReceipt({ hash });

      // Get the authoritative game code from the GameCreated event in this tx
      // (avoids RPC read-after-write lag / stale userToGameCode values).
      let gameCode = "0x" + "0".repeat(64);
      for (const log of receipt.logs) {
        try {
          const ev: any = decodeEventLog({
            abi: GAME_CONTRACT_ABI,
            data: log.data,
            topics: log.topics,
          });
          if (ev.eventName === 'GameCreated' && ev.args?.gameCode) {
            gameCode = ev.args.gameCode as string;
            break;
          }
        } catch {}
      }
      const transactionHash = hash;
      console.log('Game created on-chain. code:', gameCode, 'tx:', hash);

      setGameCode(gameCode);
      setGameState({
        isInGame: true,
        gameCode: gameCode,
        gameDetails: { transactionHash },
        userRole: 'creator'
      });
      
      // Show success message with copyable game code
      setError(null);
      console.log('Game created successfully! Game code:', gameCode);
      
    } catch (err: any) {
      console.error('Error creating game:', err);
      setError(err?.message || "Failed to create game. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const fieldPlayers = selected.map(toFieldPlayer);

  // If user is already in a game, show game status
  if (gameState.isInGame) {
    return (
      <div className="py-10 flex flex-col items-center gap-6 max-w-7xl mx-auto px-4">
        <div className="w-full max-w-md bg-zinc-900/90 rounded-xl border border-red-700 p-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Game in Progress</h2>
          <p className="text-zinc-300 mb-4">
            You are currently in a game as the {gameState.userRole}.
          </p>
          <p className="text-sm text-zinc-400 mb-4">
            Game Code: <span className="text-red-400 font-mono">{gameState.gameCode}</span>
          </p>
          <button
            onClick={() => router.push(`/game/battle?gameId=${gameState.gameCode}`)}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
          >
            View Game Status
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10 flex flex-col items-center gap-6 max-w-7xl mx-auto px-4">
      <div className="w-full flex flex-col lg:flex-row gap-6">
        {/* Football Field */}
        <div className="flex-1 relative">
          <div 
            className="ff-stage"
            style={{
              position: 'relative',
              width: '100%',
              height: '500px',
              overflow: 'visible',
              perspective: '1400px'
            }}
            onClick={() => setActive(null)}
          >
            <div 
              ref={fieldRef} 
              className="ff-world"
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%) translateZ(-200px)',
                transformStyle: 'preserve-3d',
                transition: 'transform 0.6s ease'
              }}
            >
              {/* Pitch container – red theme */}
              <div className="relative w-[800px] h-[480px] bg-gradient-to-br from-green-800 to-lime-900 border-4 border-green-500 rounded-xl shadow-xl">
                {/* Field markings */}
                <div 
                  className="absolute inset-0"
                >
                  {/* Outline */}
                  <div className="absolute inset-0 border-4 border-white rounded-xl pointer-events-none" />

                  {/* Midline */}
                  <div className="absolute left-1/2 top-0 -translate-x-1/2 w-1 h-full bg-white opacity-90" />

                  {/* Centre circle */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 border-4 border-white rounded-full opacity-90" />

                  {/* Penalty boxes */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-24 h-56 border-4 border-white rounded-md opacity-90" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-24 h-56 border-4 border-white rounded-md opacity-90" />

                  {/* Six-yard boxes */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-32 border-4 border-white rounded opacity-90" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-32 border-4 border-white rounded opacity-90" />

                  {/* Goals */}
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-2 h-20 bg-white" />
                  <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-2 h-20 bg-white" />
                </div>
              </div>
              
              {/* Players */}
              {fieldPlayers.map((p, idx) => (
                <PlayerDot 
                  key={p.name} 
                  player={p} 
                  active={active === p.name} 
                  onClick={() => setActive(p.name)} 
                />
              ))}
            </div>
          </div>
          
          {fieldPlayers.length === 0 && (
            <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-zinc-500 text-sm text-center">
              Select up to 5 tokens to place on the field
            </p>
            
          )}
                  <GameControls
          isDisabled={selected.length < 5 || !isConnected || loading}
          onStartGame={handleStartGameContract}
          onJoinGame={handleJoinGameContract}
        />
        </div>

        {/* Token Selection Panel */}
        <div className="w-full lg:w-80 bg-zinc-900/40 rounded-xl p-4 backdrop-blur-sm border border-zinc-700 h-[80vh] overflow-y-auto">
          <div>
            <h3 className="text-lg font-semibold text-red-400 mb-3 flex items-center gap-2">
              <Users size={20} />
              Your Player Tokens
            </h3>
            
            {/* Filter toggle */}
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={() => setShowOnlyOwned(!showOnlyOwned)}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${
                  showOnlyOwned 
                    ? 'bg-green-600 text-white' 
                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                }`}
              >
                {showOnlyOwned ? 'Show All' : 'Show Owned Only'}
              </button>
              <span className="text-xs text-zinc-400">
                {tokensData.filter(token => {
                  return showOnlyOwned ? (token.isOwned || false) : true;
                }).length} tokens
              </span>
            </div>
            
            {!isConnected ? (
              <div className="text-center py-8">
                <p className="text-zinc-400 mb-4">Connect your wallet to see your player tokens</p>
                <div className="text-xs text-zinc-500">
                  You need to connect your wallet to view and select your player tokens for the game.
                </div>
              </div>
            ) : loading ? (
              <div className="text-center py-8">
                <Loader2 className="animate-spin h-8 w-8 text-red-400 mx-auto mb-4" />
                <p className="text-zinc-400">Loading your tokens...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 text-red-400 mx-auto mb-2">⚠️</div>
                <p className="text-red-400 mb-2">Error loading tokens</p>
                <p className="text-xs text-zinc-500">{error}</p>
              </div>
            ) : tokensData.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-zinc-400 mb-2">No player tokens found</p>
                <p className="text-xs text-zinc-500">
                  You don't have any player tokens in your wallet. Visit the marketplace to purchase some!
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-zinc-400 mb-4">
                  Select up to 5 players ({selected.length}/5)
                </p>
                

                

                
                <div className="grid grid-cols-2 gap-3">
                  {tokensData
                    .filter(token => {
                      if (!showOnlyOwned) return true;
                      return token.isOwned || false;
                    })
                    .map((token) => {
                    const isSel = !!selected.find((t) => t.id === token.id);
                    const hasBalance = token.isOwned || false;
                    
                    return (
                      <div
                        key={token.id}
                        onClick={() => toggleSelect(token)}
                        className={`cursor-pointer rounded-lg p-3 text-center border-2 transition-all duration-200 hover:scale-105 ${
                          isSel 
                            ? 'border-red-500 bg-red-500/10 shadow-lg shadow-red-500/20' 
                            : hasBalance
                            ? 'border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20'
                            : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                        }`}
                      >
                        <img 
                          src={token.image} 
                          alt={token.name} 
                          width={90} 
                          height={90} 
                          className="mx-auto rounded-full mb-2"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/80x80/10b981/ffffff?text=?';
                          }}
                        />
                        <span className="block text-sm text-zinc-200 font-medium">
                          {token.name}
                        </span>
                        {token.playerData?.position && (
                          <span className="block text-xs text-zinc-400 mt-1">
                            {token.playerData.position}
                          </span>
                        )}
                        {hasBalance && (
                          <div className="mt-1 text-xs text-green-400">
                            ✓ Owned
                          </div>
                        )}
                        {!hasBalance && (
                          <div className="mt-1 text-xs text-zinc-500">
                            Available
                          </div>
                        )}
                        {isSel && (
                          <div className="mt-1 text-xs text-red-400">
                            Selected
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {selected.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-zinc-700">
                    <button
                      onClick={() => setSelected([])}
                      className="w-full py-2 px-4 bg-red-600/20 text-red-400 rounded-lg border border-red-600/30 hover:bg-red-600/30 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Game Controls - moved outside and below */}
      <div className="w-full max-w-md mt-6">

        

        

      </div>

      {gameCode && <QRCodeModal gameCode={gameCode} onClose={() => setGameCode(null)} />}
      

    </div>
  );
}