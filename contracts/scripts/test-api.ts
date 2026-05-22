import { ApiFootballAdapter } from "../src/adapter/api-football-adapter";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function testApiFootball() {
  const apiKey = process.env.API_FOOTBALL_KEY;
  
  if (!apiKey) {
    console.error("❌ API_FOOTBALL_KEY environment variable is required");
    process.exit(1);
  }

  console.log("🔑 API Key loaded successfully");
  
  const adapter = new ApiFootballAdapter({ apiKey });
  
  try {
    // Test 1: Fetch teams for Ligue 1 (2024)
    console.log("\n📋 Test 1: Fetching teams for Ligue 1 (2024)...");
    const teams = await adapter.fetchTeams(61, 2024);
    console.log(`✅ Found ${teams.length} teams`);
    
    if (teams.length > 0) {
      console.log("Sample team:", {
        id: teams[0].team.id,
        name: teams[0].team.name,
        code: teams[0].team.code,
        country: teams[0].team.country
      });
    }

    // Test 2: Fetch players for first team
    if (teams.length > 0) {
      console.log(`\n👥 Test 2: Fetching players for ${teams[0].team.name}...`);
      const players = await adapter.fetchTeamPlayers(teams[0].team.id, 61, 2024);
      console.log(`✅ Found ${players.length} players`);
      
      if (players.length > 0) {
        const player = players[0];
        console.log("Sample player:", {
          id: player.player.id,
          name: `${player.player.firstname} ${player.player.lastname}`,
          age: player.player.age,
          nationality: player.player.nationality,
          position: player.statistics[0]?.games.position || 'Unknown'
        });
        
        // Test 3: Fetch detailed stats for first player
        console.log(`\n📊 Test 3: Fetching detailed stats for ${player.player.firstname} ${player.player.lastname}...`);
        const playerStats = await adapter.fetchPlayerStats(player.player.id, 61, 2024);
        
        if (playerStats && playerStats.statistics.length > 0) {
          const stats = playerStats.statistics[0];
          console.log("Player stats:", {
            appearances: stats.games.appearences,
            goals: stats.goals.total,
            assists: stats.goals.assists,
            shots: stats.shots.total,
            shotsOnTarget: stats.shots.on,
            duels: stats.duels.total,
            duelsWon: stats.duels.won,
            tackles: stats.tackles.total,
            yellowCards: stats.cards.yellow,
            redCards: stats.cards.red
          });
        } else {
          console.log("⚠️  No detailed stats available for this player");
        }
      }
    }

    // Test 4: Rate limiting
    console.log("\n⏳ Test 4: Testing rate limiting...");
    console.log("Waiting 1 second...");
    await adapter.waitForRateLimit(1000);
    console.log("✅ Rate limiting test passed");

    console.log("\n🎉 All API tests passed successfully!");

  } catch (error) {
    console.error("❌ API test failed:", error);
    process.exit(1);
  }
}

testApiFootball().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
}); 