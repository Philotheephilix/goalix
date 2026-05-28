"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Lenis from "lenis";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronUp,
  ChevronDown,
  Trophy,
  Zap,
  Activity,
  Ticket,
  Wallet,
  ArrowLeftRight,
  Sparkles,
} from "lucide-react";
import LifecycleDiagram from "./lifecycle-diagram";

const RED = "#CF0A0A";
const RED_HOT = "#FF2A2A";

/* shared reveal */
const reveal = (i = 0) => ({
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.35 },
  transition: { duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] as const },
});

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <motion.span
      {...reveal(0)}
      className="mb-5 inline-block text-xs font-medium uppercase tracking-[0.35em]"
      style={{ color: RED_HOT }}
    >
      {children}
    </motion.span>
  );
}

/* full-viewport slide */
function Slide({
  id,
  children,
  className = "",
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      data-slide={id}
      className={`relative flex min-h-screen w-full items-center justify-center px-6 py-24 md:px-16 ${className}`}
    >
      {/* subtle radial accent per slide */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 40%, rgba(207,10,10,0.10), transparent 70%)",
        }}
      />
      <div className="relative z-10 mx-auto w-full max-w-5xl">{children}</div>
    </section>
  );
}

const SLIDES = [
  "cover",
  "problem",
  "solution",
  "lifecycle",
  "whynow",
  "features",
  "tokenomics",
  "pricing",
  "tvl",
  "onboarding",
  "okx",
  "season",
  "product",
  "vision",
];

