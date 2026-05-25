"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

interface Player {
  id: number;
  name: string;
  goals: number;
  assists: number;
  current_season_stats: { rating: number };
}

interface PerformancePredictionGraphProps {
  player: Player;
  detailedData?: any;
}

// Generate performance data based on player's current stats
const generatePerformanceData = (player: Player) => {
  const currentGoals = player.goals;
  const currentAssists = player.assists;
  const currentRating = player.current_season_stats.rating;

  // Generate radar chart data comparing player vs average
  const radarData = [
    {
      metric: "Goals",
      player: Math.min((currentGoals / 15) * 100, 100),
      average: 65,
    },
    {
      metric: "Assists",
      player: Math.min((currentAssists / 10) * 100, 100),
      average: 55,
    },
    {
      metric: "Rating",
      player: Math.min((currentRating / 10) * 100, 100),
      average: 70,
    },
    {
      metric: "Attacking",
      player: Math.min(((currentGoals + currentAssists) / 20) * 100, 100),
      average: 60,
    },
    {
      metric: "Consistency",
      player: Math.min(currentRating * 10, 100),
      average: 68,
    },
    { metric: "Form", player: 70 + (Math.random() - 0.5) * 30, average: 65 },
  ];

  // Match performance probabilities similar to API-Football
  const matchPerformance = [
    {
      type: "Next Match Win",
      probability: Math.min(Math.max(30 + (currentRating - 6.5) * 15, 15), 75),
    },
    {
      type: "Goal Scored",
      probability: Math.min(Math.max(40 + (currentGoals / 20) * 40, 25), 85),
    },
    {
      type: "Assist Made",
      probability: Math.min(Math.max(25 + (currentAssists / 15) * 30, 15), 60),
    },
    {
      type: "Man of Match",
      probability: Math.min(Math.max(10 + (currentRating - 7) * 20, 5), 35),
    },
  ];

  // Performance metrics bars (similar to API-Football style)
  const performanceMetrics = [
    {
      name: "ATTACKING POTENTIAL",
      player: Math.min(((currentGoals + currentAssists) / 25) * 100, 100),
      average: 62,
      color: "#00ff88",
    },
    {
      name: "GOAL THREAT",
      player: Math.min((currentGoals / 20) * 100, 100),
      average: 45,
      color: "#0088ff",
    },
    {
      name: "PLAYMAKING",
      player: Math.min((currentAssists / 15) * 100, 100),
      average: 38,
      color: "#ff8800",
    },
    {
      name: "CONSISTENCY",
      player: Math.min(currentRating * 10, 100),
      average: 68,
      color: "#88ff00",
    },
    {
      name: "FORM H2H",
      player: 55 + (Math.random() - 0.5) * 30,
      average: 50,
      color: "#ff0088",
    },
    {
      name: "WINS THE GAME",
      player: Math.min(Math.max(25 + (currentRating - 6.5) * 15, 15), 70),
      average: 42,
      color: "#00ffff",
    },
  ];

  // Goal performance expectations (Under/Over style)
  const goalPerformance = [
    {
      type: "Under 0.5 Goals",
      probability: Math.max(100 - (currentGoals / 5) * 80, 20),
    },
    {
      type: "Over 0.5 Goals",
      probability: Math.min((currentGoals / 5) * 80, 80),
    },
    {
      type: "Over 1.5 Goals",
      probability: Math.min((currentGoals / 5) * 45, 45),
    },
    {
      type: "Over 2.5 Goals",
      probability: Math.min((currentGoals / 5) * 25, 25),
    },
  ];

  return {
    radarData,
    matchPerformance,
    performanceMetrics,
    goalPerformance,
  };
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-3 shadow-lg">
        <p className="text-zinc-300 font-medium">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {`${entry.name}: ${entry.value.toFixed(1)}${
              entry.name.includes("probability") ? "%" : ""
            }`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const PerformancePredictionGraph: React.FC<PerformancePredictionGraphProps> = ({
  player,
  detailedData,
}) => {
  const performanceData = generatePerformanceData(player);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Available Performance Header */}
      <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/60 backdrop-blur-sm rounded-xl p-4 border border-red-500/20">
        <h3 className="text-base font-medium text-white mb-3 bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
          Available Performance
        </h3>
        <div className="flex flex-col gap-2">
          {performanceData.matchPerformance.map(
            (performance: any, index: number) => (
              <div
                key={index}
                className="flex justify-between items-center p-2 bg-gradient-to-r from-zinc-800/60 to-zinc-700/40 rounded-lg border border-red-500/10"
              >
                <span className="text-zinc-300 text-xs font-light">{performance.type}:</span>
                <span className="text-red-400 font-medium">
                  {performance.probability.toFixed(0)}%
                </span>
              </div>
            )
          )}
        </div>
      </div>

      {/* Radar Chart - Player vs Average */}
      <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/60 backdrop-blur-sm rounded-xl p-4 border border-red-500/20">
        <h3 className="text-base font-medium text-white mb-3 text-center bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
          {player.name} vs League Average
        </h3>
        <div className="h-48 md:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={performanceData.radarData}>
              <PolarGrid stroke="#374151" strokeDasharray="2 2" />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fill: "#9CA3AF", fontSize: 9, fontWeight: 300 }}
              />
              <PolarRadiusAxis
                angle={0}
                domain={[0, 100]}
                tick={{ fill: "#9CA3AF", fontSize: 7, fontWeight: 300 }}
                axisLine={false}
                tickCount={6}
              />
              <Radar
                name={player.name}
                dataKey="player"
                stroke="url(#redGradient)"
                fill="url(#redGradient)"
                fillOpacity={0.2}
                strokeWidth={1.5}
                dot={{ fill: "#CF0A0A", strokeWidth: 1.5, r: 2.5 }}
              />
              <Radar
                name="League Average"
                dataKey="average"
                stroke="#0088ff"
                fill="#0088ff"
                fillOpacity={0.1}
                strokeWidth={1.5}
                dot={{ fill: "#0088ff", strokeWidth: 1.5, r: 2.5 }}
              />
              <defs>
                <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#CF0A0A" />
                  <stop offset="100%" stopColor="#8B0000" />
                </linearGradient>
              </defs>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #4b5563",
                  borderRadius: "8px",
                  color: "#f3f4f6",
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex justify-center space-x-4">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-gradient-to-r from-red-400 to-red-600 rounded-full"></div>
            <span className="text-zinc-300 text-xs font-light">{player.name}</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span className="text-zinc-300 text-xs font-light">League Average</span>
          </div>
        </div>
      </div>

      {/* Performance Metrics (API-Football Style) */}
      <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/60 backdrop-blur-sm rounded-xl p-4 border border-red-500/20">
        <h3 className="text-base font-medium text-white mb-3 bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
          Performance Analysis
        </h3>
        <div className="space-y-2">
          {performanceData.performanceMetrics.map(
            (metric: any, index: number) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-300 font-light text-xs">
                    {metric.name}
                  </span>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="text-red-400 font-medium">
                      {metric.player.toFixed(0)}%
                    </span>
                    <span className="text-zinc-500 font-light">
                      {metric.average.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <div className="w-full bg-zinc-700 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all duration-500 bg-gradient-to-r from-red-400 to-red-600"
                      style={{
                        width: `${metric.player}%`,
                      }}
                    />
                  </div>
                  <div className="absolute top-0 left-0 w-full h-1.5 flex items-center">
                    <div
                      className="w-0.5 h-2 bg-zinc-400 relative"
                      style={{ marginLeft: `${metric.average}%` }}
                    >
                      <div className="absolute -top-0.5 -left-0.5 w-1 h-1 bg-zinc-400 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
        <div className="mt-2 flex justify-end space-x-2 text-xs text-zinc-500">
          <div className="flex items-center space-x-1">
            <div className="w-1 h-1 bg-gradient-to-r from-red-400 to-red-600 rounded-full"></div>
            <span className="font-light">Player</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-1 h-1 bg-zinc-400 rounded-full"></div>
            <span className="font-light">Average</span>
          </div>
        </div>
      </div>

      {/* Goal Performance (Under/Over Style) */}
      <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/60 backdrop-blur-sm rounded-xl p-4 border border-red-500/20">
        <h3 className="text-base font-medium text-white mb-3 bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">Goal Performance</h3>
        <div className="space-y-1.5">
          {performanceData.goalPerformance.map(
            (performance: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gradient-to-r from-zinc-800/60 to-zinc-700/40 rounded-lg border border-red-500/10"
              >
                <div className="flex items-center space-x-1.5">
                  <span className="text-zinc-300 text-xs font-light">{performance.type}</span>
                  <span className="text-xs text-zinc-500 font-light">
                    {performance.type.includes("Under")
                      ? "max goals"
                      : "min goals"}
                  </span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="w-10 bg-zinc-700 rounded-full h-1">
                    <div
                      className="bg-gradient-to-r from-red-400 to-red-600 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${performance.probability}%` }}
                    />
                  </div>
                  <span className="text-red-400 font-medium text-xs w-6">
                    {performance.probability.toFixed(0)}%
                  </span>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformancePredictionGraph;
