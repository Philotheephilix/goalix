// API Football Adapter for fetching real football data
// Documentation: https://www.api-football.com/documentation-v3

export interface ApiFootballConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface ApiFootballTeam {
  team: {
    id: number;
    name: string;
    code: string;
    country: string;
    founded: number;
    national: boolean;
    logo: string;
  };
  venue: {
    id: number;
    name: string;
    address: string;
    city: string;
    capacity: number;
    surface: string;
    image: string;
  };
}

export interface ApiFootballPlayer {
  player: {
    id: number;
    name: string;
    firstname: string;
    lastname: string;
    age: number;
    nationality: string;
    height: string;
    weight: string;
    injured: boolean;
    photo: string;
  };
  statistics: Array<{
    team: {
      id: number;
      name: string;
      logo: string;
    };
    league: {
      id: number;
      name: string;
      country: string;
      logo: string;
      flag: string;
      season: number;
    };
    games: {
      appearences: number;
      lineups: number;
      minutes: number;
      number: number;
      position: string;
      rating: string;
      captain: boolean;
    };
    substitutes: {
      in: number;
      out: number;
      bench: number;
    };
    shots: {
      total: number;
      on: number;
    };
    goals: {
      total: number;
      conceded: number;
      assists: number;
      saves: number;
    };
    passes: {
      total: number;
      key: number;
      accuracy: number;
    };
    tackles: {
      total: number;
      blocks: number;
      interceptions: number;
    };
    duels: {
      total: number;
      won: number;
    };
    dribbles: {
      attempts: number;
      success: number;
      past: number;
    };
    fouls: {
      drawn: number;
      committed: number;
    };
    cards: {
      yellow: number;
      yellowred: number;
      red: number;
    };
    penalty: {
      won: number;
      commited: number;
      scored: number;
      missed: number;
      saved: number;
    };
  }>;
}

export interface ApiFootballResponse<T> {
  get: string;
  parameters: Record<string, any>;
  errors: any[];
  results: number;
  paging: {
    current: number;
    total: number;
  };
  response: T[];
}

export class ApiFootballAdapter {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: ApiFootballConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://v3.football.api-sports.io';
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'x-rapidapi-key': this.apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API Football request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.errors && data.errors.length > 0) {
      throw new Error(`API Football errors: ${JSON.stringify(data.errors)}`);
    }

    return data as T;
  }

  /**
   * Fetch all teams in a league for a specific season
   */
  async fetchTeams(leagueId: number, season: number): Promise<ApiFootballTeam[]> {
    try {
      console.log(`Fetching teams for league ${leagueId}, season ${season}...`);
      
      const response = await this.makeRequest<ApiFootballResponse<ApiFootballTeam>>('/teams', {
        league: leagueId,
        season: season
      });

      console.log(`Found ${response.response.length} teams`);
      return response.response;
    } catch (error) {
      console.error('Error fetching teams:', error);
      throw error;
    }
  }

  /**
   * Fetch all players for a specific team in a league and season
   */
  async fetchTeamPlayers(teamId: number, leagueId: number, season: number): Promise<ApiFootballPlayer[]> {
    try {
      console.log(`Fetching players for team ${teamId} in league ${leagueId}, season ${season}...`);
      
      const response = await this.makeRequest<ApiFootballResponse<ApiFootballPlayer>>('/players', {
        team: teamId,
        league: leagueId,
        season: season
      });

      console.log(`Found ${response.response.length} players`);
      
      // Debug: Log the first few players if any exist
      if (response.response.length > 0) {
        console.log(`Sample player: ${response.response[0].player.firstname} ${response.response[0].player.lastname} (ID: ${response.response[0].player.id})`);
        console.log(`Statistics entries: ${response.response[0].statistics.length}`);
      } else {
        console.log(`No players found for team ${teamId} in league ${leagueId}, season ${season}`);
      }
      
      return response.response;
    } catch (error) {
      console.error('Error fetching players:', error);
      throw error;
    }
  }

  /**
   * Fetch player statistics for a specific player in a league and season
   */
  async fetchPlayerStats(playerId: number, leagueId: number, season: number): Promise<ApiFootballPlayer | null> {
    try {
      console.log(`Fetching stats for player ${playerId} in league ${leagueId}, season ${season}...`);
      
      const response = await this.makeRequest<ApiFootballResponse<ApiFootballPlayer>>('/players', {
        id: playerId,
        league: leagueId,
        season: season
      });

      return response.response.length > 0 ? response.response[0] : null;
    } catch (error) {
      console.error('Error fetching player stats:', error);
      throw error;
    }
  }

  /**
   * Get league information
   */
  async getLeagueInfo(leagueId: number): Promise<any> {
    try {
      const response = await this.makeRequest('/leagues', { id: leagueId });
      return response;
    } catch (error) {
      console.error('Error fetching league info:', error);
      throw error;
    }
  }

  /**
   * Rate limiting helper - wait between requests to respect API limits
   */
  async waitForRateLimit(ms: number = 1000): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }
} 