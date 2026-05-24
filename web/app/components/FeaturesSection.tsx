import React from "react";
import CardSwap, { Card } from "./ui/cardswap";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { ShieldCheck, TrendingUp, Trophy, BadgeDollarSign } from "lucide-react";

const FeaturesSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center py-20 ">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left side - Platform description and feature cards */}
          <div className="space-y-8">
            <div>
              <h2 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
                Performance-Based
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-700">
                  Player Tokenization
                </span>
              </h2>
              <p className="text-xl text-zinc-200 leading-relaxed">
                Goalix revolutionizes fan engagement through seasonal player tokens built on X Layer.
                Back players based on real performance stats, not just popularity. Where every goal, assist, 
                and match fuels a dynamic, on-chain fan economy.
              </p>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4 max-w-md">
              {/* Mint */}
              <div className="flex items-center gap-3 bg-zinc-900/70 border border-red-700 rounded-lg px-4 py-3">
                <BadgeDollarSign className="text-red-500" size={22} />
                <span className="text-sm text-zinc-200">Mint PFTs</span>
              </div>
              {/* Trade */}
              <div className="flex items-center gap-3 bg-zinc-900/70 border border-red-700 rounded-lg px-4 py-3">
                <TrendingUp className="text-red-500" size={22} />
                <span className="text-sm text-zinc-200">24/7 Trade</span>
              </div>
              {/* Earn */}
              <div className="flex items-center gap-3 bg-zinc-900/70 border border-red-700 rounded-lg px-4 py-3">
                <Trophy className="text-red-500" size={22} />
                <span className="text-sm text-zinc-200">Season Rewards</span>
              </div>
              {/* Secure */}
              <div className="flex items-center gap-3 bg-zinc-900/70 border border-red-700 rounded-lg px-4 py-3">
                <ShieldCheck className="text-red-500" size={22} />
                <span className="text-sm text-zinc-200">On-Chain Secure</span>
              </div>
            </div>
          </div>
          {/* Right side - CardSwap component */}
          <div className="relative h-[600px] mt-[-200px] mr-[100px]">
            <CardSwap
              width={350}
              height={450}
              cardDistance={60}
              verticalDistance={70}
              delay={3500}
              pauseOnHover={false}
              skewAmount={6}
              easing="linear"
            >
              {/* Card 1 */}
              <Card className="bg-zinc-900/80 border border-red-700 backdrop-blur-sm">
                <div className="p-8 h-full flex flex-col justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-3">Mint PFTs</h3>
                    <p className="text-zinc-300 text-sm leading-relaxed">
                      Player Fan Tokens minted via club tokens. Seasonal, expiring, performance-driven.
                    </p>
                  </div>
                  <span className="text-red-500 text-sm font-semibold">#PlayerTokens</span>
                </div>
              </Card>

              {/* Card 2 */}
              <Card className="bg-zinc-900/80 border border-red-700 backdrop-blur-sm">
                <div className="p-8 h-full flex flex-col justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-3">PvP Battles</h3>
                    <p className="text-zinc-300 text-sm leading-relaxed">
                      Stake player tokens head-to-head. Best performance wins the pool.
                    </p>
                  </div>
                  <span className="text-red-500 text-sm font-semibold">#StakeAndWin</span>
                </div>
              </Card>

              {/* Card 3 */}
              <Card className="bg-zinc-900/80 border border-red-700 backdrop-blur-sm">
                <div className="p-8 h-full flex flex-col justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-3">Token Utility</h3>
                    <p className="text-zinc-300 text-sm leading-relaxed">
                      Buy tickets, exclusive merch, meet players. Burn for protocol rewards.
                    </p>
                  </div>
                  <span className="text-red-500 text-sm font-semibold">#FanAccess</span>
                </div>
              </Card>

              {/* Card 4 */}
              <Card className="bg-zinc-900/80 border border-red-700 backdrop-blur-sm">
                <div className="p-8 h-full flex flex-col justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-3">Fair Rewards</h3>
                    <p className="text-zinc-300 text-sm leading-relaxed">
                      50% to fans, 30% to protocol, 20% to players. Performance pays everyone.
                    </p>
                  </div>
                  <span className="text-red-500 text-sm font-semibold">#AlignedIncentives</span>
                </div>
              </Card>
            </CardSwap>
          </div>
        </div>
      </div>
    </section>
  );
};

// HowItWorksSection updated for Goalix
const HowItWorksSection = () => {
  const router = useRouter();
  return (
    <section className="w-full py-20 flex items-center justify-center h-screen">
      <div className="container mx-auto px-6 max-w-3xl">
        <div className="border border-red-700 rounded-2xl bg-zinc-900/70 shadow-lg p-10 flex flex-col items-center">
          <h2 className="text-3xl font-bold text-white mb-6 text-center tracking-tight">How Goalix Works</h2>

          {/* quick pillars */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="flex flex-col items-center gap-2 bg-zinc-900/70 border border-red-700 rounded-lg p-3">
              <BadgeDollarSign className="text-red-500" size={20} />
              <span className="text-xs text-zinc-200">Mint</span>
            </div>
            <div className="flex flex-col items-center gap-2 bg-zinc-900/70 border border-red-700 rounded-lg p-3">
              <TrendingUp className="text-red-500" size={20} />
              <span className="text-xs text-zinc-200">Trade</span>
            </div>
            <div className="flex flex-col items-center gap-2 bg-zinc-900/70 border border-red-700 rounded-lg p-3">
              <Trophy className="text-red-500" size={20} />
              <span className="text-xs text-zinc-200">Rewards</span>
            </div>
            <div className="flex flex-col items-center gap-2 bg-zinc-900/70 border border-red-700 rounded-lg p-3">
              <ShieldCheck className="text-red-500" size={20} />
              <span className="text-xs text-zinc-200">Secure</span>
            </div>
          </div>
          <ol className="space-y-6 text-zinc-200 text-lg w-full max-w-xl mx-auto mb-10">
            <li className="flex items-center gap-4">
              <span className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-black font-bold">1</span>
              Hold club tokens to mint Player Fan Tokens (PFTs) for your favorite athletes.
            </li>
            <li className="flex items-center gap-4">
              <span className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-black font-bold">2</span>
              Trade PFTs or stake in PvP battles. Token values reflect real match performance.
            </li>
            <li className="flex items-center gap-4">
              <span className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-black font-bold">3</span>
              Use tokens for exclusive access or burn for rewards before season expiry.
            </li>
          </ol>
          <Button
            className="w-full max-w-xs mt-2"
            onClick={() => router.push('/leagues')}
          >
            Join Goalix
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
export { HowItWorksSection };