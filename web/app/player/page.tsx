"use client";
import { useState, useEffect, Suspense } from "react";
import { CircularCarousel } from "../components/ui/CircularCarousel";
import ProfileCard from "../components/ui/ProfileCard";
import PerformancePredictionGraph from "../components/PerformancePredictionGraph";
import Loader from "../components/Loader";
import { useSearchParams } from "next/navigation";
// @ts-ignore
import { client } from "../../lib/client";
import { usePrivyWallet } from "../../lib/usePrivyWallet";
// @ts-ignore
import {
  PlayerTokenABI,
  FANTOKEN_ABI,
  players as playerList,
} from "../../lib/const";
import { parseUnits, formatUnits } from "viem";
// Removed type-only import for players

interface PlayerCard {
  id: number;
  name: string;
  title: string;
  avatar: string;
  handle: string;
  status: string;
  goals?: number;
  assists?: number;
  current_season_stats?: { rating: number };
}

interface ApiPlayer {
  player: {
    id: number;
    name: string;
    photo: string;
  };
  statistics: Array<{
    team: {
      name: string;
    };
    league: {
      name: string;
    };
    games: {
      position: string;
      rating: string;
    };
    goals: {
      total: number;
      assists: number;
    };
  }>;
}

type PlayerListItem = (typeof playerList)[number];

// Fallback player cards from the deployed Argentina registry (const players),
// used when the API-Football quota is exhausted. Keeps playerIds aligned with
// the on-chain token registry so the buy flow keeps working.
const fallbackPlayers: PlayerCard[] = (playerList as any[]).map((p) => ({
  id: p.playerId,
  name: p.playerName,
  title: p.position || "Player",
  avatar: p.photoUrl,
  handle: String(p.playerName || "").toLowerCase().replace(/\s+/g, ""),
  status: "Online",
  goals: p.statistics?.goals || 0,
  assists: p.statistics?.assists || 0,
  current_season_stats: { rating: parseFloat(p.statistics?.rating || "7.0") || 7 },
}));

