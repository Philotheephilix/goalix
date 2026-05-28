"use client";

import { motion } from "framer-motion";
import {
  Coins,
  TrendingUp,
  Lock,
  HandCoins,
  Archive,
  Radio,
  type LucideIcon,
} from "lucide-react";

/* ---- palette (matches Goalix brand) ---- */
const RED = "#CF0A0A";
const RED_HOT = "#FF2A2A";
const ARG = "#6CA0DC"; // Argentina light blue
const GOLD = "#E8B923"; // OKB / champion

type Stage = {
  key: string;
  label: string;
  sub: string;
  icon: LucideIcon;
  call: string;
  accent: string;
};

const STAGES: Stage[] = [
  { key: "mint", label: "MINT", sub: "Supply minted to contract", icon: Coins, call: "deploy", accent: ARG },
  { key: "trade", label: "TRADE", sub: "Buy on performance curve", icon: TrendingUp, call: "purchaseTokens()", accent: RED_HOT },
  { key: "end", label: "SEASON END", sub: "Lock · reserve 20% to player", icon: Lock, call: "endSeason()", accent: GOLD },
  { key: "claim", label: "CLAIM", sub: "Burn for 80% pro-rata pool", icon: HandCoins, call: "claim()", accent: RED },
  { key: "legacy", label: "LEGACY", sub: "Collectible · next season mints", icon: Archive, call: "burn → reward", accent: ARG },
];

/* a glowing pulse that travels along a horizontal track */
function Connector({ delay = 0 }: { delay?: number }) {
  return (
    <div className="relative mx-1 hidden h-px min-w-[28px] flex-1 bg-white/12 md:block">
      <motion.span
        className="absolute -top-[3px] h-[7px] w-[7px] rounded-full"
        style={{ background: RED_HOT, boxShadow: `0 0 10px 2px ${RED_HOT}` }}
        animate={{ left: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "linear", delay }}
      />
    </div>
  );
}

function StageCard({ stage, index }: { stage: Stage; index: number }) {
  const Icon = stage.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, delay: 0.12 * index }}
      className="relative flex w-[150px] shrink-0 flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-5 backdrop-blur-sm"
    >
      <motion.div
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: `${stage.accent}1a`, border: `1px solid ${stage.accent}55` }}
        animate={{ boxShadow: [`0 0 0px ${stage.accent}00`, `0 0 18px ${stage.accent}66`, `0 0 0px ${stage.accent}00`] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: index * 0.3 }}
      >
        <Icon size={22} style={{ color: stage.accent }} />
      </motion.div>
      <div className="text-center">
        <div className="text-[13px] font-semibold tracking-[0.15em] text-white">{stage.label}</div>
        <div className="mt-1 text-[11px] leading-tight text-zinc-400">{stage.sub}</div>
      </div>
      <code className="rounded bg-black/40 px-2 py-0.5 text-[10px] text-zinc-500">{stage.call}</code>
    </motion.div>
  );
}

/* feeds into MINT: OKB -> ARG -> PFT */
function TokenStack() {
  const tiers = [
    { sym: "OKB", note: "X Layer gas", color: GOLD },
    { sym: "ARG", note: "Team fan token", color: ARG },
    { sym: "PFT", note: "Player token", color: RED_HOT },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center gap-1"
    >
      <span className="mb-1 text-[10px] uppercase tracking-[0.2em] text-zinc-500">Minting stack</span>
      {tiers.map((t, i) => (
        <div key={t.sym} className="flex flex-col items-center">
          <div
            className="flex w-[120px] items-center justify-between rounded-md border px-3 py-1.5"
            style={{ borderColor: `${t.color}55`, background: `${t.color}12` }}
          >
            <span className="text-xs font-bold" style={{ color: t.color }}>{t.sym}</span>
            <span className="text-[10px] text-zinc-400">{t.note}</span>
          </div>
          {i < tiers.length - 1 && (
            <motion.span
              className="my-0.5 text-zinc-500"
              animate={{ y: [0, 3, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }}
            >
              ↓
            </motion.span>
          )}
        </div>
      ))}
    </motion.div>
  );
}

export default function LifecycleDiagram() {
  return (
    <div className="w-full">
      {/* oracle feedback loop banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.5 }}
        className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5"
      >
        <motion.span
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        >
          <Radio size={14} style={{ color: RED_HOT }} />
        </motion.span>
        <span className="text-[11px] text-zinc-300">
          API-Football oracle reprices <span className="text-white">TRADE</span> daily — live form moves the market
        </span>
      </motion.div>

      <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-stretch lg:justify-center">
        <TokenStack />

        {/* arrow from stack into pipeline */}
        <motion.span
          className="hidden self-center text-zinc-500 lg:block"
          animate={{ x: [0, 4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        >
          →
        </motion.span>

        {/* the lifecycle pipeline */}
        <div className="flex flex-wrap items-center justify-center gap-3 lg:flex-nowrap">
          {STAGES.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <StageCard stage={s} index={i} />
              {i < STAGES.length - 1 && <Connector delay={i * 0.35} />}
            </div>
          ))}
        </div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="mx-auto mt-8 max-w-2xl text-center text-sm text-zinc-400"
      >
        Tokens are <span className="text-white">time-bound and self-settling</span> — no zombie tokens.
        Each tournament starts a clean, fairly-priced market, rotating liquidity instead of letting it exit.
      </motion.p>
    </div>
  );
}
