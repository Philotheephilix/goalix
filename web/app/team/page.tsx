"use client";
import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Loader from "../components/Loader";

// World Cup 2022 — full 32-nation wheel. Only Argentina (id 26) is deployed
// with on-chain player tokens on testnet; the rest are shown but locked.
const flag = (cc: string) => `https://flagcdn.com/w320/${cc}.png`;
const worldCupTeams = [
  { id: 26, name: "Argentina", code: "ARG", logo: "https://media.api-sports.io/football/teams/26.png", available: true },
  { id: 9001, name: "France", code: "FRA", logo: flag("fr"), available: false },
  { id: 9002, name: "Brazil", code: "BRA", logo: flag("br"), available: false },
  { id: 9003, name: "England", code: "ENG", logo: flag("gb-eng"), available: false },
  { id: 9004, name: "Spain", code: "ESP", logo: flag("es"), available: false },
  { id: 9005, name: "Portugal", code: "POR", logo: flag("pt"), available: false },
  { id: 9006, name: "Netherlands", code: "NED", logo: flag("nl"), available: false },
  { id: 9007, name: "Germany", code: "GER", logo: flag("de"), available: false },
  { id: 9008, name: "Croatia", code: "CRO", logo: flag("hr"), available: false },
  { id: 9009, name: "Morocco", code: "MAR", logo: flag("ma"), available: false },
  { id: 9010, name: "Belgium", code: "BEL", logo: flag("be"), available: false },
  { id: 9011, name: "Uruguay", code: "URU", logo: flag("uy"), available: false },
  { id: 9012, name: "Mexico", code: "MEX", logo: flag("mx"), available: false },
  { id: 9013, name: "USA", code: "USA", logo: flag("us"), available: false },
  { id: 9014, name: "Switzerland", code: "SUI", logo: flag("ch"), available: false },
  { id: 9015, name: "Japan", code: "JPN", logo: flag("jp"), available: false },
  { id: 9016, name: "South Korea", code: "KOR", logo: flag("kr"), available: false },
  { id: 9017, name: "Senegal", code: "SEN", logo: flag("sn"), available: false },
  { id: 9018, name: "Poland", code: "POL", logo: flag("pl"), available: false },
  { id: 9019, name: "Denmark", code: "DEN", logo: flag("dk"), available: false },
  { id: 9020, name: "Serbia", code: "SRB", logo: flag("rs"), available: false },
  { id: 9021, name: "Wales", code: "WAL", logo: flag("gb-wls"), available: false },
  { id: 9022, name: "Ecuador", code: "ECU", logo: flag("ec"), available: false },
  { id: 9023, name: "Australia", code: "AUS", logo: flag("au"), available: false },
  { id: 9024, name: "Cameroon", code: "CMR", logo: flag("cm"), available: false },
  { id: 9025, name: "Ghana", code: "GHA", logo: flag("gh"), available: false },
  { id: 9026, name: "Tunisia", code: "TUN", logo: flag("tn"), available: false },
  { id: 9027, name: "Costa Rica", code: "CRC", logo: flag("cr"), available: false },
  { id: 9028, name: "Canada", code: "CAN", logo: flag("ca"), available: false },
  { id: 9029, name: "Saudi Arabia", code: "KSA", logo: flag("sa"), available: false },
  { id: 9030, name: "Iran", code: "IRN", logo: flag("ir"), available: false },
  { id: 9031, name: "Qatar", code: "QAT", logo: flag("qa"), available: false },
];

// helper to convert deg to rad
const deg2rad = (deg: number) => (deg * Math.PI) / 180;

// generate SVG arc slice path
function slicePath(
  index: number,
  total: number,
  R = 290,
  r = 200,
  cx = 300,
  cy = 300
) {
  const gap = 2; // degrees of gap between slices
  const slice = 360 / total - gap;
  // Center the first slice at the top (subtract 90 degrees)
  const start = index * (360 / total) - slice / 2 - 90;
  const end = start + slice;

  const largeArc = slice > 180 ? 1 : 0;

  const x1 = cx + R * Math.cos(deg2rad(start));
  const y1 = cy + R * Math.sin(deg2rad(start));
  const x2 = cx + R * Math.cos(deg2rad(end));
  const y2 = cy + R * Math.sin(deg2rad(end));

  const x3 = cx + r * Math.cos(deg2rad(end));
  const y3 = cy + r * Math.sin(deg2rad(end));
  const x4 = cx + r * Math.cos(deg2rad(start));
  const y4 = cy + r * Math.sin(deg2rad(start));

  return `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${r} ${r} 0 ${largeArc} 0 ${x4} ${y4} Z`;
}

function logoPosition(index: number, total: number, radius = 250, size = 64) {
  const slice = 360 / total;
  const angle = index * slice - 90; // Start at top
  const cx = 300 + radius * Math.cos(deg2rad(angle));
  const cy = 300 + radius * Math.sin(deg2rad(angle));
  return { x: cx - size / 2, y: cy - size / 2 };
}

// Team type definition for the wheel UI
interface Team {
  id: number;
  name: string;
  code: string;
  logo: string;
  available?: boolean;
}

