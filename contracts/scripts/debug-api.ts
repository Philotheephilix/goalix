import { ApiFootballAdapter } from "../src/adapter/api-football-adapter";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function debugApiFootball() {
  const apiKey = process.env.API_FOOTBALL_KEY;
  
  if (!apiKey) {
    console.error("❌ API_FOOTBALL_KEY environment variable is required");
    process.exit(1);
  }

  console.log("🔑 API Key loaded successfully");
  
  const adapter = new ApiFootballAdapter({ apiKey });
  
  // Test different leagues and seasons
  const testCases = [
    { leagueId: 61, season: 2024, name: "Ligue 1 2024" },
    { leagueId: 39, season: 2024, name: "Premier League 2024" },
    { leagueId: 140, season: 2024, name: "La Liga 2024" },
    { leagueId: 135, season: 2024, name: "Serie A 2024" },
    { leagueId: 78, season: 2024, name: "Bundesliga 2024" },
    { leagueId: 74, season: 2024, name: "Brasileiro Women 2024" },
    { leagueId: 74, season: 2023, name: "Brasileiro Women 2023" },
    { leagueId: 61, season: 2023, name: "Ligue 1 2023" },
  ];

  for (const testCase of testCases) {
    try {
      console.log(`\n🔍 Testing ${testCase.name} (League ID: ${testCase.leagueId}, Season: ${testCase.season})...`);
      
      // Test teams
      const teams = await adapter.fetchTeams(testCase.leagueId, testCase.season);
      console.log(`   ✅ Teams: ${teams.length}`);
      
      if (teams.length > 0) {
        // Test players for first team
        const firstTeam = teams[0];
        console.log(`   📋 Testing players for ${firstTeam.team.name}...`);
        
        const players = await adapter.fetchTeamPlayers(firstTeam.team.id, testCase.leagueId, testCase.season);
        console.log(`   ✅ Players: ${players.length}`);
        
        if (players.length > 0) {
          console.log(`   🎯 SUCCESS: ${testCase.name} has data!`);
          console.log(`   📊 Sample player: ${players[0].player.firstname} ${players[0].player.lastname}`);
          break; // Found working data, stop testing
        } else {
          console.log(`   ⚠️  No players found for ${testCase.name}`);
        }
      } else {
        console.log(`   ⚠️  No teams found for ${testCase.name}`);
      }
      
      // Wait between API calls
      await adapter.waitForRateLimit(1000);
      
    } catch (error) {
      console.error(`   ❌ Error testing ${testCase.name}:`, error);
    }
  }
}

debugApiFootball().catch((error) => {
  console.error("Debug failed:", error);
  process.exit(1);
}); 