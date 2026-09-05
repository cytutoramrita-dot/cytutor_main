import React from 'react';
import { Flame, Shield, Check, CalendarDays } from 'lucide-react';
import Card from '../ui/Card';
import { UserStats } from '../../types';

interface StreakCardProps {
  stats: UserStats;
}

const StreakCard: React.FC<StreakCardProps> = ({ stats }) => {
  // Helper to get local date string YYYY-MM-DD
  const getLocalDateString = (date: Date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = getLocalDateString();
  
  // Helper to generate last 7 days for calendar
  const getLast7Days = () => {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(getLocalDateString(d));
    }
    return dates;
  };
  const last7Days = getLast7Days();

  // Helper to safely parse YYYY-MM-DD to local Date object for formatting
  // This prevents timezone issues where new Date('YYYY-MM-DD') defaults to UTC
  const parseDate = (dateStr: string) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d);
  };

  // Safely access activity history
  const history = stats.activityHistory || [];

  return (
    <Card className="h-full relative overflow-hidden flex flex-col justify-between">
      <div className="absolute top-0 right-0 p-4 opacity-5">
        <Flame className="w-32 h-32" />
      </div>
      
      <div>
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-white">Daily Streak</h3>
            </div>
            {stats.streakFreezes > 0 && (
            <div className="px-2 py-1 bg-blue-500/20 rounded text-xs text-blue-400 font-mono flex items-center gap-1 border border-blue-500/30">
                <Shield className="w-3 h-3" />
                {stats.streakFreezes} Freezes
            </div>
            )}
        </div>

        <div className="flex items-end space-x-2 mb-6">
            <span className="text-4xl font-bold text-white font-mono">{stats.dayStreak}</span>
            <span className="text-sm text-gray-500 mb-1">consecutive days</span>
        </div>
      </div>

      {/* Mini Calendar Visualization */}
      <div className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/5">
        <div className="flex items-center space-x-2 mb-1">
            <CalendarDays className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Last 7 Days</span>
        </div>
        
        <div className="space-y-2">
            {/* Weekday Labels */}
            <div className="flex justify-between px-1">
            {last7Days.map((date, i) => (
                <span key={i} className="text-[10px] text-gray-500 font-mono uppercase w-8 text-center">
                {parseDate(date).toLocaleDateString('en-US', { weekday: 'narrow' })}
                </span>
            ))}
            </div>

            {/* Day Circles */}
            <div className="flex justify-between">
            {last7Days.map((date, i) => {
                const isActive = history.includes(date);
                const isToday = date === today;
                const dateObj = parseDate(date);
                
                return (
                <div 
                    key={i}
                    title={dateObj.toLocaleDateString()}
                    className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-300
                    ${isActive 
                        ? 'bg-neon-green text-black border-neon-green shadow-[0_0_10px_rgba(34,197,94,0.3)] transform scale-105' 
                        : isToday 
                        ? 'bg-white/10 text-white border-white/30 animate-pulse' 
                        : 'bg-black/40 text-gray-600 border-white/5'
                    }
                    `}
                >
                    {isActive ? <Check className="w-4 h-4" /> : dateObj.getDate()}
                </div>
                );
            })}
            </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-center text-gray-500">
        Next Reward: <span className="text-yellow-400 font-bold">50 XP</span> in {7 - (stats.dayStreak % 7)} days
      </p>
    </Card>
  );
};

export default StreakCard;