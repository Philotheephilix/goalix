import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
  // Load deployment info
  let deploymentInfo;
  try {
    const deploymentData = fs.readFileSync('simple-random-deployment.json', 'utf8');
    deploymentInfo = JSON.parse(deploymentData);
  } catch (error) {
    console.error("❌ Could not load deployment info. Please run deploy-simple-random.ts first.");
    process.exit(1);
  }

  const [signer] = await ethers.getSigners();
  console.log("Testing SimpleRandom contract with account:", signer.address);
  console.log("Contract address:", deploymentInfo.contractAddress);

  // Get contract instance
  const simpleRandom = await ethers.getContractAt("SimpleRandom", deploymentInfo.contractAddress);
  
  console.log("\n🧪 Testing simple random number functionality...");
  
  try {
    // Check if user already has a random number
    const hasRandom = await simpleRandom.hasRandomNumber(signer.address);
    console.log("✅ User has random number:", hasRandom);
    
    if (hasRandom) {
      const existingRandom = await simpleRandom.getRandomNumber(signer.address);
      console.log("✅ Existing random number:", existingRandom);
      console.log("📊 Existing random number (decimal):", BigInt(existingRandom));
    }
    
    // Generate a user random number
    const userRandomNumber = ethers.randomBytes(32);
    console.log("✅ User random number generated:", userRandomNumber);
    
    // Request a new random number
    console.log("🔄 Requesting new random number...");
    const tx = await simpleRandom.requestRandomNumber(userRandomNumber);
    console.log("✅ Request transaction hash:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt?.blockNumber);
    
    // Get the generated random number
    const randomResult = await simpleRandom.getRandomNumber(signer.address);
    console.log("🎉 Random number received:", randomResult);
    console.log("📊 Random number (decimal):", BigInt(randomResult));
    
    // Test getting random number in a range (0-99)
    const randomInRange = await simpleRandom.getRandomNumberInRange(signer.address, 100);
    console.log("🎲 Random number in range (0-99):", randomInRange.toString());
    
    // Test getting random number as uint256
    const randomAsUint = await simpleRandom.getRandomNumberAsUint(signer.address);
    console.log("🔢 Random number as uint256:", randomAsUint.toString());
    
    // Get last request time
    const lastRequestTime = await simpleRandom.getLastRequestTime(signer.address);
    console.log("⏰ Last request time:", new Date(Number(lastRequestTime) * 1000).toISOString());
    
    console.log("\n🎉 Simple random number test completed successfully!");
    
  } catch (error: any) {
    console.error("❌ Simple random number test failed:", error);
    
    if (error.message && error.message.includes("Wait 1 minute")) {
      console.log("\n💡 Tip: You need to wait 1 minute between requests");
    }
  }
}

main().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exitCode = 1;
}); 