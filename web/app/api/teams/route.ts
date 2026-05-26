import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const apiUrl =
    "https://v3.football.api-sports.io/teams?league=1&season=2022";
  const apiKey = process.env.API_FOOTBALL_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "API key not configured" },
      { status: 500 }
    );
  }

  const res = await fetch(apiUrl, {
    headers: {
      "x-rapidapi-host": "v3.football.api-sports.io",
      "x-rapidapi-key": apiKey,
    },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: res.status }
    );
  }

  const apiData = await res.json();

  // Transform the response to return only the teams array with relevant info
  const teams = (apiData.response || []).map((item: any) => ({
    id: item.team.id,
    name: item.team.name,
    code: item.team.code,
    country: item.team.country,
    founded: item.team.founded,
    logo: item.team.logo,
    venue: {
      id: item.venue.id,
      name: item.venue.name,
      address: item.venue.address,
      city: item.venue.city,
      capacity: item.venue.capacity,
      surface: item.venue.surface,
      image: item.venue.image,
    },
  }));

  return NextResponse.json(teams);
}
