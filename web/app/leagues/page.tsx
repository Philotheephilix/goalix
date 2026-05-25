"use client"

import { useState } from "react"
import { Badge } from "../components/ui/badge"
import { ArrowRight, Trophy, Globe, Users, TrendingUp, Lock } from "lucide-react"
import Link from "next/link"


const leagues = [
  {
    id: "world-cup",
    name: "World Cup",
    country: "International",
    teams: 32,
    value: "2022",
    tier: "Top",
    accent: "from-yellow-400 to-amber-600",
    borderColor: "border-yellow-500/50",
    textColor: "text-yellow-400",
    image: "https://media.api-sports.io/football/leagues/1.png",
    gradient: "from-yellow-900/20 to-amber-900/20",
    locked: false
  },
]

export default function LeaguesPage() {
  const [selectedTier, setSelectedTier] = useState("All")
  const tiers = ["All", "Elite", "Top"]

  const filteredLeagues = selectedTier === "All" ? leagues : leagues.filter((league) => league.tier === selectedTier)

  return (
    <div className="min-h-screen  text-white mt-12">
      <div className="flex justify-center mb-16 relative z-10 ">
        <div className="flex space-x-1 bg-zinc-900/80 rounded-2xl p-1 backdrop-blur-md border border-zinc-800/50 shadow-2xl">
          {tiers.map((tier) => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`px-8 py-3 rounded-xl font-mono font-medium tracking-wide uppercase transition-all duration-300 ${
                selectedTier === tier
                  ? "bg-red-600 text-white shadow-lg shadow-red-500/25"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      {/* Leagues Grid */}
      <div className="container mx-auto px-6 pb-20 space-y-6 relative z-10 ">
        {filteredLeagues.map((league, index) => (
          <div key={league.id} className={`relative ${league.locked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
            {league.locked && (
              <Link href={`/team`}>
                <div 
                  className="relative rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 group h-50 w-full mb-10 opacity-80 grayscale"
                  style={{
                    animationDelay: `${index * 100}ms`,
                  }}
                >
                  {/* Background Image */}
                  <div 
                    className="absolute inset-0 bg-cover bg-center transition-all duration-700"
                    style={{
                      backgroundImage: `url(${league.image})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                      filter: " brightness(1)",
                    }}
                  />
                  <div className={`absolute inset-0 border-2 border-transparent transition-all duration-300 rounded-2xl`} />
                  
                  <div className="relative h-full p-8 flex items-center justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${league.accent} text-white shadow-lg`} />
                          <h3 className={`text-3xl font-mono font-bold text-white tracking-wide transition-colors duration-300`}>
                            {league.name}
                          </h3>
                        </div>
                        <Badge
                          className={`${league.borderColor} text-white border bg-zinc-900/50 px-4 py-1 text-xs uppercase font-mono backdrop-blur-sm`}
                        >
                          {league.tier}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-zinc-300">
                        <Globe className="w-4 h-4" />
                        <p className="text-lg font-medium">{league.country}</p>
                      </div>
                      
                      {/* Stats */}
                      <div className="flex space-x-10 text-sm">
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-zinc-400" />
                          <div>
                            <span className="text-zinc-400 uppercase tracking-wide text-xs">Teams</span>
                            <div className="text-white font-mono font-bold text-lg">{league.teams}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="w-4 h-4 text-zinc-400" />
                          <div>
                            <span className="text-zinc-400 uppercase tracking-wide text-xs">Value</span>
                            <div className="text-white font-mono font-bold text-lg">{league.value}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Trophy className="w-4 h-4 text-zinc-400" />
                          <div>
                            <span className="text-zinc-400 uppercase tracking-wide text-xs">Rating</span>
                            <div className="text-white font-mono font-bold text-lg">9.{Math.floor(Math.random() * 10)}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right - Lock Icon */}
                    <div className="flex-shrink-0 ml-8">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-0.5 bg-zinc-600 transition-all duration-300" />
                        <div className="w-14 h-14 bg-zinc-800/50 rounded-2xl flex items-center justify-center border border-zinc-700/50">
                          <Lock className="w-6 h-6 text-zinc-500" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {!league.locked && (
              <Link href={`/team`}>
                <div 
                  className="relative rounded-2xl overflow-hidden shadow-2xl hover:shadow-red-500/20 transition-all duration-500 group h-50  w-full transform hover:-translate-y-1 mb-10"
                  style={{
                    animationDelay: `${index * 100}ms`,
                  }}
                >
                  {/* Background Image */}
                  <div 
                    className="absolute inset-0 bg-cover bg-center transition-all duration-700 group-hover:scale-105"
                    style={{
                      backgroundImage: `url(${league.image})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                      filter: " brightness(0.8)",
                    
                    }}
                  />
                  <div className={`absolute inset-0 border-2 border-transparent group-hover:${league.borderColor} transition-all duration-300 rounded-2xl`} />
                  
                  <div className="relative h-full p-8 flex items-center justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-3 text-white">
                          <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${league.accent} text-white shadow-lg`} />
                          <h3 className={`text-3xl font-mono font-bold text-white tracking-wide group-hover:${league.textColor} transition-colors duration-300`}>
                            {league.name}
                          </h3>
                        </div>
                        <Badge
                          className={`${league.borderColor} ${league.textColor} border bg-zinc-900/50 px-4 py-1 text-xs uppercase font-mono backdrop-blur-sm`}
                        >
                          {league.tier}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-zinc-300">
                        <Globe className="w-4 h-4" />
                        <p className="text-lg font-medium">{league.country}</p>
                      </div>
                      
                      {/* Stats */}
                      <div className="flex space-x-10 text-sm">
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-zinc-400" />
                          <div>
                            <span className="text-zinc-400 uppercase tracking-wide text-xs">Teams</span>
                            <div className="text-white font-mono font-bold text-lg">{league.teams}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="w-4 h-4 text-zinc-400" />
                          <div>
                            <span className="text-zinc-400 uppercase tracking-wide text-xs">Value</span>
                            <div className="text-white font-mono font-bold text-lg">{league.value}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Trophy className="w-4 h-4 text-zinc-400" />
                          <div>
                            <span className="text-zinc-400 uppercase tracking-wide text-xs">Rating</span>
                            <div className="text-white font-mono font-bold text-lg">9.{Math.floor(Math.random() * 10)}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right - Arrow with Line */}
                    <div className="flex-shrink-0 ml-8">
                      <div className="flex items-center space-x-4">
                        <div className={`w-16 h-0.5 bg-zinc-600 group-hover:bg-gradient-to-r group-hover:${league.accent} transition-all duration-300`} />
                        <div className={`w-14 h-14 bg-zinc-800/50 rounded-2xl flex items-center justify-center group-hover:bg-gradient-to-r group-hover:${league.accent} group-hover:shadow-lg transition-all duration-300 border border-zinc-700/50 group-hover:border-transparent`}>
                          <ArrowRight className={`w-6 h-6 text-zinc-400 group-hover:${league.textColor} transition-colors duration-300`} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
