import { ethers } from "hardhat";
import { PlayerToken as PlayerTokenType } from "../typechain-types/contracts/PlayerToken";
import { ApiFootballAdapter } from "../src/adapter/api-football-adapter";
import * as fs from "fs";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Configuration
const config = {
  leagueId: 61, // Ligue 1
  season: 2024,
  initialSupply: '1000000',
  apiFootballKey: process.env.API_FOOTBALL_KEY || ''
};

// Initialize API adapter
const adapter = new ApiFootballAdapter({
  apiKey: config.apiFootballKey
});

interface RegistryPlayer {
  contractAddress: string;
  playerName: string;
  teamName: string;
  position: string;
  deployedAt: string;
  tokenName: string;
  tokenSymbol: string;
}

interface Registry {
  leagueId: number;
  season: number;
  createdAt: string;
  lastUpdated: string;
  players: Record<number, RegistryPlayer>;
}

/**
 * Load player registry from file
 */
function loadPlayerRegistry(): Registry | null {
  const registryFile = `player-registry-${config.leagueId}-${config.season}.json`;
  
  if (fs.existsSync(registryFile)) {
    try {
      const registry = JSON.parse(fs.readFileSync(registryFile, 'utf8')) as Registry;
      console.log(`📖 Loaded registry with ${Object.keys(registry.players).length} players`);
      return registry;
    } catch (error) {
      console.error('❌ Failed to load registry:', error);
      return null;
    }
  }
  
  console.log('⚠️  No registry file found');
  return null;
}

/**
 * Update only player stats (without initialization and minting)
 */
async function updatePlayerStatsOnly(
  playerToken: PlayerTokenType,
  player: any,
  leagueId: number,
  season: number,
  adapter: ApiFootballAdapter
): Promise<void> {
  const fullName = `${player.firstname} ${player.lastname}`;
  
  // Fetch real player stats from API Football
  console.log(`       📊 Fetching real stats for ${fullName}...`);
  let stats = {
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
      console.log(`       ✅ Using real stats from API Football`);
    } else {
      console.log(`       ⚠️  No API data available, using default stats`);
    }
  } catch (error) {
    console.log(`       ⚠️  API call failed, using default stats`);
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
 * Update player stats for all players in registry
 */
async function updateAllPlayerStats(): Promise<void> {
  console.log('\n🔄 Starting scheduled player stats update...');
  
  const registry = loadPlayerRegistry();
  if (!registry) {
    console.log('❌ No registry available for updates');
    return;
  }

  const playerIds = Object.keys(registry.players);
  console.log(`📊 Found ${playerIds.length} players to update`);

  let successCount = 0;
  let errorCount = 0;

  for (const playerIdStr of playerIds) {
    const playerId = parseInt(playerIdStr);
    const playerData = registry.players[playerId];
    
    try {
      console.log(`\n🔄 Updating stats for ${playerData.playerName} (${playerData.contractAddress})`);
      
      // Get contract instance
      const playerToken = await ethers.getContractAt("PlayerToken", playerData.contractAddress) as PlayerTokenType;
      
      // Create player object for the update function
      const player = {
        player: playerId,
        firstname: playerData.playerName.split(' ')[0] || '',
        lastname: playerData.playerName.split(' ').slice(1).join(' ') || '',
        teamname: playerData.teamName,
        position: playerData.position,
        nationality: '',
        age: 0,
        teamId: 0,
        teamName: playerData.teamName,
        teamCode: '',
        teamCountry: ''
      };

      // Update player stats only (skip initialization and minting)
      await updatePlayerStatsOnly(playerToken, player, config.leagueId, config.season, adapter);
      
      successCount++;
      console.log(`✅ Successfully updated ${playerData.playerName}`);
      
      // Add delay between updates to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      errorCount++;
      console.error(`❌ Failed to update ${playerData.playerName}:`, error);
    }
  }

  console.log(`\n📊 Update Summary:`);
  console.log(`- Total players: ${playerIds.length}`);
  console.log(`- Successful updates: ${successCount}`);
  console.log(`- Failed updates: ${errorCount}`);
  console.log(`- Update completed at: ${new Date().toISOString()}`);
}

// Main execution
async function main() {
  console.log('🚀 Starting Player Stats Update Cron Job');
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  
  try {
    await updateAllPlayerStats();
    console.log('✅ Cron job completed successfully');
  } catch (error) {
    console.error('❌ Cron job failed:', error);
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 