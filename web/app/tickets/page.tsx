"use client";
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import { useForm } from "react-hook-form";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "../components/ui/form";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ticket,
  Plus,
  Users,
  MapPin,
  DollarSign,
  Calendar,
  X,
  Loader2,
} from "lucide-react";
import {
  TicketingContractAddress,
  TicketingContractABI,
  players,
  PlayerTokenABI,
} from "../../lib/const";
import { client } from "../../lib/client";

import { usePrivyWallet } from "../../lib/usePrivyWallet";

// Contract ticket type
type ContractTicket = {
  price: bigint;
  available: bigint;
  seller: string;
  paymentToken: string;
  matchId?: number; // We'll add this when we iterate
};

// UI ticket type for form
type TicketForm = {
  match: string;
  seat: string;
  quantity: string;
  price: string;
};

const page = () => {
  const [tickets, setTickets] = useState<ContractTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showBuyModal, setShowBuyModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState<ContractTicket | null>(
    null
  );
  const [selectedMatchId, setSelectedMatchId] = useState<number | undefined>(
    undefined
  );
  const form = useForm({
    defaultValues: {
      match: "",
      seat: "",
      quantity: "",
      price: "",
    },
  });
  const { address, walletClient } = usePrivyWallet();

  // Steps for the buying process
  const buySteps = [
    {
      title: "Approve Token",
      description: "Approve the payment token for purchase",
      status: "pending" as "pending" | "loading" | "completed" | "error",
    },
    {
      title: "Buy Ticket",
      description: "Purchase the ticket",
      status: "pending" as "pending" | "loading" | "completed" | "error",
    },
  ];

  const [steps, setSteps] = useState(buySteps);

  // Function to open buy modal
  const openBuyModal = (
    ticket: ContractTicket,
    matchId: number | undefined
  ) => {
    setSelectedTicket(ticket);
    setSelectedMatchId(matchId);
    setCurrentStep(0);
    setSteps(buySteps);
    setShowBuyModal(true);
  };

  // Function to close buy modal
  const closeBuyModal = () => {
    setShowBuyModal(false);
    setSelectedTicket(null);
    setSelectedMatchId(undefined);
    setCurrentStep(0);
    setSteps(buySteps);
  };

  // Function to get token symbol from payment token address
  const getTokenSymbol = (paymentTokenAddress: string): string => {
    if (!paymentTokenAddress) {
      console.warn("Payment token address is empty or undefined");
      return "Unknown";
    }

    const player = players.find(
      (p) => p.tokenAddress.toLowerCase() === paymentTokenAddress.toLowerCase()
    );

    if (!player) {
      console.warn(`No player found for token address: ${paymentTokenAddress}`);
      return "Unknown";
    }

    return player.tokenSymbol;
  };

  // Function to handle buying a ticket (stepper version)
  const buyFunction = async () => {
    if (!selectedMatchId || !selectedTicket) {
      console.error("Match ID and ticket are required to buy a ticket");
      return;
    }

    if (!address || !walletClient) {
      alert("Please connect your wallet to buy a ticket");
      return;
    }

    try {
      // Step 1: Approve Token
      setSteps((prev) =>
        prev.map((step, index) =>
          index === 0 ? { ...step, status: "loading" } : step
        )
      );
      setCurrentStep(0);

      console.log("Approving token for match ID:", selectedMatchId);
      const approveTx = await walletClient.writeContract({
        address: selectedTicket.paymentToken as `0x${string}`,
        abi: PlayerTokenABI,
        functionName: "approve",
        args: [TicketingContractAddress as `0x${string}`, selectedTicket.price],
        account: address as `0x${string}`,
        gas: BigInt(100000),
      });

      console.log("Approve transaction hash:", approveTx);
      const approveReceipt = await client.waitForTransactionReceipt({
        hash: approveTx as `0x${string}`,
      });
      console.log("Approve transaction receipt:", approveReceipt);

      if (approveReceipt.status === "success") {
        setSteps((prev) =>
          prev.map((step, index) =>
            index === 0 ? { ...step, status: "completed" } : step
          )
        );
        setCurrentStep(1);

        // Step 2: Buy Ticket
        setSteps((prev) =>
          prev.map((step, index) =>
            index === 1 ? { ...step, status: "loading" } : step
          )
        );

        console.log("Buying ticket for match ID:", selectedMatchId);
        const hash = await walletClient.writeContract({
          address: TicketingContractAddress as `0x${string}`,
          abi: TicketingContractABI,
          functionName: "buyTicket",
          args: [selectedMatchId],
          account: address as `0x${string}`,
          gas: BigInt(300000),
        });

        console.log("Transaction hash:", hash);
        const receipt = await client.waitForTransactionReceipt({
          hash: hash as `0x${string}`,
        });
        console.log("Transaction receipt:", receipt);

        if (receipt.status === "success") {
          setSteps((prev) =>
            prev.map((step, index) =>
              index === 1 ? { ...step, status: "completed" } : step
            )
          );

          // After successful purchase, refresh the tickets
          const contractTickets = (await client.readContract({
            address: TicketingContractAddress as `0x${string}`,
            abi: TicketingContractABI,
            functionName: "listAllTickets",
          })) as ContractTicket[];
          setTickets(contractTickets);

          // Close modal after success
          setTimeout(() => closeBuyModal(), 2000);
        } else {
          setSteps((prev) =>
            prev.map((step, index) =>
              index === 1 ? { ...step, status: "error" } : step
            )
          );
        }
      } else {
        setSteps((prev) =>
          prev.map((step, index) =>
            index === 0 ? { ...step, status: "error" } : step
          )
        );
      }
    } catch (error) {
      console.error("Error buying ticket:", error);
      const currentStepIndex = currentStep;
      setSteps((prev) =>
        prev.map((step, index) =>
          index === currentStepIndex ? { ...step, status: "error" } : step
        )
      );
    }
  };

  // Fetch tickets from contract
  useEffect(() => {
    async function fetchTickets() {
      try {
        setLoading(true);
        setError(null);

        console.log("Fetching tickets from contract...");
        const contractTickets = (await client.readContract({
          address: TicketingContractAddress as `0x${string}`,
          abi: TicketingContractABI,
          functionName: "listAllTickets",
        })) as ContractTicket[];

        console.log("Fetched tickets:", contractTickets);
        setTickets(contractTickets);
      } catch (err) {
        console.error("Error fetching tickets:", err);
        setError("Failed to load tickets");
      } finally {
        setLoading(false);
      }
    }

    fetchTickets();
  }, []);

  function onSubmit(data: TicketForm) {
    // This would typically create a contract transaction
    // For now, we'll just refetch the tickets
    console.log("Form submitted:", data);
    form.reset();
    // TODO: Implement actual ticket creation logic
  }

  return (
    <div className="min-h-screen text-white relative overflow-hidden">
      {/* Gaming Background Effects */}
      <div className="dots-bg" />

      {/* Decorative Gaming Elements */}
      <div className="absolute top-20 right-20 w-32 h-32 bg-[linear-gradient(90deg,rgba(207,10,10,0.2)_0%,rgba(207,10,10,0.4)_100%)] rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 left-20 w-24 h-24 bg-[linear-gradient(90deg,rgba(207,10,10,0.2)_0%,rgba(207,10,10,0.4)_100%)] rounded-full blur-2xl animate-pulse" />
      <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-[linear-gradient(90deg,rgba(207,10,10,0.1)_0%,rgba(207,10,10,0.2)_100%)] rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2 animate-pulse" />

      {/* Particles Effect */}
      <div className="particles absolute inset-0 pointer-events-none" />

      <div className="relative z-10 container mx-auto px-6 py-20">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center space-x-3 bg-zinc-900/80 backdrop-blur-sm border border-zinc-700/50 rounded-full px-8 py-4 mb-8 shadow-2xl">
            <Ticket className="w-6 h-6 text-[#cf0a0a]" />
            <span className="text-white font-mono font-bold tracking-wider uppercase text-lg">
              TICKET MARKETPLACE
            </span>
          </div>

          <h1 className="text-6xl md:text-7xl font-black text-white mb-6 gaming-text">
            List Your <span className="text-white">Tickets</span>
          </h1>

          <p className="text-xl text-zinc-300 max-w-3xl mx-auto leading-relaxed font-medium">
            Offer your fans a seat at the match! Create and list tickets with
            custom info and pricing. All tickets are securely managed and
            beautifully displayed with our gaming-grade interface.
          </p>
        </motion.div>

        {/* Create Ticket Button */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex justify-center mb-16"
        >
          <Dialog>
            <DialogTrigger asChild>
              <Button className="group relative overflow-hidden bg-[linear-gradient(90deg,rgba(207,10,10,0.2)_0%,rgba(207,10,10,0.4)_100%)] text-[#cf0a0a] font-bold text-lg px-10 py-6 rounded-2xl shadow-2xl hover:bg-[linear-gradient(90deg,rgba(207,10,10,0.4)_0%,rgba(207,10,10,0.6)_100%)] hover:text-white transition-all duration-300 hover:scale-105 border border-[#cf0a0a] backdrop-blur-sm">
                <div className="flex items-center space-x-3">
                  <Plus className="w-6 h-6" />
                  <span>Create Ticket</span>
                </div>
              </Button>
            </DialogTrigger>

            <DialogContent className=" border-[#cf0a0a]/30 bg-zinc-900/95 shadow-2xl rounded-2xl max-w-2xl p-0 overflow-hidden">
              {/* Modal Header */}
              <div className="bg-zinc-800/50 border-b border-zinc-700 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-[linear-gradient(90deg,rgba(207,10,10,0.8)_0%,rgba(207,10,10,1)_100%)] rounded-xl flex items-center justify-center">
                      <Ticket className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <DialogTitle className="text-2xl font-black text-[#cf0a0a] gaming-text">
                        Create Ticket Listing
                      </DialogTitle>
                      <p className="text-zinc-400 text-sm mt-1">
                        Fill in the details below to list your ticket
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                  >
                    <FormField
                      control={form.control}
                      name="match"
                      render={({ field }: { field: any }) => (
                        <FormItem>
                          <FormLabel className="text-zinc-200 font-semibold flex items-center space-x-2 mb-2">
                            <Calendar className="w-4 h-4 text-[#cf0a0a]" />
                            <span>Match Details</span>
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="e.g. Barcelona vs Real Madrid, 2024-06-15, Camp Nou"
                              className="bg-zinc-800/50 border-zinc-600 text-white placeholder-zinc-400 rounded-xl backdrop-blur-sm resize-none"
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="seat"
                      render={({ field }: { field: any }) => (
                        <FormItem>
                          <FormLabel className="text-zinc-200 font-semibold flex items-center space-x-2 mb-2">
                            <MapPin className="w-4 h-4 text-[#cf0a0a]" />
                            <span>Seat Information</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. Section 101, Row 5, Seat 8"
                              className="bg-zinc-800/50 border-zinc-600 text-white placeholder-zinc-400 rounded-xl backdrop-blur-sm"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }: { field: any }) => (
                          <FormItem>
                            <FormLabel className="text-zinc-200 font-semibold flex items-center space-x-2 mb-2">
                              <Users className="w-4 h-4 text-[#cf0a0a]" />
                              <span>Quantity</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                placeholder="e.g. 2"
                                className="bg-zinc-800/50 border-zinc-600 text-white placeholder-zinc-400 rounded-xl backdrop-blur-sm"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }: { field: any }) => (
                          <FormItem>
                            <FormLabel className="text-zinc-200 font-semibold flex items-center space-x-2 mb-2">
                              <DollarSign className="w-4 h-4 text-[#cf0a0a]" />
                              <span>Price</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                step="any"
                                placeholder="e.g. 150"
                                className="bg-zinc-800/50 border-zinc-600 text-white placeholder-zinc-400 rounded-xl backdrop-blur-sm"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </form>
                </Form>
              </div>

              {/* Modal Footer */}
              <div className="bg-zinc-800/30 border-t border-zinc-700 p-6">
                <div className="flex space-x-3">
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex-1 bg-transparent border-zinc-600 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                    >
                      Cancel
                    </Button>
                  </DialogTrigger>
                  <Button
                    onClick={form.handleSubmit(onSubmit)}
                    className="flex-1 bg-[linear-gradient(90deg,rgba(207,10,10,0.2)_0%,rgba(207,10,10,0.4)_100%)] text-[#cf0a0a] font-bold hover:bg-[linear-gradient(90deg,rgba(207,10,10,0.4)_0%,rgba(207,10,10,0.6)_100%)] hover:text-white transition-all duration-300"
                  >
                    Create Listing
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Tickets Grid */}
        <div className="space-y-6">
          {/* Loading State */}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="bg-zinc-900/60 backdrop-blur-sm rounded-2xl p-12 border border-zinc-700/50 shadow-2xl">
                <Loader2 className="w-16 h-16 text-[#cf0a0a] mx-auto mb-6 animate-spin" />
                <h3 className="text-2xl font-bold text-zinc-400 mb-4">
                  Loading Tickets...
                </h3>
                <p className="text-zinc-500 text-lg">
                  Fetching tickets from the blockchain
                </p>
              </div>
            </motion.div>
          )}

          {/* Error State */}
          {error && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="bg-zinc-900/60 backdrop-blur-sm rounded-2xl p-12 border border-red-500/30 shadow-2xl">
                <X className="w-16 h-16 text-red-500 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-red-400 mb-4">
                  Error Loading Tickets
                </h3>
                <p className="text-zinc-500 text-lg mb-6">{error}</p>
                <Button
                  onClick={() => window.location.reload()}
                  className="bg-[linear-gradient(90deg,rgba(207,10,10,0.2)_0%,rgba(207,10,10,0.4)_100%)] text-[#cf0a0a] hover:bg-[linear-gradient(90deg,rgba(207,10,10,0.4)_0%,rgba(207,10,10,0.6)_100%)] hover:text-white"
                >
                  Try Again
                </Button>
              </div>
            </motion.div>
          )}

          {/* Empty State */}
          {!loading && !error && tickets.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="bg-zinc-900/60 backdrop-blur-sm rounded-2xl p-12 border border-zinc-700/50 shadow-2xl">
                <Ticket className="w-16 h-16 text-zinc-600 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-zinc-400 mb-4">
                  No Tickets Listed Yet
                </h3>
                <p className="text-zinc-500 text-lg">
                  No tickets are currently available on the marketplace
                </p>
              </div>
            </motion.div>
          )}

          {/* Tickets List */}
          {!loading && !error && (
            <AnimatePresence>
              {tickets.map((ticket, idx) => (
                <motion.div
                  key={`${ticket.seller}-${idx}`}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="group"
                >
                  <Card className="bg-zinc-900/80 border-[#cf0a0a]/30 backdrop-blur-sm hover:scale-105 hover:shadow-2xl transition-all duration-500 rounded-2xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-[linear-gradient(90deg,rgba(207,10,10,0.8)_0%,rgba(207,10,10,1)_100%)] rounded-xl flex items-center justify-center">
                            <Ticket className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white">
                              Match Ticket
                            </h3>
                            <p className="text-zinc-400 text-sm">
                              Seller: {ticket.seller.slice(0, 6)}...
                              {ticket.seller.slice(-4)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-[#cf0a0a]">
                            {ticket.price} {getTokenSymbol(ticket.paymentToken)}
                          </div>
                          <div className="text-zinc-400 text-sm">
                            per ticket
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-zinc-700/50">
                        <div className="flex items-center space-x-4 text-sm text-zinc-400">
                          <div className="flex items-center space-x-1">
                            <Users className="w-4 h-4 text-[#cf0a0a]" />
                            <span>{ticket.available.toString()} available</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-[linear-gradient(90deg,rgba(207,10,10,0.8)_0%,rgba(207,10,10,1)_100%)] rounded-full animate-pulse" />
                            <span>Available</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div
                            className="text-xs text-zinc-500 font-mono cursor-help"
                            title={`Token Address: ${ticket.paymentToken}`}
                          >
                            Token: {getTokenSymbol(ticket.paymentToken)}
                          </div>
                          <Button
                            onClick={() => openBuyModal(ticket, ticket.matchId)}
                            className="bg-[linear-gradient(90deg,rgba(207,10,10,0.2)_0%,rgba(207,10,10,0.4)_100%)] text-[#cf0a0a] font-semibold px-4 py-2 rounded-lg hover:bg-[linear-gradient(90deg,rgba(207,10,10,0.4)_0%,rgba(207,10,10,0.6)_100%)] hover:text-white transition-all duration-300"
                          >
                            Buy Ticket
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Buy Ticket Modal with Stepper */}
        <Dialog open={showBuyModal} onOpenChange={setShowBuyModal}>
          <DialogContent className="max-w-2xl border-[#cf0a0a]/30 bg-zinc-900/95 shadow-2xl rounded-2xl p-0 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-zinc-800/50 border-b border-zinc-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[linear-gradient(90deg,rgba(207,10,10,0.8)_0%,rgba(207,10,10,1)_100%)] rounded-xl flex items-center justify-center">
                    <Ticket className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-black text-[#cf0a0a] gaming-text">
                      Buy Ticket
                    </DialogTitle>
                    <p className="text-zinc-400 text-sm mt-1">
                      Complete the purchase process
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeBuyModal}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Ticket Details */}
              {selectedTicket && (
                <div className="bg-zinc-800/50 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        Match ID: {selectedMatchId}
                      </h3>
                      <p className="text-zinc-400 text-sm">
                        Seller: {selectedTicket.seller.slice(0, 6)}...
                        {selectedTicket.seller.slice(-4)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-[#cf0a0a]">
                        {selectedTicket.price.toString()}{" "}
                        {getTokenSymbol(selectedTicket.paymentToken)}
                      </div>
                      <div className="text-zinc-400 text-sm">
                        {selectedTicket.available.toString()} available
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Stepper */}
              <div className="space-y-4 mb-6">
                {steps.map((step, index) => (
                  <div
                    key={index}
                    className={`flex items-center space-x-4 p-4 rounded-lg border transition-all duration-300 ${
                      currentStep === index
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
                        <Loader2 className="w-4 h-4 animate-spin" />
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
                            : currentStep === index
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

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <Button
                  onClick={closeBuyModal}
                  variant="outline"
                  className="flex-1 bg-transparent border-zinc-600 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                  disabled={steps.some((step) => step.status === "loading")}
                >
                  Cancel
                </Button>
                <Button
                  onClick={buyFunction}
                  className="flex-1 bg-[linear-gradient(90deg,rgba(207,10,10,0.2)_0%,rgba(207,10,10,0.4)_100%)] text-[#cf0a0a] font-bold hover:bg-[linear-gradient(90deg,rgba(207,10,10,0.4)_0%,rgba(207,10,10,0.6)_100%)] hover:text-white transition-all duration-300"
                  disabled={
                    steps.some((step) => step.status === "loading") ||
                    steps.every((step) => step.status === "completed")
                  }
                >
                  {steps.some((step) => step.status === "loading")
                    ? "Processing..."
                    : steps.every((step) => step.status === "completed")
                    ? "Purchase Complete!"
                    : "Start Purchase"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default page;
