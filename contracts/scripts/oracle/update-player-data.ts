import { ethers } from "hardhat";
import { PlayerToken as PlayerTokenType } from "../../typechain-types/contracts/PlayerToken";
import { ApiFootballAdapter } from "../../src/adapter/api-football-adapter";

interface PlayerStats {
  goals: number;
  assists: number;
  penalties_scored: number;
  shots_total: number;
  shots_on_target: number;
  duels_total: number;
  duels_won: number;
  tackles_total: number;
  appearances: number;
  yellow_cards: number;
  red_cards: number;
  lastUpdated: number;
}

interface PlayerWithTeam {
  player: number;
  firstname: string;
  lastname: string;
  teamname: string;
  position: string;
  nationality: string;
  age: number;
  teamId: number;
  teamName: string;
  teamCode: string;
  teamCountry: string;
}

/**
 * Initialize player token contract with player data
 */
export async function initializePlayerToken(
  playerToken: PlayerTokenType,
  player: PlayerWithTeam,
  leagueName: string,
  season: number,
  initialSupply: string
): Promise<void> {
  const fullName = `${player.firstname} ${player.lastname}`;
  
  console.log(`       🔧 Initializing contract with player data...`);
  try {
    const initializeTx = await playerToken.initialize(
      player.player,
      fullName,
      player.teamname,
      player.position,
      leagueName,
      season.toString(),
      initialSupply,
      { gasLimit: 2000000 } // 2M gas for initialization
    );
    await initializeTx.wait();
    console.log(`       ✅ Contract initialized successfully`);
  } catch (initError) {
    console.error(`       ❌ Initialization failed:`, initError);
    throw initError;
  }
}

/**
 * Mint tokens to the player token contract
 */
export async function mintTokensToContract(
  playerToken: PlayerTokenType,
  tokenAddress: string,
  initialSupply: string
): Promise<void> {
  console.log(`       🪙 Minting tokens to contract...`);
  try {
    const mintTx = await playerToken.mint(tokenAddress, initialSupply, { gasLimit: 1000000 }); // 1M gas for minting
    await mintTx.wait();
    console.log(`       ✅ Tokens minted to contract successfully`);
  } catch (mintError) {
    console.error(`       ❌ Minting failed:`, mintError);
    throw mintError;
  }
}

/**
 * Update player stats from API Football or use mock data
 */
export async function updatePlayerStats(
  playerToken: PlayerTokenType,
  player: PlayerWithTeam,
  leagueId: number,
  season: number,
  adapter: ApiFootballAdapter
): Promise<void> {
  const fullName = `${player.firstname} ${player.lastname}`;
  
  // Fetch real player stats from API Football
  console.log(`       📊 Fetching real stats for ${fullName}...`);
  let stats: PlayerStats = {
    goals: 0,
    assists: 0,
    penalties_scored: 0,
    shots_total: 0,
    shots_on_target: 0,
    duels_total: 0,
    duels_won: 0,
    tackles_total: 0,
    appearances: 0,
    yellow_cards: 0,
    red_cards: 0,
    lastUpdated: Math.floor(Date.now() / 1000),
  };
  
  try {
    const apiPlayerStats = await adapter.fetchPlayerStats(player.player, leagueId, season);
    
    if (apiPlayerStats && apiPlayerStats.statistics.length > 0) {
      const playerStats = apiPlayerStats.statistics[0];
      stats = {
        goals: playerStats.goals.total || 0,
        assists: playerStats.goals.assists || 0,
        penalties_scored: playerStats.penalty.scored || 0,
        shots_total: playerStats.shots.total || 0,
        shots_on_target: playerStats.shots.on || 0,
        duels_total: playerStats.duels.total || 0,
        duels_won: playerStats.duels.won || 0,
        tackles_total: playerStats.tackles.total || 0,
        appearances: playerStats.games.appearences || 0,
        yellow_cards: playerStats.cards.yellow || 0,
        red_cards: playerStats.cards.red || 0,
        lastUpdated: Math.floor(Date.now() / 1000),
      };
      console.log(`✅ Using real stats from API Football`);
    } else {
      console.log(`⚠️  No API data available`);
    }
  } catch (error) {
    console.log(`⚠️  API call failed`);
  }
  
  console.log(`       📊 Updating player stats...`);
  try {
    const statsTx = await playerToken.updatePlayerStats(stats, { gasLimit: 1000000 });
    await statsTx.wait();
    console.log(`       ✅ Player stats updated successfully`);
  } catch (statsError) {
    console.error(`       ❌ Stats update failed:`, statsError);
    throw statsError;
  }
}

/**
 * Complete player data update process
 */
export async function updatePlayerData(
  playerToken: PlayerTokenType,
  player: PlayerWithTeam,
  leagueName: string,
  season: number,
  initialSupply: string,
  leagueId: number,
  adapter: ApiFootballAdapter
): Promise<void> {
  const tokenAddress = await playerToken.getAddress();
  
  // Initialize the contract with player data
  await initializePlayerToken(playerToken, player, leagueName, season, initialSupply);
  
  // Mint tokens to the contract itself
  await mintTokensToContract(playerToken, tokenAddress, initialSupply);
  
  // Update player stats
  await updatePlayerStats(playerToken, player, leagueId, season, adapter);
} 