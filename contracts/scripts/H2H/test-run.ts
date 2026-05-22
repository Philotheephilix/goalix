import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { abi as GameContractMultiTokenABI } from '../../artifacts/contracts/Game.sol/GameContractMultiToken.json';

const ERC20_ABI = [
    "function approve(address spender, uint256 amount) public returns (bool)"
];

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deployer address:", deployer.address);

    // Instead of reading from deployment summary, deploy mock PlayerToken contracts for testing
    const playerTokenAddresses: string[] = [];
    const PlayerToken = await ethers.getContractFactory("PlayerToken");
    for (let i = 0; i < 10; i++) {
        const playerToken = await PlayerToken.deploy(
            `PlayerToken${i+1}`,
            `PT${i+1}`,
            deployer.address // Use deployer as paymentToken for demo
        );
        await playerToken.waitForDeployment();
        playerTokenAddresses.push(await playerToken.getAddress());
    }
    console.log("Deployed PlayerToken addresses:", playerTokenAddresses);

    // Use these addresses for the rest of the script
    const tokenAddresses = playerTokenAddresses;

    console.log("Using token addresses:", tokenAddresses);

    // Create two new random accounts for testing
    const userA = ethers.Wallet.createRandom();
    const userB = ethers.Wallet.createRandom();
    
    console.log("User A address:", userA.address);
    console.log("User B address:", userB.address);

    // Fund the new accounts with gas
    const fundingAmount = ethers.parseEther("15.0");
    
    const fundUserATx = await deployer.sendTransaction({
        to: userA.address,
        value: fundingAmount
    });
    await fundUserATx.wait();
    console.log("Sent 15.0 ETH to", userA.address, "for gas fees");
    
    const fundUserBTx = await deployer.sendTransaction({
        to: userB.address,
        value: fundingAmount
    });
    await fundUserBTx.wait();
    console.log("Sent 15.0 ETH to", userB.address, "for gas fees");

    // Connect the new accounts to the provider
    const provider = ethers.provider;
    const userASigner = userA.connect(provider);
    const userBSigner = userB.connect(provider);

    // Always deploy a new GameContractMultiToken contract on each run
    const GameContractMultiToken = await ethers.getContractFactory("GameContractMultiToken");
    console.log("Deploying new GameContractMultiToken...");
    const gameContract = await GameContractMultiToken.deploy();
    await gameContract.waitForDeployment();
    const gameContractAddress = await gameContract.getAddress();
    console.log("GameContractMultiToken deployed at:", gameContractAddress);

    // Use the ABI for all further interactions
    const gameContractTyped = new ethers.Contract(gameContractAddress, GameContractMultiTokenABI, provider);

    // Mint tokens for both users on all PlayerToken contracts
    console.log("Minting tokens for User A on PlayerToken contracts...");
    for (const tokenAddress of tokenAddresses) {
        try {
            const tokenContract = await ethers.getContractAt("PlayerToken", tokenAddress);
            const mintTx = await tokenContract.mint(userA.address, 1000);
            await mintTx.wait();
            console.log("Minted 1000 tokens for User A on", tokenAddress);
        } catch (error: any) {
            console.log("Failed to mint for User A on", tokenAddress, ":", error.message);
        }
    }

    console.log("Minting tokens for User B on PlayerToken contracts...");
    for (const tokenAddress of tokenAddresses) {
        try {
            const tokenContract = await ethers.getContractAt("PlayerToken", tokenAddress);
            const mintTx = await tokenContract.mint(userB.address, 1000);
            await mintTx.wait();
            console.log("Minted 1000 tokens for User B on", tokenAddress);
        } catch (error: any) {
            console.log("Failed to mint for User B on", tokenAddress, ":", error.message);
        }
    }

    // Approve tokens for the game contract for both users and all tokens they will use
    const creatorTokenAddresses = tokenAddresses.slice(0, 5); // User A's tokens
    const joinerTokenAddresses = tokenAddresses.slice(5, 10); // User B's tokens
    const approveAmount = 200;

    console.log("Approving tokens for User A...");
    for (const tokenAddress of creatorTokenAddresses) {
        // Use ethers.Contract directly for approve
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, userASigner);
        const approveTx = await tokenContract.approve(gameContractAddress, approveAmount);
        await approveTx.wait();
        console.log(`User A approved ${approveAmount} tokens for ${tokenAddress}`);
    }

    console.log("Approving tokens for User B...");
    for (const tokenAddress of joinerTokenAddresses) {
        // Use ethers.Contract directly for approve
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, userBSigner);
        const approveTx = await tokenContract.approve(gameContractAddress, approveAmount);
        await approveTx.wait();
        console.log(`User B approved ${approveAmount} tokens for ${tokenAddress}`);
    }

    // Check if users are already in games
    console.log("Checking if users are already in games...");
    const userAGameCode = await gameContractTyped.userToGameCode(userA.address);
    const userBGameCode = await gameContractTyped.userToGameCode(userB.address);
    
    if (userAGameCode !== ethers.ZeroHash) {
        console.log("User A is already in a game:", userAGameCode);
    }
    if (userBGameCode !== ethers.ZeroHash) {
        console.log("User B is already in a game:", userBGameCode);
    }

    // Create a game with User A
    console.log("Creating game...");
    console.log("Creator token addresses:", creatorTokenAddresses);
    const createGameTx = await (gameContractTyped as any).connect(userASigner).createGame(creatorTokenAddresses);
    await createGameTx.wait();
    // Always fetch the game code from the mapping
    const gameCode = await (gameContractTyped as any).userToGameCode(userA.address);
    if (!gameCode || gameCode === ethers.ZeroHash) {
        throw new Error("Failed to get valid gameCode from createGame");
    }
    console.log("Game code:", gameCode);

    // Debug: Check game details after creation
    console.log("Checking game details after creation...");
    try {
        const gameDetails = await (gameContractTyped as any).getGameDetails(gameCode);
        console.log("Game details after creation:", gameDetails);
    } catch (error: any) {
        console.log("Error getting game details:", error.message);
    }

    // Join the game with User B
    console.log("Joining game...");
    console.log("Joiner token addresses:", joinerTokenAddresses);
    try {
        const joinGameTx = await (gameContractTyped as any).connect(userBSigner).joinGame(gameCode, joinerTokenAddresses);
        await joinGameTx.wait();
        console.log("Game joined successfully!");
    } catch (error: any) {
        console.log("Error joining game:", error.message);
        // Try to get more details about the game state
        try {
            const gameDetails = await (gameContractTyped as any).getGameDetails(gameCode);
            console.log("Game details when trying to join:", gameDetails);
        } catch (detailsError: any) {
            console.log("Error getting game details:", detailsError.message);
        }
        throw error;
    }

    // Get game details
    const gameDetails = await (gameContractTyped as any).getGameDetails(gameCode);
    console.log("Game details:", gameDetails);

    // Print the winner
    const winner = gameDetails[4];
    if (winner === userA.address) {
        console.log(`Winner: User A (${winner})`);
    } else if (winner === userB.address) {
        console.log(`Winner: User B (${winner})`);
    } else {
        console.log(`Winner: Unknown (${winner})`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });