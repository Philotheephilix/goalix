import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);

  // Deploy only the Game contract
  console.log("Deploying GameContractMultiToken...");
  const GameContractMultiToken = await ethers.getContractFactory("GameContractMultiToken");
  const gameContract = await GameContractMultiToken.deploy();
  await gameContract.waitForDeployment();
  const gameContractAddress = await gameContract.getAddress();
  
  console.log("✅ GameContractMultiToken deployed at:", gameContractAddress);
  console.log("📝 Contract address for frontend:", gameContractAddress);
  
  // Save the address to a file for easy access
  const fs = require('fs');
  const deploymentInfo = {
    gameContract: gameContractAddress,
    deployer: deployer.address,
    network: "xlayer",
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync('game-deployment.json', JSON.stringify(deploymentInfo, null, 2));
  console.log("📄 Deployment info saved to game-deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 