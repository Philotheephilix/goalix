import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { teamFanTokens, teams, FANTOKEN_ABI } from "../../lib/const";
import { usePrivyWallet } from "../../lib/usePrivyWallet";

interface FanTokenFaucetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTeam: string;
  setSelectedTeam: (team: string) => void;
  loading?: boolean;
}

const FanTokenFaucet: React.FC<FanTokenFaucetProps> = ({
  open,
  onOpenChange,
  selectedTeam,
  setSelectedTeam,
  loading: loadingProp,
}) => {
  const [loading, setLoading] = useState(false);
  const { address, walletClient } = usePrivyWallet();

  const handleMint = async () => {
    if (!selectedTeam || !walletClient || !address) {
      alert("Connect your wallet first");
      return;
    }
    setLoading(true);
    try {
      const contractAddress =
        teamFanTokens[selectedTeam as keyof typeof teamFanTokens];
      if (!contractAddress) throw new Error("No contract address for team");
      // 1000 tokens, assuming 18 decimals
      const amount = BigInt(1000) * BigInt(1e18);
      const hash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: FANTOKEN_ABI,
        functionName: "mint",
        args: [address, amount],
        account: address,
        gas: BigInt(200000),
      });
      alert("Mint transaction sent! Hash: " + hash);
      setLoading(false);
      onOpenChange(false);
    } catch (err: any) {
      alert("Mint failed: " + (err?.message || err));
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[#cf0a0a]/30 bg-zinc-900/95 shadow-2xl rounded-2xl w-full max-w-3xl p-0 overflow-hidden">
        <div className="bg-zinc-800/50 border-b border-zinc-700 p-6">
          <DialogTitle className="text-2xl font-black text-[#cf0a0a] gaming-text">
            Fan Token Faucet
          </DialogTitle>
          <p className="text-zinc-400 text-sm mt-1">
            Select a team and mint test tokens to your wallet.
          </p>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-zinc-200 font-semibold mb-4">
              Select Team
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {teams.response.map(({ team }) => (
                <div
                  key={team.code}
                  className={`flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                    selectedTeam === team.code
                      ? "border-[#cf0a0a] bg-[linear-gradient(90deg,rgba(207,10,10,0.08)_0%,rgba(207,10,10,0.18)_100%)]"
                      : "border-zinc-700 bg-zinc-800/50"
                  }`}
                  onClick={() => setSelectedTeam(team.code)}
                >
                  <img
                    src={team.logo}
                    alt={team.name}
                    className="w-[30px] h-[30px] rounded-full mb-1 shadow-lg border-2 border-white bg-white object-contain"
                    style={{
                      boxShadow:
                        selectedTeam === team.code
                          ? "0 0 0 4px #cf0a0a55"
                          : undefined,
                    }}
                  />
                  <span className="text-sm font-bold text-center text-white mt-1">
                    {team.code}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <Button
            className="w-full bg-[linear-gradient(90deg,rgba(207,10,10,0.2)_0%,rgba(207,10,10,0.4)_100%)] text-[#cf0a0a] font-bold py-3 rounded-xl shadow-lg hover:bg-[linear-gradient(90deg,rgba(207,10,10,0.4)_0%,rgba(207,10,10,0.6)_100%)] hover:text-white transition-all duration-300 border border-[#cf0a0a]"
            onClick={handleMint}
            disabled={!selectedTeam || loading}
          >
            {loading ? "Minting..." : "Mint 1000 tokens"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FanTokenFaucet;
