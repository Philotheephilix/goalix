import express, { Request, Response } from 'express';
import cron from 'node-cron';
import { ethers } from "ethers";
import PlayerTokenABI from "./artifacts/contracts/PlayerToken.sol/PlayerToken.json";
import { ApiFootballAdapter } from "./src/adapter/api-football-adapter";
import * as fs from "fs";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Data API configuration
const MONGODB_API_KEY = process.env.MONGODB_API_KEY;
const MONGODB_ENDPOINT = process.env.MONGODB_ENDPOINT;
const MONGODB_DATABASE_NAME = process.env.MONGODB_DATABASE_NAME;
const MONGODB_DATA_SOURCE = process.env.MONGODB_DATA_SOURCE;
const COLLECTION_NAME = 'player_stats';

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

// Initialize ethers provider
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "https://testrpc.xlayer.tech");

// MongoDB Data API helper functions
async function makeMongoDBRequest(action: string, data?: any) {
  const url = `${MONGODB_ENDPOINT}/action/${action}`;
  
  const requestBody = {
    dataSource: MONGODB_DATA_SOURCE,
    database: MONGODB_DATABASE_NAME,
    collection: COLLECTION_NAME,
    ...data
  };

  try {
    console.log(`🔍 MongoDB API Request: ${action}`);
    console.log(`🔍 Request URL: ${url}`);
    console.log(`🔍 Request Body:`, JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': MONGODB_API_KEY || ''
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ MongoDB API Error Response: ${response.status} ${response.statusText}`);
      console.error(`❌ Error Details:`, errorText);
      throw new Error(`MongoDB API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`✅ MongoDB API Response:`, JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ MongoDB Data API request failed:', error);
    throw error;
  }
}

// Initialize MongoDB Data API connection
async function connectToMongoDB() {
  try {
    // Test connection by making a simple find request
    await makeMongoDBRequest('find', { filter: {}, limit: 1 });
    console.log('✅ Connected to MongoDB Data API');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB Data API:', error);
    throw error;
  }
}



/**
 * Update player stats for all players from API Football
 */
async function updateAllPlayerStats(): Promise<void> {
  console.log('\n🔄 Starting scheduled player stats update...');
  
  try {
    // Step 1: Fetch all teams from API Football
    console.log('📋 Fetching all teams from API Football...');
    const apiTeams = await adapter.fetchTeams(config.leagueId, config.season);
    console.log(`✅ Found ${apiTeams.length} teams`);

    let totalPlayers = 0;
    let successCount = 0;
    let errorCount = 0;

    // Step 2: Process each team
    for (let teamIndex = 0; teamIndex < apiTeams.length; teamIndex++) {
      const team = apiTeams[teamIndex];
      console.log(`\n🏆 Processing Team ${teamIndex + 1}/${apiTeams.length}: ${team.team.name}`);

      try {
        // Fetch players for this team
        console.log(`   📥 Fetching players for ${team.team.name}...`);
        const apiPlayers = await adapter.fetchTeamPlayers(team.team.id, config.leagueId, config.season);
        
        console.log(`   ✅ Found ${apiPlayers.length} players in ${team.team.name}`);
        totalPlayers += apiPlayers.length;

        // Process each player
        for (let playerIndex = 0; playerIndex < apiPlayers.length; playerIndex++) {
          const apiPlayer = apiPlayers[playerIndex];
          const playerId = apiPlayer.player.id;
          const fullName = `${apiPlayer.player.firstname} ${apiPlayer.player.lastname}`;
          
          try {
            console.log(`   🔄 Processing player ${playerIndex + 1}/${apiPlayers.length}: ${fullName}`);
            
            // Get player stats from API Football
            const apiPlayerStats = await adapter.fetchPlayerStats(playerId, config.leagueId, config.season);
            
            if (apiPlayerStats && apiPlayerStats.statistics.length > 0) {
              const playerStats = apiPlayerStats.statistics[0];
              const newStats = {
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

              // Always store stats in MongoDB first
              await storeStats(playerId, newStats);
              
              // Get stored stats to compare
              const storedStats = await getStoredStats(playerId);
              
              // Only update blockchain if stats have changed
              if (!storedStats || !areStatsEqual(storedStats, newStats)) {
                console.log(`   📊 Stats changed for ${fullName}, updating blockchain...`);
                
                // Try to find contract address from MongoDB registry
                const contractResult = await makeMongoDBRequest('findOne', {
                  filter: { playerId: playerId.toString(), eventType: 'initialized' }
                });
                
                if (contractResult.document && contractResult.document.contractAddress) {
                  // Get contract instance
                  const playerToken = new ethers.Contract(contractResult.document.contractAddress, PlayerTokenABI.abi, provider);
                  
                  // Update player stats on blockchain
                  const statsTx = await playerToken.updatePlayerStats(newStats, { gasLimit: 1000000 });
                  await statsTx.wait();
                  console.log(`   ✅ Updated ${fullName} on blockchain`);
                  successCount++;
                } else {
                  console.log(`   ⚠️  No contract found for ${fullName}, stats stored in MongoDB only`);
                }
              } else {
                console.log(`   ⏭️  Stats unchanged for ${fullName}, skipping blockchain update`);
              }
            } else {
              console.log(`   ⚠️  No stats available for ${fullName}`);
            }
            
            // Add delay between players to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 1000));
            
          } catch (error) {
            errorCount++;
            console.error(`   ❌ Failed to process ${fullName}:`, error);
          }
        }

        // Add delay between teams to respect rate limits
        if (teamIndex < apiTeams.length - 1) {
          console.log(`   ⏳ Waiting 3 seconds before next team...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }

      } catch (error) {
        console.error(`   ❌ Failed to process team ${team.team.name}:`, error);
      }
    }

    console.log(`\n📊 Update Summary:`);
    console.log(`- Total teams: ${apiTeams.length}`);
    console.log(`- Total players: ${totalPlayers}`);
    console.log(`- Successful updates: ${successCount}`);
    console.log(`- Failed updates: ${errorCount}`);
    console.log(`- Update completed at: ${new Date().toISOString()}`);

  } catch (error) {
    console.error('❌ Failed to fetch teams from API Football:', error);
  }
}

/**
 * Get stored stats from MongoDB Data API
 */
async function getStoredStats(playerId: number): Promise<any> {
  try {
    const playerIdStr = playerId.toString();
    const result = await makeMongoDBRequest('findOne', {
      filter: { playerId: playerIdStr }
    });
    return result.document;
  } catch (error) {
    console.error('❌ Failed to get stored stats:', error);
    return null;
  }
}

/**
 * Store stats in MongoDB Data API
 */
async function storeStats(playerId: number, stats: any): Promise<void> {
  try {
    // Ensure playerId is a string for MongoDB compatibility
    const playerIdStr = playerId.toString();
    
    // Clean up the stats object to ensure all values are proper types
    const cleanStats = {
      ...stats,
      playerId: playerIdStr,
      updatedAt: new Date().toISOString(),
      lastApiFetch: new Date().toISOString()
    };
    
    // Remove any undefined or null values
    Object.keys(cleanStats).forEach(key => {
      if (cleanStats[key] === undefined || cleanStats[key] === null) {
        delete cleanStats[key];
      }
    });
    
    await makeMongoDBRequest('updateOne', {
      filter: { playerId: playerIdStr },
      update: {
        $set: cleanStats
      },
      upsert: true
    });
    console.log(`       💾 Stats stored in MongoDB Data API for player ${playerIdStr}`);
  } catch (error) {
    console.error('❌ Failed to store stats in MongoDB Data API:', error);
  }
}

/**
 * Compare two stats objects
 */
function areStatsEqual(stats1: any, stats2: any): boolean {
  const keys = ['goals', 'assists', 'penalties_scored', 'shots_total', 'shots_on_target', 
                'duels_total', 'duels_won', 'tackles_total', 'appearances', 'yellow_cards', 'red_cards'];
  
  for (const key of keys) {
    if (stats1[key] !== stats2[key]) {
      return false;
    }
  }
  return true;
}

/**
 * Update only player stats (without initialization and minting)
 */
async function updatePlayerStatsOnly(
  playerToken: ethers.Contract,
  player: any,
  leagueId: number,
  season: number,
  adapter: ApiFootballAdapter
): Promise<void> {
  const fullName = `${player.firstname} ${player.lastname}`;
  
  // Get stored stats from MongoDB
  const storedStats = await getStoredStats(player.player);
  
  // Fetch real player stats from API Football
  console.log(`       📊 Fetching real stats for ${fullName}...`);
  let newStats = {
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
      newStats = {
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
  
  // Store new stats in MongoDB
  await storeStats(player.player, newStats);
  
  // Compare with stored stats
  if (storedStats && areStatsEqual(storedStats, newStats)) {
    console.log(`       ⏭️  Stats unchanged for ${fullName}, skipping blockchain update`);
    return;
  }
  
  console.log(`       📊 Updating player stats on blockchain...`);
  try {
    const statsTx = await playerToken.updatePlayerStats(newStats, { gasLimit: 1000000 });
    await statsTx.wait();
    console.log(`       ✅ Player stats updated successfully on blockchain`);
  } catch (statsError) {
    console.error(`       ❌ Stats update failed:`, statsError);
    throw statsError;
  }
}

// Schedule cron job to run every 24 hours at 2:00 AM
cron.schedule('0 2 * * *', async () => {
  console.log('⏰ Scheduled player stats update triggered');
  await updateAllPlayerStats();
}, {
  scheduled: true,
  timezone: "UTC"
});

app.get('/api/update-stats', async (req: Request, res: Response) => {
  try {
    console.log('🔄 Manual stats update triggered via API');
    await updateAllPlayerStats();
    res.json({ 
      success: true, 
      message: 'Player stats update completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Manual update failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Update failed',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    nextUpdate: 'Daily at 2:00 AM UTC'
  });
});

app.get('/api/status', async (req: Request, res: Response) => {
  try {
    // Get stats from MongoDB
    const countResult = await makeMongoDBRequest('countDocuments', {
      filter: {}
    });
    
    const lastUpdatedResult = await makeMongoDBRequest('findOne', {
      filter: {},
      sort: { updatedAt: -1 }
    });
    
    res.json({
      status: 'active',
      totalPlayers: countResult.count,
      lastUpdate: lastUpdatedResult.document?.updatedAt,
      config: {
        leagueId: config.leagueId,
        season: config.season
      },
      nextUpdate: 'Daily at 2:00 AM UTC'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Database stats endpoint
app.get('/api/db-stats', async (req: Request, res: Response) => {
  try {
    const countResult = await makeMongoDBRequest('countDocuments', {
      filter: {}
    });
    
    const lastUpdatedResult = await makeMongoDBRequest('findOne', {
      filter: {},
      sort: { updatedAt: -1 }
    });
    
    res.json({
      totalPlayers: countResult.count,
      lastUpdated: lastUpdatedResult.document?.updatedAt,
      database: MONGODB_DATABASE_NAME,
      collection: COLLECTION_NAME
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get database stats' });
  }
});

// Clear database endpoint
app.delete('/api/db-clear', async (req: Request, res: Response) => {
  try {
    await makeMongoDBRequest('deleteMany', {
      filter: {}
    });
    res.json({ message: 'Database cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear database' });
  }
});

// Start server
async function startServer() {
  try {
    // Connect to MongoDB first
    await connectToMongoDB();
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Player Stats Update Server running on port ${PORT}`);
      console.log(`⏰ Scheduled updates: Daily at 2:00 AM UTC`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔗 Manual update: POST http://localhost:${PORT}/api/update-stats`);
      console.log(`🔗 Status: http://localhost:${PORT}/api/status`);
      console.log(`🔗 DB Stats: http://localhost:${PORT}/api/db-stats`);
      console.log(`🔗 Clear DB: DELETE http://localhost:${PORT}/api/db-clear`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Server shutting down gracefully...');
  console.log('✅ MongoDB Data API connection closed');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Server shutting down gracefully...');
  console.log('✅ MongoDB Data API connection closed');
  process.exit(0);
});
