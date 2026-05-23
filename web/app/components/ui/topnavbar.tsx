"use client";

import Link from "next/link";
import { Button } from "./button";
import { Trophy } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CustomConnectButton } from "../ConnectButton";
import FanTokenFaucet from "../FanTokenFaucet";

// Custom hook to detect FootballScene state
function useFootballSceneState() {
  const [isFootballSceneActive, setIsFootballSceneActive] = useState(false);
  const [animationCompleted, setAnimationCompleted] = useState(false);

  useEffect(() => {
    // Listen for custom events from FootballScene
    const handleFootballSceneStart = () => {
      setIsFootballSceneActive(true);
      setAnimationCompleted(false);
    };
    const handleFootballSceneEnd = () => {
      setIsFootballSceneActive(false);
      // Set animation completed immediately when FootballScene ends
      setAnimationCompleted(true);
    };

    window.addEventListener("football-scene-start", handleFootballSceneStart);
    window.addEventListener("football-scene-end", handleFootballSceneEnd);

    return () => {
      window.removeEventListener(
        "football-scene-start",
        handleFootballSceneStart
      );
      window.removeEventListener("football-scene-end", handleFootballSceneEnd);
    };
  }, []);

  return { isFootballSceneActive, animationCompleted };
}

// Custom hook to detect scroll position and section
function useScrollSection() {
  const [currentSection, setCurrentSection] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const section = Math.floor(scrollY / windowHeight);
      setCurrentSection(section);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return currentSection;
}

export default function TopNav() {
  const pathname = usePathname();
  const { isFootballSceneActive, animationCompleted } = useFootballSceneState();
  const currentSection = useScrollSection();
  const [faucetOpen, setFaucetOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState("");

  // Hide navbar completely on landing page (/) and on /game/battle
  const shouldShowNavbar = pathname !== "/" && pathname !== "/game/battle";

  return (
    <AnimatePresence>
      {shouldShowNavbar && (
        <motion.nav
          className="relative z-50 w-full fixed top-0 left-0 right-0"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{
            duration: 0.8,
            ease: "easeOut",
            delay: 0,
          }}
        >
          <div className=" flex items-center justify-between">
            {/* Left Section: Logo */}
            <div
              className="relative bg-zinc-900 px-6 py-3 shadow-lg border border-zinc-800/50 flex items-center space-x-2"
              style={{
                clipPath: "polygon(0% 0%, 90% 0%, 100% 50%, 90% 100%, 0% 100%)",
                boxShadow:
                  "0 0 15px rgba(207, 10, 10, 0.2), inset 0 0 8px rgba(207, 10, 10, 0.1)",
              }}
            >
              <span className="text-lg font-mono font-semibold text-white tracking-widest">
                {" "}
                SCORE
              </span>
              <span className=" ml-[-8px] text-lg font-mono font-semibold text-red-600 tracking-widest">
                {" "}
                Z
              </span>
            </div>

            {/* Right Section: Navigation Links and Play Now Button */}
            <div className="flex items-center space-x-0">
              <div
                className="relative bg-zinc-900 px-8 py-3 shadow-lg border border-zinc-800/50 flex items-center space-x-8"
                style={{
                  clipPath: "polygon(0% 0%, 100% 0%, 95% 100%, 0% 100%)",
                  boxShadow:
                    "0 0 15px rgba(207, 10, 10, 0.2), inset 0 0 8px rgba(207, 10, 10, 0.1)",
                }}
              >
                <Link
                  href="/leagues"
                  className="text-red-400 hover:text-white transition-colors font-mono font-medium tracking-wide uppercase"
                >
                  Leagues
                </Link>
                <Link
                  href="/marketplace"
                  className="text-zinc-400 hover:text-white transition-colors font-mono font-medium tracking-wide uppercase"
                >
                  Marketplace
                </Link>
                <Link
                  href="/claim"
                  className="text-zinc-400 hover:text-white transition-colors font-mono font-medium tracking-wide uppercase"
                >
                  Profile
                </Link>
                <Link
                  href="/game"
                  className="text-zinc-400 hover:text-white transition-colors font-mono font-medium tracking-wide uppercase"
                >
                  Game
                </Link>
                <Link
                  href="/tickets"
                  className="text-zinc-400 hover:text-white transition-colors font-mono font-medium tracking-wide uppercase"
                >
                  Tickets
                </Link>
                <Button
                  className="ml-2 mr-2  text-white font-bold rounded-lg hover:bg-[#a30808] transition-all"
                  onClick={() => setFaucetOpen(true)}
                >
                  Faucet
                </Button>
              </div>

              {/* Faucet Button */}

              {/* Connect Button with custom shape */}
              <CustomConnectButton />
            </div>
          </div>
          {/* FanTokenFaucet Dialog */}
          <FanTokenFaucet
            open={faucetOpen}
            onOpenChange={setFaucetOpen}
            selectedTeam={selectedTeam}
            setSelectedTeam={setSelectedTeam}
          />
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