export default function PitchPage() {
  const lenisRef = useRef<Lenis | null>(null);
  const [active, setActive] = useState(0);

  /* Lenis smooth scroll */
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    lenisRef.current = lenis;
    let raf = 0;
    const loop = (t: number) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    lenis.on("scroll", () => {
      const mid = window.innerHeight / 2;
      let cur = 0;
      SLIDES.forEach((id, i) => {
        const el = document.querySelector<HTMLElement>(`[data-slide="${id}"]`);
        if (el && el.getBoundingClientRect().top <= mid) cur = i;
      });
      setActive(cur);
    });

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  const goTo = useCallback((i: number) => {
    const idx = Math.max(0, Math.min(SLIDES.length - 1, i));
    const el = document.querySelector<HTMLElement>(`[data-slide="${SLIDES[idx]}"]`);
    if (el && lenisRef.current) lenisRef.current.scrollTo(el, { offset: 0, duration: 1.2 });
  }, []);

  /* keyboard nav */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowDown", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        goTo(active + 1);
      } else if (["ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        goTo(active - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, goTo]);

  return (
    <main className="relative text-white">
      {/* top bar */}
      <div className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between px-6 py-4 md:px-10">
        <Link href="/" className="text-lg font-bold tracking-tight">
          GOAL<span style={{ color: RED }}>IX</span>
        </Link>
        <span className="hidden text-[10px] uppercase tracking-[0.3em] text-zinc-500 md:block">
          X Cup Hackathon · Pitch
        </span>
      </div>

      {/* progress bar */}
      <div className="fixed left-0 top-0 z-50 h-[3px] w-full bg-transparent">
        <motion.div
          className="h-full"
          style={{ background: RED }}
          animate={{ width: `${(active / (SLIDES.length - 1)) * 100}%` }}
          transition={{ ease: "easeOut", duration: 0.4 }}
        />
      </div>

      {/* side dot nav */}
      <nav className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-2.5 md:flex">
        {SLIDES.map((id, i) => (
          <button
            key={id}
            onClick={() => goTo(i)}
            aria-label={`Go to ${id}`}
            className="group flex items-center gap-2"
          >
            <span className="text-[9px] uppercase tracking-widest text-transparent transition group-hover:text-zinc-400">
              {id}
            </span>
            <span
              className="h-2 w-2 rounded-full border transition-all"
              style={{
                background: i === active ? RED : "transparent",
                borderColor: i === active ? RED : "rgba(255,255,255,0.3)",
                transform: i === active ? "scale(1.3)" : "scale(1)",
              }}
            />
          </button>
        ))}
      </nav>

      {/* prev / next */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2">
        <button
          onClick={() => goTo(active - 1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/40 backdrop-blur transition hover:border-white/40"
          aria-label="Previous slide"
        >
          <ChevronUp size={16} />
        </button>
        <button
          onClick={() => goTo(active + 1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/40 backdrop-blur transition hover:border-white/40"
          aria-label="Next slide"
        >
          <ChevronDown size={16} />
        </button>
      </div>

      {/* slide counter */}
      <div className="fixed bottom-6 left-6 z-40 font-mono text-xs text-zinc-500">
        {String(active + 1).padStart(2, "0")}
        <span className="text-zinc-700"> / {String(SLIDES.length).padStart(2, "0")}</span>
      </div>

      {/* ============ SLIDES ============ */}

      {/* 1 — COVER */}
      <Slide id="cover" className="text-center">
        <motion.div {...reveal(0)} className="mb-6 flex justify-center">
          <Trophy size={40} style={{ color: RED }} />
        </motion.div>
        <motion.h1 {...reveal(1)} className="text-6xl font-extrabold tracking-tight md:text-8xl">
          GOAL<span style={{ color: RED }}>IX</span>
        </motion.h1>
        <motion.p {...reveal(2)} className="mx-auto mt-6 max-w-2xl text-xl text-zinc-300 md:text-2xl">
          Performance-driven fan engagement, built on X Layer.
        </motion.p>
        <motion.p {...reveal(3)} className="mt-3 text-base text-zinc-500">
          Tokenize players as expiring, performance-priced ERC-20s.
        </motion.p>
        <motion.div {...reveal(4)} className="mt-10 flex items-center justify-center gap-2">
          <span className="text-sm uppercase tracking-[0.3em]" style={{ color: RED_HOT }}>
            Back form, not fame
          </span>
        </motion.div>
        <motion.div
          {...reveal(5)}
          className="mt-12 flex animate-pulse items-center justify-center gap-2 text-xs text-zinc-500"
        >
          <ChevronDown size={14} /> Scroll or use arrow keys
        </motion.div>
      </Slide>

      {/* 2 — PROBLEM */}
      <Slide id="problem">
        <Kicker>The Problem</Kicker>
        <motion.h2 {...reveal(1)} className="max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
          Fan tokens reward <span className="text-zinc-500">fame</span> — not{" "}
          <span style={{ color: RED }}>form</span>.
        </motion.h2>
        <motion.p {...reveal(2)} className="mt-6 max-w-2xl text-lg text-zinc-400">
          Tokens are issued at club or league level, but fandom lives at the player and
          tournament level. None of them expire or reprice when a player is injured, benched,
          or out of form.
        </motion.p>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {[
            "No way to back rising or in-form stars",
            "Hype cycles never get monetized",
            "Speculation outweighs engagement",
            "Zero performance correlation",
            "Web2 fans locked out by wallet friction",
          ].map((t, i) => (
            <motion.div
              key={t}
              {...reveal(3 + i * 0.4)}
              className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3"
            >
              <span style={{ color: RED }}>✕</span>
              <span className="text-sm text-zinc-300">{t}</span>
            </motion.div>
          ))}
        </div>
      </Slide>

      {/* 3 — SOLUTION */}
      <Slide id="solution">
        <Kicker>The Solution</Kicker>
        <motion.h2 {...reveal(1)} className="max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
          Expiring, performance-priced{" "}
          <span style={{ color: RED }}>Player Fan Tokens</span>.
        </motion.h2>
        <motion.p {...reveal(2)} className="mt-6 max-w-2xl text-lg text-zinc-400">
          One ERC-20 per player, priced on a bonding curve scaled by a live on-chain
          performance score, minted in a team fan token. Form is the market.
        </motion.p>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { t: "Performance-priced", d: "Form moves the curve" },
            { t: "Ecosystem-backed", d: "Paid in fan tokens, not gas" },
            { t: "Expiring", d: "Burn → claim at season end" },
            { t: "Useful", d: "Games · tickets · merch · rewards" },
          ].map((c, i) => (
            <motion.div
              key={c.t}
              {...reveal(3 + i * 0.4)}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="text-base font-semibold" style={{ color: RED_HOT }}>{c.t}</div>
              <div className="mt-1 text-sm text-zinc-400">{c.d}</div>
            </motion.div>
          ))}
        </div>
      </Slide>

      {/* 4 — TOKEN LIFECYCLE DIAGRAM */}
      <Slide id="lifecycle">
        <div className="text-center">
          <Kicker>Token Lifecycle</Kicker>
          <motion.h2 {...reveal(1)} className="mx-auto max-w-3xl text-3xl font-bold md:text-5xl">
            One token, one season — <span style={{ color: RED }}>self-settling</span>.
          </motion.h2>
        </div>
        <motion.div {...reveal(2)} className="mt-12">
          <LifecycleDiagram />
        </motion.div>
      </Slide>

      {/* 5 — WHY NOW */}
      <Slide id="whynow">
        <Kicker>Why Now</Kicker>
        <motion.h2 {...reveal(1)} className="max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
          The biggest attention event on earth — <span style={{ color: RED }}>now on-chain</span>.
        </motion.h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {[
            { t: "Tournament hype", d: "World Cup onboards millions of fans at once" },
            { t: "Oracles mature", d: "Real-time sports data, daily on-chain" },
            { t: "X Layer + OKX", d: "Deep liquidity + a fan-scale distribution rail" },
            { t: "Invisible wallets", d: "Privy removes the seed-phrase barrier" },
          ].map((c, i) => (
            <motion.div key={c.t} {...reveal(2 + i * 0.4)} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-base font-semibold" style={{ color: RED_HOT }}>{c.t}</div>
              <div className="mt-1 text-sm text-zinc-400">{c.d}</div>
            </motion.div>
          ))}
        </div>
      </Slide>

      {/* 6 — CORE FEATURES */}
      <Slide id="features">
        <Kicker>Core Features</Kicker>
        <motion.h2 {...reveal(1)} className="text-4xl font-bold md:text-5xl">
          A live market around player narratives.
        </motion.h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            { icon: Zap, t: "Performance bonding curve", d: "Goals, assists, momentum, demand" },
            { icon: Activity, t: "Oracle updates", d: "Sports APIs push stats daily" },
            { icon: Ticket, t: "Utility layer", d: "Tickets · merch · staking · PvP" },
            { icon: Trophy, t: "PvP fantasy", d: "Stake 5 players, form decides" },
            { icon: ArrowLeftRight, t: "Expiring cycles", d: "Continuous liquidity rotation" },
            { icon: Sparkles, t: "Collectibles", d: "Legacy mode for retired stars" },
          ].map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div key={c.t} {...reveal(2 + i * 0.3)} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <Icon size={22} style={{ color: RED }} />
                <div className="mt-3 text-base font-semibold text-white">{c.t}</div>
                <div className="mt-1 text-sm text-zinc-400">{c.d}</div>
              </motion.div>
            );
          })}
        </div>
      </Slide>

      {/* 7 — TOKENOMICS */}
      <Slide id="tokenomics">
        <Kicker>Tokenomics</Kicker>
        <motion.h2 {...reveal(1)} className="text-4xl font-bold md:text-5xl">
          A three-tier stack keeps value in the ecosystem.
        </motion.h2>
        <div className="mt-12 flex flex-col items-center gap-3">
          {[
            { sym: "OKB", note: "X Layer native — gas", w: "w-full max-w-2xl", c: "#E8B923" },
            { sym: "ARG", note: "Team Fan Token — minting currency", w: "w-full max-w-xl", c: "#6CA0DC" },
            { sym: "LCUC / LMAR / ÁHER", note: "Player Fan Tokens — performance-priced, expiring", w: "w-full max-w-md", c: RED_HOT },
          ].map((t, i) => (
            <motion.div
              key={t.sym}
              {...reveal(2 + i * 0.5)}
              className={`${t.w} rounded-xl border px-6 py-4 text-center`}
              style={{ borderColor: `${t.c}55`, background: `${t.c}12` }}
            >
              <div className="text-lg font-bold" style={{ color: t.c }}>{t.sym}</div>
              <div className="text-sm text-zinc-400">{t.note}</div>
            </motion.div>
          ))}
          <motion.p {...reveal(4)} className="mt-4 text-sm text-zinc-500">
            Fans mint player tokens with fan tokens → aligned liquidity, real ecosystem demand.
          </motion.p>
        </div>
      </Slide>

      {/* 8 — PRICING */}
      <Slide id="pricing">
        <Kicker>Pricing Mechanics</Kicker>
        <motion.h2 {...reveal(1)} className="text-4xl font-bold md:text-5xl">
          Demand <span className="text-zinc-500">and</span> form move the curve.
        </motion.h2>
        <motion.div {...reveal(2)} className="mt-8 rounded-xl border border-white/10 bg-black/40 p-5 font-mono text-sm text-zinc-300">
          unitPrice = basePrice × (performance / 10) × ( 1 + demand / (reserve + 1) )
        </motion.div>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <motion.div {...reveal(3)} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <div className="text-base font-semibold" style={{ color: RED_HOT }}>Supply &amp; demand</div>
            <p className="mt-2 text-sm text-zinc-400">
              Each token sold raises the next price — early backers ride the momentum, liquidity deepens around trending players.
            </p>
          </motion.div>
          <motion.div {...reveal(3.4)} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <div className="text-base font-semibold" style={{ color: RED_HOT }}>Performance</div>
            <p className="mt-2 text-sm text-zinc-400">
              Goals, assists, ratings, knockout momentum push value up. Injury or inactivity drags it down. Same score decides PvP.
            </p>
          </motion.div>
        </div>
      </Slide>

      {/* 9 — TVL */}
      <Slide id="tvl">
        <Kicker>Growth on X Layer</Kicker>
        <motion.h2 {...reveal(1)} className="text-4xl font-bold md:text-5xl">
          Liquidity <span style={{ color: RED }}>rotates</span>, it doesn&apos;t exit.
        </motion.h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {[
            { t: "Locked liquidity", d: "Minting locks fan tokens into pools" },
            { t: "High-frequency trading", d: "Live matches drive real-time volume" },
            { t: "Event-based inflow", d: "Global tournaments onboard millions" },
            { t: "Remint, don't exit", d: "Expiry rotates capital into fresh pools" },
          ].map((c, i) => (
            <motion.div key={c.t} {...reveal(2 + i * 0.4)} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-base font-semibold" style={{ color: RED_HOT }}>{c.t}</div>
              <div className="mt-1 text-sm text-zinc-400">{c.d}</div>
            </motion.div>
          ))}
        </div>
      </Slide>

      {/* 10 — ONBOARDING */}
      <Slide id="onboarding">
        <Kicker>Web2 → Web3</Kicker>
        <motion.h2 {...reveal(1)} className="max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
          Fans join without ever seeing a seed phrase.
        </motion.h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <motion.div {...reveal(2)} className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
            <Wallet size={22} style={{ color: RED }} />
            <div className="mt-3 text-lg font-semibold">Privy embedded wallets</div>
            <ul className="mt-3 space-y-1.5 text-sm text-zinc-400">
              <li>· Social / email / Google login</li>
              <li>· Invisible wallet creation</li>
              <li>· Mobile-first, no key management</li>
            </ul>
          </motion.div>
          <motion.div {...reveal(2.4)} className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
            <ArrowLeftRight size={22} style={{ color: RED }} />
            <div className="mt-3 text-lg font-semibold">Fiat on-ramp</div>
            <ul className="mt-3 space-y-1.5 text-sm text-zinc-400">
              <li>· Buy with card or local methods</li>
              <li>· Enter from a broadcast or campaign</li>
              <li>· Fiat → ecosystem asset instantly</li>
            </ul>
          </motion.div>
        </div>
      </Slide>

      {/* 11 — OKX */}
      <Slide id="okx" className="text-center">
        <Kicker>Powered by OKX</Kicker>
        <motion.h2 {...reveal(1)} className="mx-auto max-w-3xl text-4xl font-bold md:text-5xl">
          Trade player narratives in real time.
        </motion.h2>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {["Deep liquidity", "Low-slippage swaps", "Fast execution", "Cross-ecosystem routing", "Tournament-scale volume"].map((t, i) => (
            <motion.span
              key={t}
              {...reveal(2 + i * 0.3)}
              className="rounded-full border px-5 py-2 text-sm"
              style={{ borderColor: `${RED}55`, background: `${RED}12`, color: "#fff" }}
            >
              {t}
            </motion.span>
          ))}
        </div>
        <motion.p {...reveal(4)} className="mx-auto mt-8 max-w-xl text-sm text-zinc-500">
          OKX becomes the liquidity + distribution layer; Goalix supplies the performance-priced assets and the fan demand.
        </motion.p>
      </Slide>

      {/* 12 — SEASON LIFECYCLE */}
      <Slide id="season">
        <Kicker>Season &amp; Tournament Lifecycle</Kicker>
        <motion.h2 {...reveal(1)} className="text-4xl font-bold md:text-5xl">
          The ecosystem stays performance-driven.
        </motion.h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {[
            { t: "Continues", d: "New token minted next season, fresh stats" },
            { t: "Transfers", d: "Old token expires, liquidity rotates" },
            { t: "Long injury", d: "Yield & valuation adjust to inactivity" },
            { t: "Retirement", d: "Legacy collectible — burn for rare rewards" },
          ].map((c, i) => (
            <motion.div key={c.t} {...reveal(2 + i * 0.4)} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-base font-semibold" style={{ color: RED_HOT }}>{c.t}</div>
              <div className="mt-1 text-sm text-zinc-400">{c.d}</div>
            </motion.div>
          ))}
        </div>
      </Slide>

      {/* 13 — PRODUCT */}
      <Slide id="product">
        <Kicker>Live Product</Kicker>
        <motion.h2 {...reveal(1)} className="text-4xl font-bold md:text-5xl">
          Not a deck — the full loop runs on X Layer today.
        </motion.h2>
        <motion.p {...reveal(2)} className="mt-3 text-sm text-zinc-400">
          World Cup 2022 · Argentina squad · 20 player tokens live on chainId 1952.
        </motion.p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { src: "/screenshots/marketplace.png", t: "Marketplace" },
            { src: "/screenshots/player-performance.png", t: "Performance analysis" },
            { src: "/screenshots/pvp-game.png", t: "PvP game" },
            { src: "/screenshots/buy-modal.png", t: "Buy on the curve" },
            { src: "/screenshots/portfolio-claim.png", t: "Portfolio & claim" },
            { src: "/screenshots/leagues.png", t: "Leagues" },
          ].map((s, i) => (
            <motion.div
              key={s.src}
              {...reveal(3 + i * 0.25)}
              className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]"
            >
              <div className="relative aspect-video w-full">
                <Image src={s.src} alt={s.t} fill className="object-cover" sizes="(max-width:768px) 100vw, 33vw" />
              </div>
              <div className="px-3 py-2 text-xs text-zinc-400">{s.t}</div>
            </motion.div>
          ))}
        </div>
      </Slide>

      {/* 14 — VISION / CTA */}
      <Slide id="vision" className="text-center">
        <Kicker>Vision</Kicker>
        <motion.h2 {...reveal(1)} className="mx-auto max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
          The sports-engagement protocol on{" "}
          <span style={{ color: RED }}>X Layer</span>.
        </motion.h2>
        <motion.p {...reveal(2)} className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400">
          Performance-driven, utility-backed, community-owned, tournament-aware. Every football
          moment becomes an on-chain growth engine.
        </motion.p>
        <motion.div {...reveal(3)} className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/leagues"
            className="rounded-full px-7 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ background: RED }}
          >
            Launch the app
          </Link>
          <Link
            href="/marketplace"
            className="rounded-full border border-white/20 px-7 py-3 text-sm font-semibold text-white transition hover:border-white/40"
          >
            Explore tokens
          </Link>
        </motion.div>
        <motion.p {...reveal(4)} className="mt-12 text-lg italic" style={{ color: RED_HOT }}>
          Back form, not fame.
        </motion.p>
      </Slide>
    </main>
  );
}
