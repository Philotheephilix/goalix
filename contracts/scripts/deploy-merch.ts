import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("Starting Merch contract deployment...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy MerchNFT contract
  console.log("\nDeploying MerchNFT contract...");
  const MerchNFT = await ethers.getContractFactory("MerchNFT");
  const merchNFT = await MerchNFT.deploy("Player Merchandise NFT", "PMERCH");

  // Wait for deployment
  await merchNFT.waitForDeployment();
  const merchAddress = await merchNFT.getAddress();

  console.log("✅ MerchNFT deployed to:", merchAddress);

  // Get deployment transaction details
  const deploymentTx = merchNFT.deploymentTransaction();
  console.log("Deployment transaction hash:", deploymentTx?.hash);

  // Verify the contract is deployed correctly
  console.log("Contract deployed successfully by:", deployer.address);
}

// Error handling
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
