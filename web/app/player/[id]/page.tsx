"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Loader from "../../components/Loader";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import {
  players,
  TicketingContractAddress,
  TicketingContractABI,
  MerchContractAddress,
  MerchContractABI,
} from "../../../lib/const";
import { client } from "../../../lib/client";
import { parseEther } from "viem";
import { usePrivyWallet } from "../../../lib/usePrivyWallet";
import { usePinataUpload } from "../../test/usePinataUpload";

// Get player data from const.ts and add calculated fields
function getPlayerData(playerId: number) {
  const playerData = players.find((p) => p.playerId === playerId);
  if (!playerData) return null;

  const ratingNum = parseFloat(playerData.statistics?.rating || "7") || 7;
  const points = Math.floor(ratingNum * 42);
  const value = (ratingNum * 5).toFixed(1);

  return {
    ...playerData,
    statistics: {
      ...playerData.statistics,
      conceded: playerData.statistics?.conceded || 0,
    },
    points,
    value,
  };
}

export default function PlayerProfileDashboard() {
  const params = useParams();
  const playerId = params?.id;
  const [player, setPlayer] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showMerchModal, setShowMerchModal] = useState(false);
  const [showCreationModal, setShowCreationModal] = useState(false);
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [isSubmittingMerch, setIsSubmittingMerch] = useState(false);
  const [creationStep, setCreationStep] = useState(0);
  const [creationSteps, setCreationSteps] = useState([
    {
      title: "Upload Image",
      description: "Uploading image to IPFS",
      status: "pending",
    },
    {
      title: "Create Metadata",
      description: "Creating metadata file",
      status: "pending",
    },
    {
      title: "Upload Metadata",
      description: "Uploading metadata to IPFS",
      status: "pending",
    },
    {
      title: "Create on Blockchain",
      description: "Creating merchandise on blockchain",
      status: "pending",
    },
  ]);
  const [ticketForm, setTicketForm] = useState({
    matchId: "",
    quantity: "",
    price: "",
  });
  const [merchForm, setMerchForm] = useState({
    name: "",
    description: "",
    price: "",
    supply: "",
  });
  const { address, walletClient } = usePrivyWallet();

  // Initialize Pinata upload hook for merchandise images
  const {
    selectedFile,
    uploadedCID,
    isUploading,
    error: uploadError,
    fileValidation,
    uploadToPinata,
    handleFileSelect,
    getGatewayUrl,
  } = usePinataUpload();

  useEffect(() => {
    if (!playerId) return;
    setLoading(true);
    setError(null);

    try {
      console.log("Getting player data for ID:", playerId);
      const playerData = getPlayerData(Number(playerId));

      if (playerData) {
        console.log("Found player data:", playerData);
        setPlayer(playerData);
      } else {
        console.log("No player data found");
        setError("Player not found");
      }
    } catch (err) {
      console.error("Error getting player data:", err);
      setError("Error loading player data");
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  async function handleTicketSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!player?.tokenAddress) {
      alert("Player token address not found!");
      return;
    }

    if (!address || !walletClient) {
      alert("Please connect your wallet first!");
      return;
    }

    setIsSubmittingTicket(true);

    try {
      // Check if wallet is connected
      if (!address) {
        throw new Error("Please connect your wallet first");
      }

      // Convert form values to proper types
      const matchId = BigInt(ticketForm.matchId);
      const price = BigInt(ticketForm.price); // Convert to wei (already BigInt)
      const quantity = BigInt(ticketForm.quantity);
      const paymentToken = player.tokenAddress as `0x${string}`;

      console.log("Creating ticket listing with params:", {
        matchId,
        price,
        quantity,
        paymentToken,
      });

      // Call the listTickets function on the ticketing contract
      const hash = await walletClient.writeContract({
        address: TicketingContractAddress as `0x${string}`,
        abi: TicketingContractABI,
        functionName: "listTickets",
        args: [matchId, price, quantity, paymentToken],
        account: address as `0x${string}`,
        gas: BigInt(300000),
      });

      console.log("Transaction hash:", hash);

      // Wait for transaction confirmation
      const receipt = await client.waitForTransactionReceipt({ hash });
      console.log("Transaction confirmed:", receipt);

      // Reset form and close modal on success
      setTicketForm({ matchId: "", quantity: "", price: "" });
      setShowTicketModal(false);

      alert("Ticket listing created successfully!");
    } catch (error) {
      console.error("Error creating ticket listing:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      alert(`Error creating ticket listing: ${errorMessage}`);
    } finally {
      setIsSubmittingTicket(false);
    }
  }

  async function handleMerchSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!player?.tokenAddress) {
      alert("Player token address not found!");
      return;
    }

    if (!address || !walletClient) {
      alert("Please connect your wallet first!");
      return;
    }

    if (!selectedFile) {
      alert("Please select an image for your merchandise!");
      return;
    }

    // Close the form modal and open the creation modal
    setShowMerchModal(false);
    setShowCreationModal(true);
    setIsSubmittingMerch(true);

    // Reset creation steps
    setCreationStep(0);
    setCreationSteps([
      {
        title: "Upload Image",
        description: "Uploading image to IPFS",
        status: "loading",
      },
      {
        title: "Create Metadata",
        description: "Creating metadata file",
        status: "pending",
      },
      {
        title: "Upload Metadata",
        description: "Uploading metadata to IPFS",
        status: "pending",
      },
      {
        title: "Create on Blockchain",
        description: "Creating merchandise on blockchain",
        status: "pending",
      },
    ]);

    try {
      // Step 1: Upload image to Pinata
      console.log("Uploading image to Pinata...");
      const imageCID = await uploadToPinata();

      if (!imageCID) {
        throw new Error("Failed to upload image to Pinata");
      }

      // Update step 1 as completed
      setCreationSteps((prev) =>
        prev.map((step, index) =>
          index === 0 ? { ...step, status: "completed" } : step
        )
      );
      setCreationStep(1);

      // Step 2: Create metadata JSON
      setCreationSteps((prev) =>
        prev.map((step, index) =>
          index === 1 ? { ...step, status: "loading" } : step
        )
      );

      const metadata = {
        name: merchForm.name,
        description: merchForm.description,
        image: `ipfs://${imageCID}`,
        attributes: [
          {
            trait_type: "Player",
            value: player.playerName,
          },
          {
            trait_type: "Team",
            value: player.teamName,
          },
          {
            trait_type: "Price",
            value: `${merchForm.price} ${player.tokenSymbol}`,
          },
          {
            trait_type: "Supply",
            value: merchForm.supply,
          },
        ],
      };

      // Update step 2 as completed
      setCreationSteps((prev) =>
        prev.map((step, index) =>
          index === 1 ? { ...step, status: "completed" } : step
        )
      );
      setCreationStep(2);

      // Step 3: Upload metadata to Pinata
      setCreationSteps((prev) =>
        prev.map((step, index) =>
          index === 2 ? { ...step, status: "loading" } : step
        )
      );

      console.log("Uploading metadata to Pinata...");
      const metadataBlob = new Blob([JSON.stringify(metadata)], {
        type: "application/json",
      });
      const metadataFile = new File([metadataBlob], "metadata.json", {
        type: "application/json",
      });

      // Upload metadata using a separate upload call
      const formData = new FormData();
      formData.append("file", metadataFile);

      const metadataResponse = await fetch("/api/upload-to-pinata", {
        method: "POST",
        body: formData,
      });

      const metadataResult = await metadataResponse.json();

      if (!metadataResult.success) {
        throw new Error("Failed to upload metadata to Pinata");
      }

      const metadataCID = metadataResult.IpfsHash || metadataResult.cid;
      console.log("Metadata uploaded with CID:", metadataCID);

      // Update step 3 as completed
      setCreationSteps((prev) =>
        prev.map((step, index) =>
          index === 2 ? { ...step, status: "completed" } : step
        )
      );
      setCreationStep(3);

      // Step 4: Create merchandise on blockchain
      setCreationSteps((prev) =>
        prev.map((step, index) =>
          index === 3 ? { ...step, status: "loading" } : step
        )
      );

      console.log("Creating merchandise on blockchain...");

      // Convert form values to proper types
      const price = BigInt(merchForm.price);
      const supply = BigInt(merchForm.supply);
      const paymentToken = player.tokenAddress as `0x${string}`;

      console.log("Creating merchandise with params:", {
        name: merchForm.name,
        ipfsMetadataCID: metadataCID,
        price,
        supply,
        paymentToken,
      });

      // Call the createMerch function on the merchandise contract
      const hash = await walletClient.writeContract({
        address: MerchContractAddress as `0x${string}`,
        abi: MerchContractABI,
        functionName: "createMerch",
        args: [merchForm.name, metadataCID, price, supply, paymentToken],
        account: address as `0x${string}`,
        gas: BigInt(2000000),
      });

      console.log("Transaction hash:", hash);

      // Wait for transaction confirmation
      const receipt = await client.waitForTransactionReceipt({ hash });
      console.log("Transaction confirmed:", receipt);

      // Update step 4 as completed
      setCreationSteps((prev) =>
        prev.map((step, index) =>
          index === 3 ? { ...step, status: "completed" } : step
        )
      );

      // Reset form and close modal after a delay to show success
      setTimeout(() => {
        setMerchForm({ name: "", description: "", price: "", supply: "" });
        setShowCreationModal(false);
      }, 3000);
    } catch (error) {
      console.error("Error creating merchandise:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Update current step as error
      setCreationSteps((prev) =>
        prev.map((step, index) =>
          index === creationStep
            ? { ...step, status: "error", description: errorMessage }
            : step
        )
      );

      // Show error for a few seconds then close
      setTimeout(() => {
        setShowCreationModal(false);
      }, 5000);
    } finally {
      setIsSubmittingMerch(false);
    }
  }

  if (loading) return <Loader />;
  if (error)
    return (
      <div className="text-red-500 text-lg font-semibold py-10 text-center">
        {error}
      </div>
    );
  if (!player) return <div className="text-center p-8">Player not found</div>;

  // Create radar chart data from real player stats
  const safeParseFloat = (
    value: string | number | undefined,
    defaultValue: number = 0
  ): number => {
    if (value === undefined || value === null) return defaultValue;
    const parsed = typeof value === "string" ? parseFloat(value) : value;
    return isNaN(parsed) ? defaultValue : parsed;
  };

  const radarData = [
    {
      metric: "Goals",
      player: Math.min(
        (safeParseFloat(player.statistics.goals) /
          Math.max(safeParseFloat(player.statistics.appearances), 1)) *
          100,
        100
      ),
      average: 35,
    },
    {
      metric: "Assists",
      player: Math.min(
        (safeParseFloat(player.statistics.assists) /
          Math.max(safeParseFloat(player.statistics.appearances), 1)) *
          100,
        100
      ),
      average: 25,
    },
    {
      metric: "Rating",
      player: (safeParseFloat(player.statistics.rating, 7) / 10) * 100,
      average: 68,
    },
    {
      metric: "Minutes",
      player: Math.min(
        (safeParseFloat(player.statistics.minutes) /
          Math.max(safeParseFloat(player.statistics.appearances), 1) /
          90) *
          100,
        100
      ),
      average: 60,
    },
    {
      metric: "Appearances",
      player: Math.min(safeParseFloat(player.statistics.appearances) * 4, 100),
      average: 45,
    },
    {
      metric: "Performance",
      player: Math.min(
        (safeParseFloat(player.statistics.goals) +
          safeParseFloat(player.statistics.assists)) *
          10,
        100
      ),
      average: 52,
    },
  ];

  // Mock price data for chart
  const priceData = [
    { month: "Jan", price: 45 },
    { month: "Feb", price: 52 },
    { month: "Mar", price: 48 },
    { month: "Apr", price: 61 },
    { month: "May", price: 55 },
    { month: "Jun", price: 67 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 flex flex-col items-center justify-center py-10 px-4 relative">
      {/* Decorative Gaming Elements */}
      <div className="absolute top-20 right-20 w-32 h-32 bg-[linear-gradient(90deg,rgba(207,10,10,0.2)_0%,rgba(207,10,10,0.4)_100%)] rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 left-20 w-24 h-24 bg-[linear-gradient(90deg,rgba(207,10,10,0.2)_0%,rgba(207,10,10,0.4)_100%)] rounded-full blur-2xl animate-pulse" />
      <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-[linear-gradient(90deg,rgba(207,10,10,0.1)_0%,rgba(207,10,10,0.2)_100%)] rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2 animate-pulse" />

      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-8 z-10">
        {/* Left: Player Card */}
        <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl p-6 flex flex-col items-center shadow-2xl border border-[#cf0a0a]/20">
          <div className="w-40 h-40 rounded-xl overflow-hidden mb-4 border-4 border-[#cf0a0a]/30">
            <img
              src={player.photoUrl}
              alt={player.playerName}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {player.playerName}
          </div>
          <div className="text-[#cf0a0a] font-bold text-lg mb-4">
            {player.points} pts
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center gap-1 bg-zinc-800/60 px-3 py-1 rounded-lg text-white text-sm border border-zinc-700">
              <span role="img" aria-label="flag">
                🏳️
              </span>{" "}
              {player.nationality}
            </span>
            <span className="flex items-center gap-1 bg-zinc-800/60 px-3 py-1 rounded-lg text-white text-sm border border-zinc-700">
              {player.teamLogoUrl && (
                <img
                  src={player.teamLogoUrl}
                  alt="team"
                  className="w-5 h-5 rounded-full"
                />
              )}{" "}
              {player.teamName}
            </span>
          </div>

          <div className="w-full space-y-3 mb-6">
            <div className="flex justify-between">
              <div className="text-zinc-400 text-sm">Position</div>
              <div className="text-white font-medium">{player.position}</div>
            </div>
            <div className="flex justify-between">
              <div className="text-zinc-400 text-sm">Match played</div>
              <div className="text-white font-medium">
                {player.statistics.appearances}
              </div>
            </div>
            <div className="flex justify-between">
              <div className="text-zinc-400 text-sm">Goals</div>
              <div className="text-white font-medium">
                {player.statistics.goals}
              </div>
            </div>
            <div className="flex justify-between">
              <div className="text-zinc-400 text-sm">Assists</div>
              <div className="text-white font-medium">
                {player.statistics.assists}
              </div>
            </div>
            <div className="flex justify-between">
              <div className="text-zinc-400 text-sm">Rating</div>
              <div className="text-white font-medium">
                {player.statistics.rating}
              </div>
            </div>
          </div>

          {/* Contract Info */}
          {player.tokenAddress && (
            <div className="w-full bg-gradient-to-r from-[#cf0a0a]/20 to-[#cf0a0a]/30 rounded-lg p-4 mb-6 border border-[#cf0a0a]/30">
              <h3 className="text-[#cf0a0a] font-semibold mb-2">
                Token Contract
              </h3>
              <div className="text-sm text-white">
                <div className="mb-1">Symbol: {player.tokenSymbol}</div>
                <div className="mb-1">
                  Address: {player.tokenAddress?.slice(0, 10)}...
                </div>
                <div className="text-xs opacity-75">
                  Click to view on explorer
                </div>
              </div>
            </div>
          )}

          {/* Control Panel */}
          <div className="w-full space-y-3">
            <h4 className="text-white font-bold text-lg mb-4 text-center bg-gradient-to-r from-[#cf0a0a] to-red-600 bg-clip-text text-transparent">
              Control Panel
            </h4>

            <Dialog open={showTicketModal} onOpenChange={setShowTicketModal}>
              <DialogTrigger asChild>
                <Button className="w-full bg-[linear-gradient(90deg,rgba(207,10,10,0.2)_0%,rgba(207,10,10,0.4)_100%)] text-[#cf0a0a] font-bold hover:bg-[linear-gradient(90deg,rgba(207,10,10,0.4)_0%,rgba(207,10,10,0.6)_100%)] hover:text-white transition-all duration-300 border border-[#cf0a0a]/30">
                  🎟️ Create Ticket
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900/95 border-[#cf0a0a]/30 shadow-2xl rounded-2xl max-w-2xl p-0 overflow-hidden">
                <DialogHeader className="bg-zinc-800/50 border-b border-zinc-700 p-6">
                  <DialogTitle className="text-2xl font-black text-[#cf0a0a] gaming-text">
                    Create Ticket Listing
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleTicketSubmit} className="p-6 space-y-6">
                  <div className="space-y-2">
                    <span className="text-white font-medium text-sm">
                      Match ID
                    </span>
                    <Input
                      required
                      type="number"
                      min={1}
                      placeholder="Enter Match ID (e.g., 12345)"
                      value={ticketForm.matchId}
                      onChange={(e) =>
                        setTicketForm((f) => ({
                          ...f,
                          matchId: e.target.value,
                        }))
                      }
                      className="bg-zinc-800/50 border-zinc-600 text-white placeholder:text-zinc-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <span className="text-white font-medium text-sm">
                        Quantity of Tickets
                      </span>
                      <Input
                        required
                        type="number"
                        min={1}
                        placeholder="Number of tickets"
                        value={ticketForm.quantity}
                        onChange={(e) =>
                          setTicketForm((f) => ({
                            ...f,
                            quantity: e.target.value,
                          }))
                        }
                        className="bg-zinc-800/50 border-zinc-600 text-white placeholder:text-zinc-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <span className="text-white font-medium text-sm">
                        Price per Ticket ${player.tokenSymbol}
                      </span>
                      <Input
                        required
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="Price in CHZ"
                        value={ticketForm.price}
                        onChange={(e) =>
                          setTicketForm((f) => ({
                            ...f,
                            price: e.target.value,
                          }))
                        }
                        className="bg-zinc-800/50 border-zinc-600 text-white placeholder:text-zinc-400"
                      />
                    </div>
                  </div>

                  {/* Payment Token Info */}
                  {player?.contractAddress && (
                    <div className="bg-zinc-800/30 rounded-lg p-4 border border-[#cf0a0a]/20">
                      <h4 className="text-[#cf0a0a] font-semibold mb-2">
                        Payment Token
                      </h4>
                      <div className="space-y-1 text-sm text-white">
                        <div className="flex justify-between">
                          <span>Token:</span>
                          <span>{player.tokenSymbol || "Unknown"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Contract:</span>
                          <span className="font-mono text-xs">
                            {player.contractAddress.slice(0, 6)}...
                            {player.contractAddress.slice(-4)}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-400 mt-2">
                          Tickets will be paid using this player's token
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  {ticketForm.quantity && ticketForm.price && (
                    <div className="bg-zinc-800/30 rounded-lg p-4 border border-[#cf0a0a]/20">
                      <h4 className="text-[#cf0a0a] font-semibold mb-2">
                        Listing Summary
                      </h4>
                      <div className="space-y-1 text-sm text-white">
                        <div className="flex justify-between">
                          <span>Tickets:</span>
                          <span>{ticketForm.quantity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Price per ticket:</span>
                          <span>
                            {ticketForm.price} {player?.tokenSymbol || "CHZ"}
                          </span>
                        </div>
                        <div className="flex justify-between font-semibold border-t border-zinc-600 pt-1 mt-2">
                          <span>Total Value:</span>
                          <span className="text-[#cf0a0a]">
                            {(
                              parseFloat(ticketForm.quantity || "0") *
                              parseFloat(ticketForm.price || "0")
                            ).toFixed(2)}{" "}
                            {player?.tokenSymbol || "CHZ"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  <DialogFooter>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setShowTicketModal(false)}
                      disabled={isSubmittingTicket}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmittingTicket}
                      className="bg-[linear-gradient(90deg,rgba(207,10,10,0.2)_0%,rgba(207,10,10,0.4)_100%)] text-[#cf0a0a] hover:bg-[linear-gradient(90deg,rgba(207,10,10,0.4)_0%,rgba(207,10,10,0.6)_100%)] hover:text-white disabled:opacity-50"
                    >
                      {isSubmittingTicket ? "Creating..." : "Create Listing"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={showMerchModal} onOpenChange={setShowMerchModal}>
              <DialogTrigger asChild>
                <Button className="w-full bg-[linear-gradient(90deg,rgba(207,10,10,0.2)_0%,rgba(207,10,10,0.4)_100%)] text-[#cf0a0a] font-bold hover:bg-[linear-gradient(90deg,rgba(207,10,10,0.4)_0%,rgba(207,10,10,0.6)_100%)] hover:text-white transition-all duration-300 border border-[#cf0a0a]/30">
                  👕 Create Merch
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900/95 border-[#cf0a0a]/30 shadow-2xl rounded-2xl max-w-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
                <DialogHeader className="bg-zinc-800/50 border-b border-zinc-700 p-6 flex-shrink-0">
                  <DialogTitle className="text-2xl font-black text-[#cf0a0a] gaming-text">
                    List Merchandise
                  </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto">
                  <form onSubmit={handleMerchSubmit} className="p-6 space-y-6">
                    <Input
                      required
                      placeholder="Product Name"
                      value={merchForm.name}
                      onChange={(e) =>
                        setMerchForm((f) => ({ ...f, name: e.target.value }))
                      }
                      className="bg-zinc-800/50 border-zinc-600 text-white"
                    />
                    <Textarea
                      required
                      placeholder="Description"
                      value={merchForm.description}
                      onChange={(e) =>
                        setMerchForm((f) => ({
                          ...f,
                          description: e.target.value,
                        }))
                      }
                      className="bg-zinc-800/50 border-zinc-600 text-white"
                    />

                    {/* Image Upload */}
                    <div className="space-y-2">
                      <label className="text-white font-medium text-sm flex items-center space-x-2">
                        <span>Product Image</span>
                      </label>
                      <div className="flex flex-col items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-600 rounded-xl cursor-pointer bg-zinc-800/50 hover:bg-zinc-700/50 transition-all duration-300">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <div className="w-8 h-8 text-zinc-400 mb-2">📷</div>
                            <p className="mb-2 text-sm text-zinc-400">
                              <span className="font-bold">Click to upload</span>{" "}
                              or drag and drop
                            </p>
                            <p className="text-xs text-zinc-500">
                              PNG, JPG, GIF or WebP (MAX. 10MB)
                            </p>
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleFileSelect(e.target.files[0]);
                              }
                            }}
                            disabled={isUploading}
                            accept="image/*"
                            required
                          />
                        </label>
                      </div>
                      {fileValidation.message && (
                        <p className="text-orange-500 text-sm">
                          {fileValidation.message}
                        </p>
                      )}
                      {uploadError && (
                        <p className="text-red-500 text-sm">{uploadError}</p>
                      )}
                      {selectedFile && (
                        <div className="flex items-center justify-between p-2 bg-zinc-800/50 rounded-lg">
                          <p className="text-zinc-400 text-sm truncate">
                            Selected: {selectedFile.name}
                          </p>
                          {isUploading && (
                            <div className="w-4 h-4 text-zinc-400 animate-spin">
                              ⏳
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        required
                        type="number"
                        min={0}
                        step="any"
                        placeholder="Price"
                        value={merchForm.price}
                        onChange={(e) =>
                          setMerchForm((f) => ({ ...f, price: e.target.value }))
                        }
                        className="bg-zinc-800/50 border-zinc-600 text-white"
                      />
                      <Input
                        required
                        type="number"
                        min={1}
                        placeholder="Supply"
                        value={merchForm.supply}
                        onChange={(e) =>
                          setMerchForm((f) => ({
                            ...f,
                            supply: e.target.value,
                          }))
                        }
                        className="bg-zinc-800/50 border-zinc-600 text-white"
                      />
                    </div>

                    {/* Payment Token Info */}
                    {player?.tokenAddress && (
                      <div className="bg-zinc-800/30 rounded-lg p-4 border border-[#cf0a0a]/20">
                        <h4 className="text-[#cf0a0a] font-semibold mb-2">
                          Payment Token
                        </h4>
                        <div className="space-y-1 text-sm text-white">
                          <div className="flex justify-between">
                            <span>Token:</span>
                            <span>{player.tokenSymbol || "Unknown"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Contract:</span>
                            <span className="font-mono text-xs">
                              {player.tokenAddress.slice(0, 6)}...
                              {player.tokenAddress.slice(-4)}
                            </span>
                          </div>
                          <div className="text-xs text-zinc-400 mt-2">
                            Customers will pay using this player's token
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Summary */}
                    {merchForm.supply && merchForm.price && (
                      <div className="bg-zinc-800/30 rounded-lg p-4 border border-[#cf0a0a]/20">
                        <h4 className="text-[#cf0a0a] font-semibold mb-2">
                          Merchandise Summary
                        </h4>
                        <div className="space-y-1 text-sm text-white">
                          <div className="flex justify-between">
                            <span>Product:</span>
                            <span>{merchForm.name || "Unnamed Product"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Supply:</span>
                            <span>{merchForm.supply} units</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Price per unit:</span>
                            <span>
                              {merchForm.price} {player?.tokenSymbol || "CHZ"}
                            </span>
                          </div>
                          <div className="flex justify-between font-semibold border-t border-zinc-600 pt-1 mt-2">
                            <span>Total Value:</span>
                            <span className="text-[#cf0a0a]">
                              {(
                                parseFloat(merchForm.supply || "0") *
                                parseFloat(merchForm.price || "0")
                              ).toFixed(2)}{" "}
                              {player?.tokenSymbol || "CHZ"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <DialogFooter>
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => setShowMerchModal(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={!selectedFile || !fileValidation.isValid}
                        className="bg-[linear-gradient(90deg,rgba(207,10,10,0.2)_0%,rgba(207,10,10,0.4)_100%)] text-[#cf0a0a] hover:bg-[linear-gradient(90deg,rgba(207,10,10,0.4)_0%,rgba(207,10,10,0.6)_100%)] hover:text-white disabled:opacity-50"
                      >
                        Create Listing
                      </Button>
                    </DialogFooter>
                  </form>
                </div>
              </DialogContent>
            </Dialog>

            {/* Creation Progress Modal */}
            <Dialog
              open={showCreationModal}
              onOpenChange={setShowCreationModal}
            >
              <DialogContent className="bg-zinc-900/95 border-[#cf0a0a]/30 shadow-2xl rounded-2xl max-w-md p-0 overflow-hidden">
                <DialogHeader className="bg-zinc-800/50 border-b border-zinc-700 p-6">
                  <DialogTitle className="text-2xl font-black text-[#cf0a0a] gaming-text">
                    Creating Merchandise
                  </DialogTitle>
                </DialogHeader>
                <div className="p-6">
                  <div className="space-y-4">
                    {creationSteps.map((step, index) => (
                      <div
                        key={index}
                        className={`flex items-center space-x-4 p-4 rounded-lg border transition-all duration-300 ${
                          step.status === "loading"
                            ? "border-[#cf0a0a] bg-[#cf0a0a]/10"
                            : step.status === "completed"
                            ? "border-green-500 bg-green-500/10"
                            : step.status === "error"
                            ? "border-red-500 bg-red-500/10"
                            : "border-zinc-600 bg-zinc-800/50"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            step.status === "completed"
                              ? "bg-green-500 text-white"
                              : step.status === "error"
                              ? "bg-red-500 text-white"
                              : step.status === "loading"
                              ? "bg-[#cf0a0a] text-white"
                              : "bg-zinc-600 text-zinc-300"
                          }`}
                        >
                          {step.status === "loading" ? (
                            <div className="w-4 h-4 animate-spin">⏳</div>
                          ) : step.status === "completed" ? (
                            "✓"
                          ) : step.status === "error" ? (
                            "✗"
                          ) : (
                            index + 1
                          )}
                        </div>
                        <div className="flex-1">
                          <h4
                            className={`font-semibold ${
                              step.status === "completed"
                                ? "text-green-400"
                                : step.status === "error"
                                ? "text-red-400"
                                : step.status === "loading"
                                ? "text-[#cf0a0a]"
                                : "text-zinc-300"
                            }`}
                          >
                            {step.title}
                          </h4>
                          <p className="text-zinc-400 text-sm">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {creationSteps.every(
                    (step) => step.status === "completed"
                  ) && (
                    <div className="mt-6 p-4 bg-green-500/10 border border-green-500 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                          ✓
                        </div>
                        <div>
                          <h4 className="font-semibold text-green-400">
                            Success!
                          </h4>
                          <p className="text-sm text-zinc-400">
                            Your merchandise has been created successfully!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {creationSteps.some((step) => step.status === "error") && (
                    <div className="mt-6 p-4 bg-red-500/10 border border-red-500 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">
                          ✗
                        </div>
                        <div>
                          <h4 className="font-semibold text-red-400">Error!</h4>
                          <p className="text-sm text-zinc-400">
                            Something went wrong. Please try again.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Button className="w-full bg-[linear-gradient(90deg,rgba(207,10,10,0.2)_0%,rgba(207,10,10,0.4)_100%)] text-[#cf0a0a] font-bold hover:bg-[linear-gradient(90deg,rgba(207,10,10,0.4)_0%,rgba(207,10,10,0.6)_100%)] hover:text-white transition-all duration-300 border border-[#cf0a0a]/30">
              💎 Claim Rewards
            </Button>
          </div>
        </div>

        {/* Right: Performance and Charts */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Performance Radar Chart */}
            <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-[#cf0a0a]/20">
              <h3 className="text-base font-medium text-white mb-3 text-center bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
                {player.name} vs League Average
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#374151" strokeDasharray="2 2" />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{ fill: "#9CA3AF", fontSize: 9, fontWeight: 300 }}
                    />
                    <PolarRadiusAxis
                      angle={0}
                      domain={[0, 100]}
                      tick={{ fill: "#9CA3AF", fontSize: 7, fontWeight: 300 }}
                      axisLine={false}
                      tickCount={6}
                    />
                    <Radar
                      name={player.name}
                      dataKey="player"
                      stroke="url(#redGradient)"
                      fill="url(#redGradient)"
                      fillOpacity={0.2}
                      strokeWidth={1.5}
                      dot={{ fill: "#CF0A0A", strokeWidth: 1.5, r: 2.5 }}
                    />
                    <Radar
                      name="League Average"
                      dataKey="average"
                      stroke="#0088ff"
                      fill="#0088ff"
                      fillOpacity={0.1}
                      strokeWidth={1.5}
                      dot={{ fill: "#0088ff", strokeWidth: 1.5, r: 2.5 }}
                    />
                    <defs>
                      <linearGradient
                        id="redGradient"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop offset="0%" stopColor="#CF0A0A" />
                        <stop offset="100%" stopColor="#8B0000" />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #4b5563",
                        borderRadius: "8px",
                        color: "#f3f4f6",
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Price Chart */}
            <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-[#cf0a0a]/20">
              <div className="text-white font-bold text-lg mb-4">
                Price chart
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={priceData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="month"
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 80]}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(39, 39, 42, 0.95)",
                        border: "1px solid rgba(207, 10, 10, 0.3)",
                        borderRadius: 8,
                        color: "#fff",
                      }}
                      formatter={(value: any) => `${value} CHZ`}
                    />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke="#cf0a0a"
                      strokeWidth={3}
                      dot={{ r: 5, fill: "#cf0a0a" }}
                      activeDot={{
                        r: 7,
                        fill: "#fff",
                        stroke: "#cf0a0a",
                        strokeWidth: 2,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Statistics Card */}
          <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-[#cf0a0a]/20">
            <h3 className="text-white font-bold text-lg mb-6 bg-gradient-to-r from-[#cf0a0a] to-red-600 bg-clip-text text-transparent">
              Statistics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-1">
                <span className="text-zinc-400 text-sm">Match played</span>
                <span className="text-white font-bold text-lg">
                  {safeParseFloat(player.statistics.appearances)}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-zinc-400 text-sm">Minutes played</span>
                <span className="text-white font-bold text-lg">
                  {safeParseFloat(player.statistics.minutes)}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-zinc-400 text-sm">Goals</span>
                <span className="text-white font-bold text-lg">
                  {safeParseFloat(player.statistics.goals)}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-zinc-400 text-sm">Assists</span>
                <span className="text-white font-bold text-lg">
                  {safeParseFloat(player.statistics.assists)}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-zinc-400 text-sm">Rating</span>
                <span className="text-white font-bold text-lg">
                  {safeParseFloat(player.statistics.rating, 7).toFixed(1)}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-zinc-400 text-sm">Jersey Number</span>
                <span className="text-white font-bold text-lg">
                  {safeParseFloat(player.statistics.number) || "N/A"}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-zinc-400 text-sm">Captain</span>
                <span className="text-white font-bold text-lg">
                  {player.statistics.captain ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-zinc-400 text-sm">Lineups</span>
                <span className="text-white font-bold text-lg">
                  {safeParseFloat(player.statistics.lineups)}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-zinc-400 text-sm">Saves</span>
                <span className="text-white font-bold text-lg">
                  {player.statistics.saves || "N/A"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
