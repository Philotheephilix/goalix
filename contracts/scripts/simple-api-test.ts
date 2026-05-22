import { ApiFootballAdapter } from "../src/adapter/api-football-adapter";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function simpleApiTest() {
  const apiKey = process.env.API_FOOTBALL_KEY;
  
  if (!apiKey) {
    console.error("❌ API_FOOTBALL_KEY environment variable is required");
    process.exit(1);
  }

  console.log("🔑 API Key loaded successfully");
  console.log("🔑 API Key (first 10 chars):", apiKey.substring(0, 10) + "...");
  
  const adapter = new ApiFootballAdapter({ apiKey });
  
  try {
    // Test 1: Try Ligue 1 2024 (should have data)
    console.log("\n🔍 Test 1: Ligue 1 2024");
    const teams = await adapter.fetchTeams(61, 2024);
    console.log(`✅ Found ${teams.length} teams`);
    
    if (teams.length > 0) {
      const firstTeam = teams[0];
      console.log(`📋 Testing players for ${firstTeam.team.name} (ID: ${firstTeam.team.id})`);
      
      const players = await adapter.fetchTeamPlayers(firstTeam.team.id, 61, 2024);
      console.log(`✅ Found ${players.length} players`);
      
      if (players.length > 0) {
        console.log(`🎯 SUCCESS! Sample player: ${players[0].player.firstname} ${players[0].player.lastname}`);
        return; // Found working data
      }
    }

    // Test 2: Try Premier League 2024
    console.log("\n🔍 Test 2: Premier League 2024");
    const teams2 = await adapter.fetchTeams(39, 2024);
    console.log(`✅ Found ${teams2.length} teams`);
    
    if (teams2.length > 0) {
      const firstTeam = teams2[0];
      console.log(`📋 Testing players for ${firstTeam.team.name} (ID: ${firstTeam.team.id})`);
      
      const players = await adapter.fetchTeamPlayers(firstTeam.team.id, 39, 2024);
      console.log(`✅ Found ${players.length} players`);
      
      if (players.length > 0) {
        console.log(`🎯 SUCCESS! Sample player: ${players[0].player.firstname} ${players[0].player.lastname}`);
        return; // Found working data
      }
    }

    // Test 3: Try Brasileiro Women 2024
    console.log("\n🔍 Test 3: Brasileiro Women 2024");
    const teams3 = await adapter.fetchTeams(74, 2024);
    console.log(`✅ Found ${teams3.length} teams`);
    
    if (teams3.length > 0) {
      const firstTeam = teams3[0];
      console.log(`📋 Testing players for ${firstTeam.team.name} (ID: ${firstTeam.team.id})`);
      
      const players = await adapter.fetchTeamPlayers(firstTeam.team.id, 74, 2024);
      console.log(`✅ Found ${players.length} players`);
      
      if (players.length > 0) {
        console.log(`🎯 SUCCESS! Sample player: ${players[0].player.firstname} ${players[0].player.lastname}`);
        return; // Found working data
      }
    }

    console.log("\n❌ No working league/season combination found");
    console.log("💡 Try checking your API key permissions or try different leagues/seasons");

  } catch (error) {
    console.error("❌ API test failed:", error);
    process.exit(1);
  }
}

simpleApiTest().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
}); 