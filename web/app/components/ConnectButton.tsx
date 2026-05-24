"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { usePrivyWallet } from "../../lib/usePrivyWallet";
import { Copy, Check, LogOut } from "lucide-react";

const buttonStyle: React.CSSProperties = {
  background:
    "linear-gradient(90deg, rgba(207, 10, 10, 0.2) 0%, rgba(207, 10, 10, 0.4) 100%)",
  clipPath: "polygon(8% 0%, 100% 0%, 100% 100%, 0% 100%)",
  border: "1px solid rgba(207, 10, 10, 0.5)",
  boxShadow: "0 0 20px rgba(207, 10, 10, 0.4)",
};

function truncate(addr?: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export const CustomConnectButton = () => {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { address } = usePrivyWallet();
  const [copied, setCopied] = useState(false);

  const fullAddress = address ?? user?.wallet?.address;
  const display = truncate(fullAddress);

  const handleCopy = async () => {
    if (!fullAddress) return;
    try {
      await navigator.clipboard.writeText(fullAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div
      {...(!ready && {
        "aria-hidden": true,
        style: { opacity: 0, pointerEvents: "none", userSelect: "none" },
      })}
    >
      {!authenticated ? (
        <button
          onClick={login}
          type="button"
          disabled={!ready}
          className="relative h-12 px-8 py-2 text-white font-mono font-bold uppercase tracking-wide overflow-hidden group"
          style={buttonStyle}
        >
          <span className="relative z-10">Connect Wallet</span>
          <div className="absolute inset-0 bg-red-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
        </button>
      ) : (
        <div className="flex items-center gap-2">
          {/* Address + copy */}
          <button
            onClick={handleCopy}
            type="button"
            title={copied ? "Copied!" : "Copy address"}
            className="relative h-12 px-6 py-2 text-white font-mono font-bold uppercase tracking-wide overflow-hidden group flex items-center gap-2"
            style={buttonStyle}
          >
            <span className="relative z-10">{display || "Wallet"}</span>
            <span className="relative z-10 flex items-center">
              {copied ? (
                <Check size={16} className="text-green-400" />
              ) : (
                <Copy size={16} />
              )}
            </span>
            <div className="absolute inset-0 bg-red-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          </button>
          {/* Disconnect */}
          <button
            onClick={logout}
            type="button"
            title="Disconnect"
            className="relative h-12 px-4 py-2 text-white overflow-hidden group flex items-center"
            style={buttonStyle}
          >
            <LogOut size={18} className="relative z-10" />
            <div className="absolute inset-0 bg-red-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          </button>
        </div>
      )}
    </div>
  );
};
