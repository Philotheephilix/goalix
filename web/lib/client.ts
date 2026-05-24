import { createPublicClient, http } from "viem";
import { xLayerTestnet } from "./chain";

// Public client for reads (server + client safe), on X Layer testnet.
// Writes go through wagmi's useWalletClient() (Privy-connected account),
// not a module-level wallet client.
export const client = createPublicClient({
  chain: xLayerTestnet,
  transport: http("https://testrpc.xlayer.tech"),
});
