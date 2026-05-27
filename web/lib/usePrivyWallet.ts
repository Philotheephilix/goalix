"use client";

import { useEffect, useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom } from "viem";
import { xLayerTestnet } from "./chain";

// Sources the connected wallet + a viem WalletClient directly from Privy
// (works for both embedded and external wallets), instead of relying on
// wagmi's useAccount/useWalletClient which don't always sync the Privy account.
// Also ensures the wallet is on X Layer testnet (1952) before use.
export function usePrivyWallet() {
  const { wallets } = useWallets();
  const wallet = wallets?.[0];
  const address = wallet?.address as `0x${string}` | undefined;
  // Loosely typed: viem's generic WalletClient makes writeContract params
  // over-strict at call sites; the runtime client is fully configured.
  const [walletClient, setWalletClient] = useState<any>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!wallet) {
        setWalletClient(null);
        return;
      }
      try {
        await wallet.switchChain(xLayerTestnet.id).catch(() => {});
        const provider = await wallet.getEthereumProvider();
        if (!active) return;
        setWalletClient(
          createWalletClient({
            account: wallet.address as `0x${string}`,
            chain: xLayerTestnet,
            transport: custom(provider),
          })
        );
      } catch {
        if (active) setWalletClient(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [wallet?.address]);

  return { address, walletClient };
}
