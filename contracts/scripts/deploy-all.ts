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
  initialSupply: string;
  apiFootballKey: string;
}

interface Team {
  id: number;
  name: string;
  code: string;
  country: string;
}

interface Player {
  player: number;
  firstname: string;
  lastname: string;
  teamname: string;
  position: string;
  nationality: string;
  age: number;
  teamId?: number;
  teamName?: string;
  teamCode?: string;
  teamCountry?: string;
}

interface PlayerWithTeam extends Player {
  teamId: number;
  teamName: string;
  teamCode: string;
  teamCountry: string;
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

interface DeploymentInfo {
  playerId: number;
  playerName: string;
  tokenName: string;
  tokenSymbol: string;
  tokenAddress: string;
  teamId: number;
  teamName: string;
  position: string;
  nationality: string;
  age: number;
  deploymentTime: string;
  blockNumber: number;
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

interface DeploymentSummary {
  totalTeams: number;
  totalPlayers: number;
  deployedTokens: number;
  failedDeployments: number;
  leagueId: number;
  leagueName: string;
  season: number;
  deploymentTime: string;
  registryFile: string;
  deployedTokensList: DeploymentInfo[];
}

// League name mapping
const LEAGUE_NAMES: Record<number, string> = {
  1: "World Cup",
  61: "Ligue 1",
  39: "Premier League",
  140: "La Liga",
  135: "Serie A",
};

// Team ID to token symbol mapping (World Cup national teams)
const TEAM_TOKEN_MAPPING: Record<number, string> = {
  26: "ARG", // Argentina
};

async function main() {
  const config: Config = {
    leagueId: 1, // World Cup
    season: 2022, // WC 2022 Qatar (latest with full data)
    initialSupply: "1000000",
    apiFootballKey: process.env.API_FOOTBALL_KEY || "",
  };

  // Validate required environment variables
  if (!config.apiFootballKey) {
    throw new Error("API_FOOTBALL_KEY environment variable is required");
  }

  console.log("Configuration:", {
    leagueId: config.leagueId,
    season: config.season,
    initialSupply: config.initialSupply,
  });

  // Initialize registry
  const registryFile = `player-registry-${config.leagueId}-${config.season}.json`;
  const registry = loadOrCreateRegistry(registryFile, config);

  // Initialize API adapter
  const adapter = new ApiFootballAdapter({
    apiKey: config.apiFootballKey,
  });

  const leagueName =
    LEAGUE_NAMES[config.leagueId] || `League ${config.leagueId}`;

  // Load team token addresses
  let teamTokenAddresses: Record<string, string> = {};
  try {
    teamTokenAddresses = JSON.parse(
      fs.readFileSync("teamFanTokenAddress.json", "utf8")
    );
    console.log(
      `📋 Loaded ${Object.keys(teamTokenAddresses).length} team token addresses`
    );
  } catch (error) {
    console.warn(
      "⚠️  Could not load teamFanTokenAddress.json, will use default payment token"
    );
  }

  try {
    // Step 1: Fetch all teams
    console.log("\n📋 Step 1: Fetching all teams...");
    const apiTeams = await adapter.fetchTeams(config.leagueId, config.season);
    console.log(`✅ Found ${apiTeams.length} teams`);

    // Convert API teams to our format
    let teams: Team[] = apiTeams.map((apiTeam) => ({
      id: apiTeam.team.id,
      name: apiTeam.team.name,
      code: apiTeam.team.code,
      country: apiTeam.team.country,
    }));

    // Optional filter to a single team by API-Football team id (TEAM_ID),
    // and/or cap the number of teams (TEAM_LIMIT). Both help stay within the
    // free API-Football plan. 0/unset = no filter / all teams.
    const teamIdFilter = Number(process.env.TEAM_ID) || 0;
    if (teamIdFilter > 0) {
      teams = teams.filter((t) => t.id === teamIdFilter);
      console.log(`⚠️  TEAM_ID=${teamIdFilter} — deploying only ${teams[0]?.name ?? "(team not found)"}`);
    }
    const teamLimit = Number(process.env.TEAM_LIMIT) || 0;
    if (teamLimit > 0 && teams.length > teamLimit) {
      console.log(`⚠️  TEAM_LIMIT=${teamLimit} — deploying only the first ${teamLimit} team(s)`);
      teams = teams.slice(0, teamLimit);
    }

    // Step 2: Process each team sequentially
    console.log("\n👥 Step 2: Processing teams and deploying player tokens...");
    const allDeployedTokens: DeploymentInfo[] = [];
    let totalPlayersProcessed = 0;

    for (let teamIndex = 0; teamIndex < teams.length; teamIndex++) {
      const team = teams[teamIndex];
      console.log(
        `\n🏆 Processing Team ${teamIndex + 1}/${teams.length}: ${team.name}`
      );
      console.log(`   Team ID: ${team.id}, Country: ${team.country}`);

      try {
        // Fetch players for this team
        console.log(`   📥 Fetching players for ${team.name}...`);
        const apiPlayers = await adapter.fetchTeamPlayers(
          team.id,
          config.leagueId,
          config.season
        );

        console.log(
          `   🔍 Raw API response: ${apiPlayers.length} players found`
        );
        if (apiPlayers.length > 0) {
          console.log(`   📊 Sample player data:`, {
            id: apiPlayers[0].player.id,
            name: `${apiPlayers[0].player.firstname} ${apiPlayers[0].player.lastname}`,
            statsCount: apiPlayers[0].statistics.length,
          });
        }

        // Convert API players to our format
        const players: Player[] = apiPlayers.map((apiPlayer) => {
          const stats = apiPlayer.statistics[0]; // Get first stats entry
          return {
            player: apiPlayer.player.id,
            firstname: apiPlayer.player.firstname,
            lastname: apiPlayer.player.lastname,
            teamname: stats?.team.name || team.name,
            position: stats?.games.position || "Unknown",
            nationality: apiPlayer.player.nationality,
            age: apiPlayer.player.age,
          };
        });

        // Add team info to each player
        const playersWithTeam: PlayerWithTeam[] = players.map((player) => ({
          ...player,
          teamId: team.id,
          teamName: team.name,
          teamCode: team.code,
          teamCountry: team.country,
        }));

        console.log(`   ✅ Found ${players.length} players in ${team.name}`);

        // Deploy tokens for all players in this team
        console.log(
          `   🎯 Deploying tokens for all players in ${team.name}...`
        );
        const teamDeployedTokens = await deployTokensForTeam(
          playersWithTeam,
          team,
          leagueName,
          config,
          totalPlayersProcessed,
          registry,
          registryFile,
          adapter,
          teamTokenAddresses,
          apiTeams
        );

        allDeployedTokens.push(...teamDeployedTokens);
        totalPlayersProcessed += players.length;

        console.log(
          `   ✅ Successfully deployed ${teamDeployedTokens.length}/${players.length} tokens for ${team.name}`
        );

        // Save registry after each team
        saveRegistry(registry, registryFile);
        console.log(`   💾 Registry updated and saved to ${registryFile}`);

        // Add delay between teams to respect API rate limits
        if (teamIndex < teams.length - 1) {
          console.log(`   ⏳ Waiting 3 seconds before next team...`);
          await adapter.waitForRateLimit(3000);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(
          `   ❌ Failed to process team ${team.name}:`,
          errorMessage
        );
      }
    }

    // Step 3: Update registry with final statistics
    console.log("\n📊 Step 3: Updating registry with final statistics...");
    
    registry.totalTeams = teams.length;
    registry.totalPlayers = totalPlayersProcessed;
    registry.deployedTokens = allDeployedTokens.length;
    registry.lastUpdated = new Date().toISOString();

    // Step 4: Generate deployment summary
    console.log("\n📊 Step 4: Generating deployment summary...");

    const summary: DeploymentSummary = {
      totalTeams: teams.length,
      totalPlayers: totalPlayersProcessed,
      deployedTokens: allDeployedTokens.length,
      failedDeployments: totalPlayersProcessed - allDeployedTokens.length,
      leagueId: config.leagueId,
      leagueName: leagueName,
      season: config.season,
      deploymentTime: new Date().toISOString(),
      registryFile: registryFile,
      deployedTokensList: allDeployedTokens,
    };

    console.log("\n🎉 Deployment Summary:");
    console.log(`- Total teams processed: ${summary.totalTeams}`);
    console.log(`- Total players processed: ${summary.totalPlayers}`);
    console.log(`- Successfully deployed: ${summary.deployedTokens}`);
    console.log(`- Failed deployments: ${summary.failedDeployments}`);
    console.log(`- League: ${summary.leagueName} (${summary.leagueId})`);
    console.log(`- Season: ${summary.season}`);
    console.log(`- Registry file: ${summary.registryFile}`);

    // Save final deployment summary to file
    const summaryFile = `deployment-summary-${Date.now()}.json`;
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    console.log(`\n📄 Deployment summary saved to: ${summaryFile}`);

    // Final registry save
    saveRegistry(registry, registryFile);
    console.log(`\n💾 Final registry saved to: ${registryFile}`);
    console.log(
      `📊 Registry contains ${
        Object.keys(registry.players).length
      } player contracts`
    );

    // Step 5: Create enhanced registry file (similar to enhanced-player-data format)
    console.log("\n📊 Step 5: Creating enhanced registry file...");
    const enhancedRegistry = {
      leagueId: registry.leagueId,
      leagueName: registry.leagueName,
      season: registry.season,
      totalTeams: registry.totalTeams,
      totalPlayers: registry.totalPlayers,
      deployedTokens: registry.deployedTokens,
      fetchTime: new Date().toISOString(),
      players: Object.values(registry.players)
    };

    const enhancedRegistryFile = `enhanced-registry-${config.leagueId}-${config.season}.json`;
    fs.writeFileSync(enhancedRegistryFile, JSON.stringify(enhancedRegistry, null, 2));
    console.log(`📁 Enhanced registry saved to: ${enhancedRegistryFile}`);

    return summary;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Deployment failed:", errorMessage);
    // Save registry even on failure
    saveRegistry(registry, registryFile);
    console.log(
      `💾 Registry saved to ${registryFile} despite deployment failure`
    );
    throw error;
  }
}

/**
 * Load existing registry or create new one
 */
function loadOrCreateRegistry(registryFile: string, config: Config): Registry {
  if (fs.existsSync(registryFile)) {
    console.log(`📖 Loading existing registry from ${registryFile}`);
    const existingRegistry = JSON.parse(
      fs.readFileSync(registryFile, "utf8")
    ) as Registry;

    // Validate registry structure
    if (
      existingRegistry.leagueId === config.leagueId &&
      existingRegistry.season === config.season
    ) {
      console.log(
        `✅ Found existing registry with ${
          Object.keys(existingRegistry.players).length
        } players`
      );
      return existingRegistry;
    } else {
      console.log(
        `⚠️  Existing registry is for different league/season, creating new one`
      );
    }
  }

  console.log(
    `📝 Creating new registry for league ${config.leagueId}, season ${config.season}`
  );
  return {
    leagueId: config.leagueId,
    leagueName: LEAGUE_NAMES[config.leagueId] || `League ${config.leagueId}`,
    season: config.season,
    totalTeams: 0,
    totalPlayers: 0,
    deployedTokens: 0,
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    players: {},
  };
}

/**
 * Save registry to file
 */
function saveRegistry(registry: Registry, registryFile: string): void {
  registry.lastUpdated = new Date().toISOString();
  fs.writeFileSync(registryFile, JSON.stringify(registry, null, 2));
}

/**
 * Deploy tokens for all players in a specific team
 */
async function deployTokensForTeam(
  players: PlayerWithTeam[],
  team: Team,
  leagueName: string,
  config: Config,
  totalPlayersProcessed: number,
  registry: Registry,
  registryFile: string,
  adapter: ApiFootballAdapter,
  teamTokenAddresses: Record<string, string>,
  apiTeams: ApiFootballTeam[]
): Promise<DeploymentInfo[]> {
  const PlayerToken = await ethers.getContractFactory("PlayerToken");
  const deployedTokens: DeploymentInfo[] = [];

  for (let i = 0; i < players.length; i++) {
    const player = players[i];

    try {
      // Check if player already has a contract in registry
      const existingPlayer = registry.players[player.player];
      if (existingPlayer) {
        console.log(
          `     🔄 Found existing contract for ${player.firstname} ${
            player.lastname
          } at ${existingPlayer.tokenAddress}`
        );
        
        // Check if data needs updating
        const fullName = `${player.firstname} ${player.lastname}`;
        const needsUpdate = await checkIfDataNeedsUpdate(
          existingPlayer,
          player,
          fullName,
          leagueName,
          config,
          adapter
        );
        
        if (needsUpdate) {
          console.log(`       📝 Updating contract data...`);
          await updateExistingContract(
            existingPlayer.tokenAddress,
            player,
            fullName,
            leagueName,
            config,
            adapter
          );
          
          // Update registry with new data
          registry.players[player.player] = {
            ...existingPlayer,
            playerName: fullName,
            teamName: player.teamName,
            teamCode: player.teamCode,
            nationality: player.nationality,
            age: player.age
          };
          
          console.log(`       ✅ Contract data updated successfully`);
        } else {
          console.log(`       ✅ Contract data is up to date`);
        }
        
        continue;
      }

      // Generate token name and symbol
      const fullName = `${player.firstname} ${player.lastname}`;
      const tokenName = `${fullName} (${leagueName} ${config.season})`;
      const tokenSymbol = generateTokenSymbol(fullName);

      console.log(
        `     Deploying token for ${fullName} (${i + 1}/${players.length})`
      );
      console.log(`       Name: ${tokenName}`);
      console.log(`       Symbol: ${tokenSymbol}`);
      console.log(`       Player ID: ${player.player}`);

      // Get team token address for payment
      const teamTokenSymbol = TEAM_TOKEN_MAPPING[player.teamId];
      const teamTokenAddress = teamTokenSymbol
        ? teamTokenAddresses[teamTokenSymbol]
        : null;

      if (!teamTokenAddress) {
        console.log(
          `       ⚠️  No team token found for team ${player.teamId}, skipping deployment`
        );
        continue;
      }

      console.log(
        `       💰 Using team token: ${teamTokenSymbol} (${teamTokenAddress})`
      );

      // Deploy player token contract with explicit gas limit
      console.log(`       ⛽ Deploying with explicit gas limit...`);

      let playerToken: PlayerTokenType;
      let tokenAddress: string;

      try {
        playerToken = await PlayerToken.deploy(
          tokenName,
          tokenSymbol,
          teamTokenAddress,
          { gasLimit: 5000000 } // 5M gas limit
        );

        console.log(
          `       📦 Deployment transaction sent: ${
            playerToken.deploymentTransaction()?.hash
          }`
        );
        await playerToken.waitForDeployment();
        tokenAddress = await playerToken.getAddress();

        console.log(`       ✅ Contract deployed to: ${tokenAddress}`);
      } catch (deployError) {
        console.error(`       ❌ Deployment failed:`, deployError);
        throw deployError;
      }

      // Initialize the contract with player data
      console.log(`       🔧 Initializing contract with player data...`);
      try {
        const initializeTx = await playerToken.initialize(
          player.player,
          fullName,
          player.teamname,
          player.position,
          leagueName,
          config.season.toString(),
          config.initialSupply,
          { gasLimit: 2000000 } // 2M gas for initialization
        );
        await initializeTx.wait();
        console.log(`       ✅ Contract initialized successfully`);
      } catch (initError) {
        console.error(`       ❌ Initialization failed:`, initError);
        throw initError;
      }

      // Mint tokens to the contract itself
      console.log(`       🪙 Minting tokens to contract...`);
      try {
        const mintTx = await playerToken.mint(
          tokenAddress,
          config.initialSupply,
          { gasLimit: 1000000 }
        ); // 1M gas for minting
        await mintTx.wait();
        console.log(`       ✅ Tokens minted to contract successfully`);
      } catch (mintError) {
        console.error(`       ❌ Minting failed:`, mintError);
        throw mintError;
      }

      // Fetch real player stats and photo from API Football
      console.log(`       📊 Fetching real stats and photo for ${fullName}...`);
      let stats: PlayerStats;
      let photoUrl = "";
      let teamLogoUrl = "";
      let teamVenue = {
        name: "Unknown",
        city: "Unknown",
        capacity: 0
      };

      try {
        const apiPlayerStats = await adapter.fetchPlayerStats(
          player.player,
          config.leagueId,
          config.season
        );

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
          
          // Extract photo URL and team logo
          photoUrl = apiPlayerStats.player.photo || "";
          teamLogoUrl = playerStats.team.logo || "";
          
          console.log(`       ✅ Using real stats from API Football`);
          console.log(`       📸 Photo URL: ${photoUrl ? "Found" : "Not available"}`);
          console.log(`       🏟️  Team Logo URL: ${teamLogoUrl ? "Found" : "Not available"}`);
        } else {
          // Fallback to mock stats if API doesn't return data
          stats = generateMockStats();
          console.log(`       ⚠️  Using mock stats (no API data available)`);
        }
      } catch (error) {
        // Fallback to mock stats if API call fails
        stats = generateMockStats();
        console.log(`       ⚠️  Using mock stats (API call failed)`);
      }

      // Resolve team venue from the already-fetched teams list (avoids a
      // redundant API call per player — important on the free 100/day plan).
      console.log(`       🏟️  Resolving team venue information...`);
      try {
        const teamData = apiTeams.find(t => t.team.id === player.teamId);

        if (teamData && teamData.venue) {
          teamVenue = {
            name: teamData.venue.name || "Unknown",
            city: teamData.venue.city || "Unknown",
            capacity: teamData.venue.capacity || 0
          };
          console.log(`       ✅ Team venue: ${teamVenue.name} (${teamVenue.city}) - Capacity: ${teamVenue.capacity}`);
        } else {
          console.log(`       ⚠️  Team venue information not available`);
        }
      } catch (error) {
        console.log(`       ⚠️  Failed to fetch team venue information`);
      }

      console.log(`       📊 Updating player stats...`);
      try {
        const statsTx = await playerToken.updatePlayerStats(stats, {
          gasLimit: 1000000,
        }); // 1M gas for stats update
        await statsTx.wait();
        console.log(`       ✅ Player stats updated successfully`);
      } catch (statsError) {
        console.error(`       ❌ Stats update failed:`, statsError);
        throw statsError;
      }

      // Store deployment info
      const deploymentInfo: DeploymentInfo = {
        playerId: player.player,
        playerName: fullName,
        tokenName: tokenName,
        tokenSymbol: tokenSymbol,
        tokenAddress: tokenAddress,
        teamId: player.teamId,
        teamName: player.teamName,
        position: player.position,
        nationality: player.nationality,
        age: player.age,
        deploymentTime: new Date().toISOString(),
        blockNumber:
          (await playerToken.deploymentTransaction())?.blockNumber || 0,
      };

      deployedTokens.push(deploymentInfo);

      // Add to registry with enhanced data
      registry.players[player.player] = {
        playerId: player.player,
        playerName: fullName,
        tokenName: tokenName,
        tokenSymbol: tokenSymbol,
        tokenAddress: tokenAddress,
        teamId: player.teamId,
        teamName: player.teamName,
        teamCode: player.teamCode,
        teamContractAddress: teamTokenAddress,
        position: player.position,
        nationality: player.nationality,
        age: player.age,
        photoUrl: photoUrl,
        teamLogoUrl: teamLogoUrl,
        teamVenue: teamVenue,
        deploymentTime: new Date().toISOString(),
        statistics: {
          appearances: stats.appearances,
          lineups: 0, // Not available in current stats
          minutes: 0, // Not available in current stats
          number: 0, // Not available in current stats
          rating: "0", // Not available in current stats
          captain: false,
          goals: stats.goals,
          assists: stats.assists,
          saves: undefined,
          conceded: undefined
        }
      };

      console.log(`       ✅ Token deployed to: ${tokenAddress}`);
      console.log(`       ✅ Initialized with player data`);
      console.log(`       ✅ Updated with player stats`);
      console.log(`       📝 Added to registry`);

      // Save registry periodically (every 5 deployments)
      if ((i + 1) % 5 === 0) {
        saveRegistry(registry, registryFile);
        console.log(
          `       💾 Registry saved (${i + 1}/${players.length} players)`
        );
      }

      // Add delay between deployments and API calls
      await adapter.waitForRateLimit(2000);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(
        `       ❌ Failed to deploy token for ${player.firstname} ${player.lastname}:`,
        errorMessage
      );
    }
  }

  return deployedTokens;
}

/**
 * Generate mock player stats as fallback
 */
function generateMockStats(): PlayerStats {
  return {
    goals: Math.floor(Math.random() * 20) + 1,
    assists: Math.floor(Math.random() * 15) + 1,
    penalties_scored: Math.floor(Math.random() * 5),
    shots_total: Math.floor(Math.random() * 50) + 10,
    shots_on_target: Math.floor(Math.random() * 30) + 5,
    duels_total: Math.floor(Math.random() * 100) + 20,
    duels_won: Math.floor(Math.random() * 70) + 10,
    tackles_total: Math.floor(Math.random() * 20) + 1,
    appearances: Math.floor(Math.random() * 25) + 5,
    yellow_cards: Math.floor(Math.random() * 5),
    red_cards: Math.floor(Math.random() * 2),
    lastUpdated: Math.floor(Date.now() / 1000),
  };
}

/**
 * Check if existing contract data needs updating
 */
async function checkIfDataNeedsUpdate(
  existingPlayer: RegistryPlayer,
  player: PlayerWithTeam,
  fullName: string,
  leagueName: string,
  config: Config,
  adapter: ApiFootballAdapter
): Promise<boolean> {
  // Check if basic player info has changed
  if (
    existingPlayer.playerName !== fullName ||
    existingPlayer.teamName !== player.teamName ||
    existingPlayer.nationality !== player.nationality ||
    existingPlayer.age !== player.age
  ) {
    console.log(`       📊 Basic player info changed`);
    return true;
  }

  // Check if stats need updating (fetch latest stats)
  try {
    const apiPlayerStats = await adapter.fetchPlayerStats(
      player.player,
      config.leagueId,
      config.season
    );

    if (apiPlayerStats && apiPlayerStats.statistics.length > 0) {
      const playerStats = apiPlayerStats.statistics[0];
      const currentStats = existingPlayer.statistics;
      
      if (
        currentStats &&
        (currentStats.goals !== (playerStats.goals.total || 0) ||
         currentStats.assists !== (playerStats.goals.assists || 0) ||
         currentStats.appearances !== (playerStats.games.appearences || 0))
      ) {
        console.log(`       📊 Player stats changed`);
        return true;
      }
    }
  } catch (error) {
    console.log(`       ⚠️  Could not check stats update - assuming update needed`);
    return true;
  }

  return false;
}

/**
 * Update existing contract with new data
 */
async function updateExistingContract(
  tokenAddress: string,
  player: PlayerWithTeam,
  fullName: string,
  leagueName: string,
  config: Config,
  adapter: ApiFootballAdapter
): Promise<void> {
  const PlayerToken = await ethers.getContractFactory("PlayerToken");
  const playerToken = PlayerToken.attach(tokenAddress) as PlayerTokenType;

  // Fetch latest stats and photo data
  let stats: PlayerStats;
  let photoUrl = "";
  let teamLogoUrl = "";

  try {
    const apiPlayerStats = await adapter.fetchPlayerStats(
      player.player,
      config.leagueId,
      config.season
    );

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
      
      photoUrl = apiPlayerStats.player.photo || "";
      teamLogoUrl = playerStats.team.logo || "";
      
      console.log(`       ✅ Fetched updated stats and photo data`);
    } else {
      stats = generateMockStats();
      console.log(`       ⚠️  Using mock stats for update`);
    }
  } catch (error) {
    stats = generateMockStats();
    console.log(`       ⚠️  Using mock stats for update (API failed)`);
  }

  // Update player stats on contract
  try {
    const statsTx = await playerToken.updatePlayerStats(stats, {
      gasLimit: 1000000,
    });
    await statsTx.wait();
    console.log(`       ✅ Player stats updated on contract`);
  } catch (error) {
    console.error(`       ❌ Failed to update stats on contract:`, error);
  }
}

/**
 * Generate a token symbol from player name
 */
function generateTokenSymbol(fullName: string): string {
  const names = fullName.split(" ");
  if (names.length >= 2) {
    // Use first letter of first name + first 2-3 letters of last name
    const firstName = names[0];
    const lastName = names[names.length - 1];
    return (firstName.charAt(0) + lastName.substring(0, 3)).toUpperCase();
  } else {
    // Use first 4 letters of single name
    return fullName.substring(0, 4).toUpperCase();
  }
}

/**
 * Validate player data for deployment
 */
function validatePlayerForDeployment(player: Player): boolean {
  return Boolean(
    player.player &&
      player.firstname &&
      player.lastname &&
      player.teamname &&
      player.position
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
