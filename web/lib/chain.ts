import { defineChain } from "viem";

// X Layer Testnet — live chainId is 1952 (0x7a0), NOT 195 as some lists show.
// viem's built-in `xLayerTestnet` is 195, so we define our own.
export const xLayerTestnet = defineChain({
  id: 1952,
  name: "X Layer Testnet",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testrpc.xlayer.tech"] },
  },
  blockExplorers: {
    default: { name: "OKLink", url: "https://www.oklink.com/xlayer-test" },
  },
  testnet: true,
});
