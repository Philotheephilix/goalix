import { ethers } from "hardhat";
import { PlayerToken as PlayerTokenType } from "../typechain-types/contracts/PlayerToken";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";
import {
  ApiFootballAdapter,
  ApiFootballTeam,
  ApiFootballPlayer,
} from "../src/adapter/api-football-adapter";

// Load environment variables
dotenv.config();

// Type definitions
interface Config {
  leagueId: number;
  season: number;
  apiFootballKey: string;
}

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

interface RegistryPlayer {
  playerId: number;
  playerName: string;
  tokenName: string;
  tokenSymbol: string;
  tokenAddress: string;
  teamId: number;
  teamName: string;
  teamCode: string;
  teamContractAddress: string;
  position: string;
  nationality: string;
  age: number;
  photoUrl: string;
  teamLogoUrl: string;
  teamVenue: {
    name: string;
    city: string;
    capacity: number;
  };
  deploymentTime: string;
  statistics?: {
    appearances: number;
    lineups: number;
    minutes: number;
    number: number;
    rating: string;
    captain: boolean;
    goals: number;
    assists: number;
    saves?: number;
    conceded?: number;
  };
}

interface Registry {
  leagueId: number;
  leagueName: string;
  season: number;
  totalTeams: number;
  totalPlayers: number;
  deployedTokens: number;
  createdAt: string;
  lastUpdated: string;
  players: Record<number, RegistryPlayer>;
}

interface UpdateSummary {
  totalPlayers: number;
  updatedPlayers: number;
  failedUpdates: number;
  leagueId: number;
  leagueName: string;
  season: number;
  updateTime: string;
  updatedPlayersList: Array<{
    playerId: number;
    playerName: string;
    tokenAddress: string;
    changes: string[];
  }>;
}

// League name mapping
const LEAGUE_NAMES: Record<number, string> = {
  74: "Brasileiro Women",
  61: "Ligue 1",
  39: "Premier League",
  140: "La Liga",
  135: "Serie A",
};

async function main() {
  const config: Config = {
    leagueId: 61, // Ligue 1
    season: 2024,
    apiFootballKey: process.env.API_FOOTBALL_KEY || "",
  };

  // Validate required environment variables
  if (!config.apiFootballKey) {
    throw new Error("API_FOOTBALL_KEY environment variable is required");
  }

  console.log("🕐 Starting daily player data update cron job...");
  console.log("Configuration:", {
    leagueId: config.leagueId,
    season: config.season,
    updateTime: new Date().toISOString(),
  });

  // Load registry
  const registryFile = `player-registry-${config.leagueId}-${config.season}.json`;
  const registry = loadRegistry(registryFile);

  if (!registry) {
    console.log("❌ No registry found. Please run deploy-all.ts first.");
    return;
  }

  console.log(`📊 Registry loaded with ${Object.keys(registry.players).length} players`);

  // Initialize API adapter
  const adapter = new ApiFootballAdapter({
    apiKey: config.apiFootballKey,
  });

  // Update summary
  const updateSummary: UpdateSummary = {
    totalPlayers: Object.keys(registry.players).length,
    updatedPlayers: 0,
    failedUpdates: 0,
    leagueId: config.leagueId,
    leagueName: registry.leagueName,
    season: config.season,
    updateTime: new Date().toISOString(),
    updatedPlayersList: [],
  };

  // Process each player in the registry
  const playerIds = Object.keys(registry.players);
  console.log(`\n🔄 Processing ${playerIds.length} players for updates...`);

  for (let i = 0; i < playerIds.length; i++) {
    const playerId = parseInt(playerIds[i]);
    const player = registry.players[playerId];

    try {
      console.log(`\n[${i + 1}/${playerIds.length}] Processing ${player.playerName}...`);
      
      const changes = await updatePlayerData(player, adapter, config);
      
      if (changes.length > 0) {
        updateSummary.updatedPlayers++;
        updateSummary.updatedPlayersList.push({
          playerId: player.playerId,
          playerName: player.playerName,
          tokenAddress: player.tokenAddress,
          changes: changes,
        });
        
        console.log(`   ✅ Updated: ${changes.join(", ")}`);
      } else {
        console.log(`   ✅ No updates needed`);
      }

      // Add delay between API calls to respect rate limits
      await adapter.waitForRateLimit(1000);

    } catch (error) {
      updateSummary.failedUpdates++;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`   ❌ Failed to update ${player.playerName}:`, errorMessage);
    }
  }

  // Update registry timestamp
  registry.lastUpdated = new Date().toISOString();
  saveRegistry(registry, registryFile);

  // Save update summary
  const summaryFile = `update-summary-${config.leagueId}-${config.season}-${Date.now()}.json`;
  fs.writeFileSync(summaryFile, JSON.stringify(updateSummary, null, 2));

  console.log("\n📊 Update Summary:");
  console.log(`   Total Players: ${updateSummary.totalPlayers}`);
  console.log(`   Updated: ${updateSummary.updatedPlayers}`);
  console.log(`   Failed: ${updateSummary.failedUpdates}`);
  console.log(`   Summary saved to: ${summaryFile}`);

  console.log("\n✅ Daily update cron job completed successfully!");
}