function PlayerPageContent() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerCard | null>(null);
  const [players, setPlayers] = useState<PlayerCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailedPlayerData, setDetailedPlayerData] = useState<any>(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buyAmount, setBuyAmount] = useState(1);
  const [teamName, setTeamName] = useState<string>("");
  const [fanTokenBalance, setFanTokenBalance] = useState<string>("-");
  const [price, setPrice] = useState<string>("-");
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [buySuccess, setBuySuccess] = useState<string | null>(null);
  const [buyStep, setBuyStep] = useState<0 | 1 | 2>(0); // 0: idle, 1: approving, 2: buying
  const [buyStepStatus, setBuyStepStatus] = useState<string>("");

  const { address, walletClient } = usePrivyWallet();

  const searchParams = useSearchParams();
  const teamId = searchParams.get("team");

  // Keep selectedPlayer in sync with currentIndex
  useEffect(() => {
    if (players.length > 0) {
      setSelectedPlayer(players[currentIndex]);
    }
  }, [currentIndex, players]);

  // Fetch team players
  useEffect(() => {
    const fetchTeamPlayers = async () => {
      if (!teamId) {
        setError("No team ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Abort the (slow / quota-limited) API after 4s and fall back to the
        // on-chain Argentina registry so the page never hangs on the loader.
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 4000);
        const response = await fetch(`/api/team-players?teamId=${teamId}`, {
          signal: ctrl.signal,
        });
        clearTimeout(timer);

        if (!response.ok) {
          throw new Error("Failed to fetch team players");
        }

        const data = await response.json();

        if (data.response && Array.isArray(data.response) && data.response.length > 0) {
          const transformedPlayers: PlayerCard[] = data.response.map(
            (apiPlayer: ApiPlayer) => {
              const stats = apiPlayer.statistics[0]; // Get first team's stats
              return {
                id: apiPlayer.player.id,
                name: apiPlayer.player.name,
                title: stats?.games?.position || "Player",
                avatar: apiPlayer.player.photo,
                handle: apiPlayer.player.name.toLowerCase().replace(/\s+/g, ""),
                status: "Online",
                goals: stats?.goals?.total || 0,
                assists: stats?.goals?.assists || 0,
                current_season_stats: {
                  rating: parseFloat(stats?.games?.rating || "7.0"),
                },
              };
            }
          );
          setPlayers(transformedPlayers);

          // Set team name from first player's team
          if (data.response[0]?.statistics[0]?.team?.name) {
            setTeamName(data.response[0].statistics[0].team.name);
          }
        } else {
          // API empty (e.g. quota exhausted) — fall back to deployed registry
          setPlayers(fallbackPlayers);
          setTeamName(fallbackPlayers[0]?.title ? "Argentina" : "");
        }
      } catch (err) {
        // API failed — fall back to the deployed Argentina registry so the
        // page (and the buy flow, which keys off these playerIds) still works.
        setPlayers(fallbackPlayers);
        setTeamName("Argentina");
      } finally {
        setLoading(false);
      }
    };

    fetchTeamPlayers();
  }, [teamId]);

  // Fetch detailed player data when a player is selected
  useEffect(() => {
    const fetchPlayerDetails = async () => {
      if (!selectedPlayer) {
        setDetailedPlayerData(null);
        return;
      }

      try {
        const response = await fetch(
          `/api/player?playerId=${selectedPlayer.id}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch player details");
        }

        const data = await response.json();
        setDetailedPlayerData(data.response?.[0] || null);
      } catch (err) {
        console.error("Failed to fetch player details:", err);
        setDetailedPlayerData(null);
      }
    };

    fetchPlayerDetails();
  }, [selectedPlayer]);

  // Fetch FanToken balance when modal opens or selectedPlayer changes
  useEffect(() => {
    let playerData: any = null;
    if (showBuyModal && selectedPlayer) {
      console.log("Buy modal opened for player id:", selectedPlayer.id);
      playerData = playerList.find((p) => p.playerId === selectedPlayer.id);
      console.log("Player data for this id:", playerData);
    }
    async function fetchFanTokenBalance() {
      setFanTokenBalance("-");
      const isAddr = (a: any) => typeof a === "string" && /^0x[a-fA-F0-9]{40}$/.test(a);
      if (!playerData || !isAddr(playerData.teamContractAddress) || !isAddr(address)) return;
      try {
        // Log the values being used for the contract call
        console.log(
          "About to call balanceOf on address:",
          playerData.teamContractAddress
        );
        console.log("ABI:", FANTOKEN_ABI);
        console.log("User address:", address);
        const balance = await client.readContract({
          address: playerData.teamContractAddress as `0x${string}`,
          abi: FANTOKEN_ABI,
          functionName: "balanceOf",
          args: [address],
        });
        console.log("FanToken Balance (raw):", balance);
        console.log(
          "FanToken Balance (formatted):",
          formatUnits(balance as bigint, 18)
        );
        setFanTokenBalance(formatUnits(balance as bigint, 18));
      } catch (e) {
        console.error("Error fetching FanToken balance:", e);
        setFanTokenBalance("-");
      }
    }
    if (showBuyModal && selectedPlayer) {
      fetchFanTokenBalance();
    }
  }, [showBuyModal, selectedPlayer]);

  // Fetch PlayerToken price when buyAmount or selectedPlayer changes
  useEffect(() => {
    async function fetchPrice() {
      setPrice("-");
      const info = playerList.find((p) => p.playerId === selectedPlayer?.id);
      if (!info) return;
      try {
        // Confirmed: This calls calculateTotalPrice on the PlayerToken contract
        const result = await client.readContract({
          address: info.tokenAddress as `0x${string}`,
          abi: PlayerTokenABI,
          functionName: "calculateTotalPrice",
          args: [BigInt(buyAmount)],
        });
        setPrice(formatUnits(result as bigint, 18));
      } catch (e) {
        setPrice("-");
      }
    }
    if (selectedPlayer && buyAmount > 0) {
      fetchPrice();
    }
  }, [selectedPlayer, buyAmount]);

  // Buy Token Handler
  async function handleBuyTokens() {
    setBuyLoading(true);
    setBuyError(null);
    setBuySuccess(null);
    setBuyStep(1); // Step 1: Approving
    setBuyStepStatus("Approving tokens...");
    const info = playerList.find((p) => p.playerId === selectedPlayer?.id);
    if (!info || !walletClient || !address) {
      setBuyError("Missing contract info or wallet");
      setBuyLoading(false);
      setBuyStep(0);
      setBuyStepStatus("");
      return;
    }
    if (price === "-") {
      setBuyError("Token price not loaded yet");
      setBuyLoading(false);
      setBuyStep(0);
      setBuyStepStatus("");
      return;
    }
    try {
      console.log("Approving tokens for player:", info);
      // 1. Approve FanToken spend
      const priceBN = parseUnits(price, 18);

      // Pre-check fan-token balance so we fail fast with a clear message
      // instead of a reverted purchaseTokens tx (transferFrom would revert).
      const fanBal = (await client.readContract({
        address: info.teamContractAddress as `0x${string}`,
        abi: FANTOKEN_ABI,
        functionName: "balanceOf",
        args: [address],
      })) as bigint;
      if (fanBal < priceBN) {
        setBuyError(
          `Insufficient ${info.teamCode || "fan"} tokens — need ${price}, you have ${formatUnits(
            fanBal,
            18
          )}. Mint from the Faucet first.`
        );
        setBuyLoading(false);
        setBuyStep(0);
        setBuyStepStatus("");
        return;
      }

      const hash = await walletClient.writeContract({
        address: info.teamContractAddress as `0x${string}`,
        abi: FANTOKEN_ABI,
        functionName: "approve",
        args: [info.tokenAddress, priceBN],
        account: address,
        gas: BigInt(100000),
      });
      console.log("Approve hash:", hash);
      setBuyStepStatus("Waiting for approval transaction...");
      await client.waitForTransactionReceipt({ hash });
      setBuyStep(2); // Step 2: Buying
      setBuyStepStatus("Buying Fan token...");
      // 2. Purchase PlayerTokens
      const buyHash = await walletClient.writeContract({
        address: info.tokenAddress as `0x${string}`,
        abi: PlayerTokenABI,
        functionName: "purchaseTokens",
        args: [BigInt(buyAmount)],
        account: address,
        gas: BigInt(2000000),
      });
      setBuyStepStatus("Waiting for buy transaction...");
      await client.waitForTransactionReceipt({ hash: buyHash });
      setBuyStepStatus("Purchase successful!");
      setBuySuccess("Purchase successful!");
      setShowBuyModal(false);
      setBuyStep(0);
      setTimeout(() => setBuyStepStatus(""), 1000);
      console.log("Purchased tokens for player:", info);
    } catch (e: any) {
      setBuyError(e?.message || "Transaction failed");
      setBuyStep(0);
      setBuyStepStatus("");
    } finally {
      setBuyLoading(false);
    }
  }

  if (loading) {
    return <Loader size="lg" />;
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center text-white bg-black">
        <div className="text-center">
          <p className="text-red-400 mb-4">Error: {error}</p>
          <p className="text-zinc-500">Using fallback data</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-start justify-start overflow-hidden text-white">
      {/* Left side - Player Carousel */}
      <div className="w-1/2 p-8 flex flex-col items-center gap-6">
        <div className="text-center mb-6">
          <h2 className="text-4xl font-bold text-white mb-2">{teamName}</h2>
          <h3 className="text-2xl font-thin text-red-400 uppercase tracking-wide">
            Select Player
          </h3>
        </div>

        {players.length > 0 ? (
          <>
            <div className="flex flex-col items-center gap-4 w-full">
              <CircularCarousel
                itemWidth={320}
                items={players.map((player, idx) => (
                  <div
                    key={player.id}
                    className={`transition-all duration-200 ${
                      idx === currentIndex ? "scale-105" : "hover:scale-102"
                    }`}
                  >
                    <ProfileCard
                      avatarUrl={player.avatar}
                      name={player.name}
                      title={player.title}
                    />
                  </div>
                ))}
                currentIndex={currentIndex}
                onChange={setCurrentIndex}
              />

              {/* Buy Now Button */}
              <div className="text-center mt-6">
                <button
                  className="relative h-12 px-8 py-2 text-white font-mono font-bold uppercase tracking-wide overflow-hidden group"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(207, 10, 10, 0.2) 0%, rgba(207, 10, 10, 0.4) 100%)",

                    border: "1px solid rgba(207, 10, 10, 0.5)",
                    boxShadow: "0 0 20px rgba(207, 10, 10, 0.4)",
                  }}
                  onClick={() => setShowBuyModal(true)}
                >
                  <span className="relative z-10">Buy Fan Token</span>
                  <div className="absolute inset-0 bg-red-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                </button>
              </div>
            </div>

            {/* Buy Modal */}
            {showBuyModal && selectedPlayer && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                <div className="bg-zinc-900/95 border border-red-500/30 rounded-2xl w-full max-w-md relative shadow-2xl">
                  {/* Modal Header */}
                  <div className="bg-zinc-800/50 border-b border-zinc-700 p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-[linear-gradient(90deg,rgba(207,10,10,0.8)_0%,rgba(207,10,10,1)_100%)] rounded-xl flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                            />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-[#cf0a0a] gaming-text">
                            Buy Fan Token
                          </h3>
                          <p className="text-zinc-400 text-sm mt-1">
                            Purchase tokens for {selectedPlayer.name}
                          </p>
                        </div>
                      </div>
                      <button
                        className="text-zinc-400 hover:text-white text-2xl transition-colors duration-200"
                        onClick={() => setShowBuyModal(false)}
                        aria-label="Close"
                      >
                        &times;
                      </button>
                    </div>
                  </div>

                  {/* Modal Content */}
                  <div className="p-6">
                    <div className="space-y-6">
                      {/* Player Info */}
                      <div className="bg-zinc-800/30 rounded-xl p-4 border border-zinc-700/50">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="w-8 h-8 bg-[linear-gradient(90deg,rgba(207,10,10,0.6)_0%,rgba(207,10,10,0.8)_100%)] rounded-lg flex items-center justify-center">
                            <svg
                              className="w-4 h-4 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                          </div>
                          <span className="text-zinc-200 font-semibold">
                            Player Details
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-400 text-sm">
                              Player:
                            </span>
                            <span className="text-white font-medium">
                              {selectedPlayer.name}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-400 text-sm">
                              Position:
                            </span>
                            <span className="text-zinc-300 font-medium">
                              {selectedPlayer.title}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-400 text-sm">
                              Availability:
                            </span>
                            <span className="text-white font-medium">
                              1,000 tokens
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Price Info */}
                      <div className="bg-zinc-800/30 rounded-xl p-4 border border-zinc-700/50">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="w-8 h-8 bg-[linear-gradient(90deg,rgba(207,10,10,0.6)_0%,rgba(207,10,10,0.8)_100%)] rounded-lg flex items-center justify-center">
                            <svg
                              className="w-4 h-4 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                              />
                            </svg>
                          </div>
                          <span className="text-zinc-200 font-semibold">
                            Pricing
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-400 text-sm">
                              Token Price:
                            </span>
                            <span className="text-[#cf0a0a] font-bold text-lg">
                              {(() => {
                                const playerData = playerList.find(
                                  (p) => p.playerId === selectedPlayer.id
                                );
                                return price !== "-" && playerData
                                  ? `${Number(price).toFixed(6)} ${
                                      playerData.teamCode
                                    }`
                                  : "$2.50";
                              })()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-400 text-sm">
                              Total Value:
                            </span>
                            <span className="text-white font-medium">
                              {(() => {
                                const playerData = playerList.find(
                                  (p) => p.playerId === selectedPlayer.id
                                );
                                return price !== "-" && playerData
                                  ? `${Number(price).toFixed(6)} ${
                                      playerData.teamCode
                                    }`
                                  : `$${(buyAmount * 2.5).toFixed(2)}`;
                              })()}
                            </span>
                          </div>
                          {/* Show FanToken balance with team logo */}
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-400 text-sm flex items-center gap-2">
                              Your Balance:
                              {/* Team logo from teams object using teamId */}
                              {(() => {
                                const playerData = playerList.find(
                                  (p) => p.playerId === selectedPlayer.id
                                );
                                if (!playerData) return null;
                                if (playerData.teamLogoUrl) {
                                  return (
                                    <img
                                      src={playerData.teamLogoUrl}
                                      alt={playerData.teamName + " logo"}
                                      className="w-6 h-6 rounded-full border border-zinc-600 bg-zinc-700 object-cover"
                                    />
                                  );
                                }
                                return null;
                              })()}
                            </span>
                            <span className="text-white font-medium">
                              {fanTokenBalance}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quantity Input */}
                      <div className="space-y-3">
                        <label
                          className="block text-zinc-200 font-semibold flex items-center space-x-2"
                          htmlFor="buy-amount"
                        >
                          <svg
                            className="w-4 h-4 text-[#cf0a0a]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                            />
                          </svg>
                          <span>Number of Tokens</span>
                        </label>
                        <input
                          id="buy-amount"
                          type="number"
                          min={1}
                          max={1000}
                          value={buyAmount}
                          onChange={(e) => setBuyAmount(Number(e.target.value))}
                          className="w-full px-4 py-3 rounded-xl border border-zinc-600 bg-zinc-800/50 text-white placeholder-zinc-400 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 transition-all duration-200"
                          placeholder="Enter quantity..."
                        />
                        <div className="flex justify-between text-xs text-zinc-500">
                          <span>Min: 1</span>
                          <span>Max: 1,000</span>
                        </div>
                      </div>
                      {buyError && (
                        <div className="text-red-400 text-sm">{buyError}</div>
                      )}
                      {buySuccess && (
                        <div className="text-green-400 text-sm">
                          {buySuccess}
                        </div>
                      )}
                      {/* Stepper for buy process */}
                      {buyLoading && (
                        <div className="mb-4">
                          <ol className="flex items-center w-full text-sm font-medium text-center text-gray-500 dark:text-gray-400 sm:text-base">
                            <li
                              className={`flex-1 flex items-center ${
                                buyStep >= 1 ? "text-[#cf0a0a]" : ""
                              }`}
                            >
                              <span
                                className={`flex items-center ${
                                  buyStep === 1 ? "font-bold" : ""
                                }`}
                              >
                                <span
                                  className={`w-6 h-6 flex items-center justify-center rounded-full border-2 ${
                                    buyStep >= 1
                                      ? "border-[#cf0a0a] bg-[#cf0a0a] text-white"
                                      : "border-gray-400 bg-white text-gray-400"
                                  }`}
                                >
                                  1
                                </span>
                                <span className="ml-2">Approving tokens</span>
                              </span>
                              <span
                                className="flex-1 border-t-2 mx-2"
                                style={{
                                  borderColor:
                                    buyStep >= 2 ? "#cf0a0a" : "#e5e7eb",
                                }}
                              ></span>
                            </li>
                            <li
                              className={`flex-1 flex items-center ${
                                buyStep === 2 ? "text-[#cf0a0a]" : ""
                              }`}
                            >
                              <span
                                className={`flex items-center ${
                                  buyStep === 2 ? "font-bold" : ""
                                }`}
                              >
                                <span
                                  className={`w-6 h-6 flex items-center justify-center rounded-full border-2 ${
                                    buyStep === 2
                                      ? "border-[#cf0a0a] bg-[#cf0a0a] text-white"
                                      : "border-gray-400 bg-white text-gray-400"
                                  }`}
                                >
                                  2
                                </span>
                                <span className="ml-2">Buying Fan token</span>
                              </span>
                            </li>
                          </ol>
                          <div className="mt-2 text-center text-zinc-300 animate-pulse">
                            {buyStepStatus}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="bg-zinc-800/30 border-t border-zinc-700 p-6">
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setShowBuyModal(false)}
                        className="flex-1 bg-transparent border border-zinc-600 text-zinc-300 hover:bg-zinc-700 hover:text-white py-3 rounded-xl transition-all duration-200 font-medium"
                        disabled={buyLoading}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleBuyTokens}
                        className="flex-1 bg-[linear-gradient(90deg,rgba(207,10,10,0.2)_0%,rgba(207,10,10,0.4)_100%)] text-[#cf0a0a] font-bold hover:bg-[linear-gradient(90deg,rgba(207,10,10,0.4)_0%,rgba(207,10,10,0.6)_100%)] hover:text-white transition-all duration-300 py-3 rounded-xl border border-red-500/30"
                        disabled={buyLoading || price === "-"}
                      >
                        {buyLoading ? "Processing..." : "Buy Tokens"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-zinc-400">
            <p>No players found</p>
          </div>
        )}
      </div>

      {/* Right side - Performance Graph */}
      <div className="w-1/2 p-8 overflow-y-auto max-h-screen">
        {selectedPlayer ? (
          <div className="h-full">
            <h3 className="text-2xl font-bold text-white mb-6">
              Performance Analysis
            </h3>
            <PerformancePredictionGraph
              player={{
                id: selectedPlayer.id,
                name: selectedPlayer.name,
                goals: selectedPlayer.goals || 0,
                assists: selectedPlayer.assists || 0,
                current_season_stats: {
                  rating: selectedPlayer.current_season_stats?.rating || 7.0,
                },
              }}
              detailedData={detailedPlayerData}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-zinc-400 mb-4">
                Select a Player
              </h3>
              <p className="text-zinc-500">
                Choose a player from the carousel to view their performance
                analysis
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function PlayerPage() {
  return (
    <Suspense fallback={<Loader size="lg" />}>
      <PlayerPageContent />
    </Suspense>
  );
}
