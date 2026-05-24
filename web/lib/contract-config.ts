// Contract configuration
// Update these addresses when deploying new contracts

export const CONTRACT_CONFIG = {
  // Game contract address - update this when deploying a new game contract
  GAME_CONTRACT_ADDRESS: "0x838859Db205e129B87d8a3795476A11af6BB7efA",
  
  // Network configuration
  NETWORK: {
    name: "X Layer Testnet",
    chainId: 1952,
    rpcUrl: "https://testrpc.xlayer.tech"
  },
  
  // Game constants (should match the smart contract)
  GAME_CONSTANTS: {
    TOKENS_PER_CONTRACT: 200,
    CONTRACT_COUNT: 5
  }
};

// Helper function to validate contract address
export function isValidContractAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Helper function to get contract address with validation
export function getGameContractAddress(): string {
  const address = CONTRACT_CONFIG.GAME_CONTRACT_ADDRESS;
  if (!isValidContractAddress(address)) {
    throw new Error(`Invalid game contract address: ${address}`);
  }
  return address;
} 