export default function TeamSelection() {
  const [teams] = useState<Team[]>(worldCupTeams);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);
  const router = useRouter();

  const totalTeams = teams.length;

  // handle rotation
  const selectPrev = () =>
    setSelectedIndex((prev) => (prev - 1 + totalTeams) % totalTeams);
  const selectNext = () => setSelectedIndex((prev) => (prev + 1) % totalTeams);

  const selectedTeam = teams[selectedIndex];

  const handleTeamSelect = (teamId: number) => {
    const t = teams.find((x) => x.id === teamId);
    if (t?.available) router.push(`/player?team=${teamId}`);
  };

  const handleExplorePlayer = () => {
    if (selectedTeam?.available) {
      router.push(`/player?team=${selectedTeam.id}`);
    }
  };

  return (
    <main className="relative  flex flex-col items-center justify-start text-white overflow-hidden font-sans px-4 sm:px-8">
      {/* Textured background overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522509589783-7b2a85a04e9a?auto=format&fit=crop&w=1920&q=60')] bg-cover opacity-10 mix-blend-soft-light" />

      <div className="relative z-10 flex flex-col w-full  items-center justify-center min-h-screen">
        {loading && <Loader size="lg" />}
        {error && <div className="text-red-500">{error}</div>}
        {!loading && !error && teams.length > 0 && (
          <div className="flex flex-col items-center justify-center w-full max-w-6xl">
            {/* Left Arrow */}
            <div className="absolute left-[300px]  -translate-y-1/2 z-20 ml-4">
              <button
                onClick={selectPrev}
                aria-label="Previous Team"
                className="w-12 h-12 flex items-center justify-center bg-zinc-800/80 border border-red-500/50 hover:bg-red-500/20 hover:border-red-400 transition-all duration-300 rounded-lg backdrop-blur-sm"
              >
                <ArrowLeft className="w-6 h-6 text-red-400 hover:text-red-300 transition-colors" />
              </button>
            </div>

            {/* Right Arrow */}
            <div className="absolute right-[300px]  -translate-y-1/2 z-20 mr-4">
              <button
                onClick={selectNext}
                aria-label="Next Team"
                className="w-12 h-12 flex items-center justify-center bg-zinc-800/80 border border-red-500/50 hover:bg-red-500/20 hover:border-red-400 transition-all duration-300 rounded-lg backdrop-blur-sm"
              >
                <ArrowRight className="w-6 h-6 text-red-400 hover:text-red-300 transition-colors" />
              </button>
            </div>

            {/* Center: Wheel with Team Name Inside */}
            <div className="flex flex-col items-center justify-center relative">
              <svg
                width={600}
                height={600}
                viewBox="0 0 600 600"
                className="drop-shadow-[0_0_40px_rgba(0,0,0,0.7)]"
              >
                {/* Wheel slices and logos */}
                {teams.map((team, idx) => {
                  const path = slicePath(idx, totalTeams, 290, 200, 300, 300);
                  const imgPos = logoPosition(idx, totalTeams, 250, 64);
                  const isSelected = idx === selectedIndex;
                  
                  return (
                    <g
                      key={team.id}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => handleTeamSelect(team.id)}
                      className="cursor-pointer"
                    >
                      <path
                        d={path}
                        fill="rgba(255,255,255,0.12)"
                        stroke={
                          isSelected
                            ? "rgb(207, 10, 10)"
                            : "rgba(0,0,0,0.4)"
                        }
                        strokeWidth={isSelected ? 6 : 3}
                      />
                      <motion.image
                        href={team.logo}
                        xlinkHref={team.logo}
                        x={imgPos.x}
                        y={imgPos.y}
                        width={64}
                        height={64}
                        animate={{
                          scale: isSelected ? 0.9 : 0.7,
                        }}
                        transition={{ duration: 0.3 }}
                        style={{ 
                          pointerEvents: "none",
                          transformOrigin: "center"
                        }}
                      />
                    </g>
                  );
                })}
                {/* Centered selected team logo */}
                {selectedTeam && (
                  <motion.image
                    key={selectedTeam.logo}
                    href={selectedTeam.logo}
                    xlinkHref={selectedTeam.logo}
                    x={240}
                    y={200}
                    width={120}
                    height={120}
                    style={{ pointerEvents: "none" }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.2 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                  />
                )}
              </svg>

              {/* Team Name Inside Circle */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center z-10">
                <motion.h1
                  key={selectedTeam.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-2xl sm:text-3xl font-thin uppercase text-white drop-shadow-lg mt-30"
                  style={{ letterSpacing: "-0.03em" }}
                >
                  {selectedTeam.name}
                </motion.h1>
              </div>
            </div>

            {/* Bottom: Explore Player Button */}
            <div className="mt-8 flex flex-col items-center gap-3">
              <button
                onClick={handleExplorePlayer}
                disabled={!selectedTeam?.available}
                className={`relative h-12 px-8 py-2 font-mono font-bold uppercase tracking-wide overflow-hidden group ${
                  selectedTeam?.available
                    ? "text-white cursor-pointer"
                    : "text-zinc-500 cursor-not-allowed opacity-50"
                }`}
                style={{
                  background: "linear-gradient(90deg, rgba(207, 10, 10, 0.2) 0%, rgba(207, 10, 10, 0.4) 100%)",
                  border: "1px solid rgba(207, 10, 10, 0.5)",
                  boxShadow: selectedTeam?.available
                    ? "0 0 20px rgba(207, 10, 10, 0.4)"
                    : "none",
                }}
              >
                <span className="relative z-10">
                  {selectedTeam?.available ? "Explore Player" : "Locked"}
                </span>
                {selectedTeam?.available && (
                  <div className="absolute inset-0 bg-red-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                )}
              </button>
              {!selectedTeam?.available && (
                <p className="text-xs text-zinc-400 text-center max-w-xs">
                  Only <span className="text-red-400 font-semibold">Argentina</span> is
                  available for testing on testnet. More teams coming soon.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
