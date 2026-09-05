import React from 'react';
import { Trophy, Target, Globe, Flame } from 'lucide-react';
import Card from '../ui/Card';
import { UserStats } from '../../types';

interface StatsOverviewProps {
  stats: UserStats;
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ stats }) => {
  const statItems = [
    { label: 'Challenges Solved', value: stats.challengesSolved, icon: Target, color: 'text-blue-400' },
    { label: 'Total Points', value: stats.totalPoints, icon: Trophy, color: 'text-yellow-400' },
    { label: 'Global Rank', value: `#${stats.globalRank}`, icon: Globe, color: 'text-purple-400' },
    { label: 'Day Streak', value: stats.dayStreak, icon: Flame, color: 'text-orange-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
      {statItems.map((stat, idx) => (
        <Card key={idx} className="flex items-center space-x-4">
          <div className={`p-3 rounded-lg bg-white/5 ${stat.color}`}>
            <stat.icon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase">{stat.label}</p>
            <p className="text-2xl font-bold font-mono text-white">{stat.value}</p>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default StatsOverview;