/**
 * Update player data by fetching latest info from API Football
 */
async function updatePlayerData(
  player: RegistryPlayer,
  adapter: ApiFootballAdapter,
  config: Config
): Promise<string[]> {
  const changes: string[] = [];

  try {
    // Fetch latest player data from API Football
    const apiPlayerStats = await adapter.fetchPlayerStats(
      player.playerId,
      config.leagueId,
      config.season
    );

    if (!apiPlayerStats || apiPlayerStats.statistics.length === 0) {
      console.log(`   ⚠️  No API data available for ${player.playerName}`);
      return changes;
    }

    const playerStats = apiPlayerStats.statistics[0];
    const currentStats = player.statistics;

    // Check if stats have changed
    const newStats: PlayerStats = {
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

    // Compare stats and update if changed
    if (
      !currentStats ||
      currentStats.goals !== newStats.goals ||
      currentStats.assists !== newStats.assists ||
      currentStats.appearances !== newStats.appearances ||
      currentStats.goals !== newStats.goals
    ) {
      // Update contract stats
      await updateContractStats(player.tokenAddress, newStats);
      changes.push("stats");
      
      // Update registry stats
      player.statistics = {
        appearances: newStats.appearances,
        lineups: playerStats.games.lineups || 0,
        minutes: playerStats.games.minutes || 0,
        number: playerStats.games.number || 0,
        rating: playerStats.games.rating || "0",
        captain: playerStats.games.captain || false,
        goals: newStats.goals,
        assists: newStats.assists,
        saves: playerStats.goals.saves,
        conceded: playerStats.goals.conceded,
      };
    }

    // Check if photo URL has changed
    const newPhotoUrl = apiPlayerStats.player.photo || "";
    if (newPhotoUrl && newPhotoUrl !== player.photoUrl) {
      player.photoUrl = newPhotoUrl;
      changes.push("photo");
    }

    // Check if team logo has changed
    const newTeamLogoUrl = playerStats.team.logo || "";
    if (newTeamLogoUrl && newTeamLogoUrl !== player.teamLogoUrl) {
      player.teamLogoUrl = newTeamLogoUrl;
      changes.push("team_logo");
    }

    // Check if team venue info has changed
    try {
      const teams = await adapter.fetchTeams(config.leagueId, config.season);
      const teamData = teams.find(t => t.team.id === player.teamId);
      
      if (teamData && teamData.venue) {
        const newVenue = {
          name: teamData.venue.name || "Unknown",
          city: teamData.venue.city || "Unknown",
          capacity: teamData.venue.capacity || 0
        };

        if (
          newVenue.name !== player.teamVenue.name ||
          newVenue.city !== player.teamVenue.city ||
          newVenue.capacity !== player.teamVenue.capacity
        ) {
          player.teamVenue = newVenue;
          changes.push("venue");
        }
      }
    } catch (error) {
      console.log(`   ⚠️  Could not fetch team venue data`);
    }

  } catch (error) {
    console.error(`   ❌ Error fetching data for ${player.playerName}:`, error);
    throw error;
  }

  return changes;
}

/**
 * Update player stats on the blockchain contract
 */
async function updateContractStats(tokenAddress: string, stats: PlayerStats): Promise<void> {
  try {
    const PlayerToken = await ethers.getContractFactory("PlayerToken");
    const playerToken = PlayerToken.attach(tokenAddress) as PlayerTokenType;

    const statsTx = await playerToken.updatePlayerStats(stats, {
      gasLimit: 1000000,
    });
    await statsTx.wait();
    
    console.log(`   ✅ Contract stats updated for ${tokenAddress}`);
  } catch (error) {
    console.error(`   ❌ Failed to update contract stats:`, error);
    throw error;
  }
}

/**
 * Load registry from file
 */
function loadRegistry(registryFile: string): Registry | null {
  try {
    if (fs.existsSync(registryFile)) {
      const data = fs.readFileSync(registryFile, "utf8");
      return JSON.parse(data) as Registry;
    }
    return null;
  } catch (error) {
    console.error("Error loading registry:", error);
    return null;
  }
}

/**
 * Save registry to file
 */
function saveRegistry(registry: Registry, registryFile: string): void {
  try {
    fs.writeFileSync(registryFile, JSON.stringify(registry, null, 2));
    console.log(`💾 Registry saved to ${registryFile}`);
  } catch (error) {
    console.error("Error saving registry:", error);
  }
}

main().catch((error) => {
  console.error("❌ Cron job failed:", error);
  process.exitCode = 1;
}); 