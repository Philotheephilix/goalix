import { ethers } from "hardhat";
import { abi as GameContractMultiTokenABI } from '../artifacts/contracts/Game.sol/GameContractMultiToken.json';

// Use the existing contract address from the frontend
const GAME_CONTRACT_ADDRESS = "0x4A5f31B22ff7b0Be8732FEd4f53818Fd6FAa93be";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deployer address:", deployer.address);

    // Connect to existing game contract using ABI
    const gameContract = new ethers.Contract(GAME_CONTRACT_ADDRESS, GameContractMultiTokenABI, deployer);
    console.log("Connected to game contract at:", GAME_CONTRACT_ADDRESS);

    // Check if contract exists and is accessible
    try {
        const contractCount = await gameContract.CONTRACT_COUNT();
        const tokensPerContract = await gameContract.TOKENS_PER_CONTRACT();
        console.log("Contract constants:");
        console.log("- CONTRACT_COUNT:", contractCount.toString());
        console.log("- TOKENS_PER_CONTRACT:", tokensPerContract.toString());
    } catch (error) {
        console.error("Error accessing contract:", error);
        return;
    }

    // Deploy PlayerToken contracts for testing
    const playerTokenAddresses: string[] = [];
    const PlayerToken = await ethers.getContractFactory("PlayerToken");
    
    console.log("\nDeploying PlayerToken contracts...");
    for (let i = 0; i < 10; i++) {
        const playerToken = await PlayerToken.deploy(
            `PlayerToken${i+1}`,
            `PT${i+1}`,
            deployer.address
        );
        await playerToken.waitForDeployment();
        const tokenAddress = await playerToken.getAddress();
        playerTokenAddresses.push(tokenAddress);
        console.log(`PlayerToken${i+1} deployed at: ${tokenAddress}`);
    }

    // Mint tokens for deployer
    console.log("\nMinting tokens for deployer...");
    for (const tokenAddress of playerTokenAddresses) {
        const tokenContract = await ethers.getContractAt("PlayerToken", tokenAddress);
        const mintTx = await tokenContract.mint(deployer.address, 1000);
        await mintTx.wait();
        console.log(`Minted 1000 tokens for deployer on ${tokenAddress}`);
    }

    // Check balances
    console.log("\nChecking balances...");
    for (const tokenAddress of playerTokenAddresses) {
        const tokenContract = await ethers.getContractAt("PlayerToken", tokenAddress);
        const balance = await tokenContract.balanceOf(deployer.address);
        console.log(`Balance on ${tokenAddress}: ${balance.toString()}`);
    }

    // Approve tokens for game contract
    console.log("\nApproving tokens for game contract...");
    const approveAmount = 200;
    for (const tokenAddress of playerTokenAddresses) {
        const tokenContract = await ethers.getContractAt("PlayerToken", tokenAddress);
        const approveTx = await tokenContract.approve(GAME_CONTRACT_ADDRESS, approveAmount);
        await approveTx.wait();
        console.log(`Approved ${approveAmount} tokens for ${tokenAddress}`);
    }

    // Check allowances
    console.log("\nChecking allowances...");
    for (const tokenAddress of playerTokenAddresses) {
        const tokenContract = await ethers.getContractAt("PlayerToken", tokenAddress);
        const allowance = await tokenContract.allowance(deployer.address, GAME_CONTRACT_ADDRESS);
        console.log(`Allowance for ${tokenAddress}: ${allowance.toString()}`);
    }

    // Check if deployer is already in a game
    console.log("\nChecking if deployer is in a game...");
    const userGameCode = await gameContract.userToGameCode(deployer.address);
    if (userGameCode !== ethers.ZeroHash) {
        console.log("Deployer is already in a game:", userGameCode);
        return;
    }

    // Create a game
    console.log("\nCreating game...");
    const creatorTokenAddresses = playerTokenAddresses.slice(0, 5);
    console.log("Creator token addresses:", creatorTokenAddresses);
    
    try {
        const createGameTx = await gameContract.createGame(creatorTokenAddresses);
        await createGameTx.wait();
        console.log("Game created successfully!");
        
        // Get the game code
        const gameCode = await gameContract.userToGameCode(deployer.address);
        console.log("Game code:", gameCode);
        
        // Get game details
        const gameDetails = await gameContract.getGameDetails(gameCode);
        console.log("Game details:", gameDetails);
        
    } catch (error: any) {
        console.error("Error creating game:", error.message);
        return;
    }

    console.log("\n=== TEST COMPLETED ===");
    console.log("Game creation successful!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 