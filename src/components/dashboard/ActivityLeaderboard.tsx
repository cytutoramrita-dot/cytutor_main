import React, { useState, useEffect } from 'react';
import { Trophy, Clock, BookOpen, Target } from 'lucide-react';
import Card from '../ui/Card';
import { User } from '../../types';
import { analyticsService, RecentActivity, LeaderboardEntry } from '../../services/analyticsApi';

interface ActivityLeaderboardProps {
  user: User;
}

const ActivityLeaderboard: React.FC<ActivityLeaderboardProps> = ({ user }) => {
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [activityData, leaderboardData] = await Promise.all([
          analyticsService.getRecentActivity(5),
          analyticsService.getLeaderboard(5, 'week')
        ]);
        setRecentActivity(activityData);
        setLeaderboard(leaderboardData);
      } catch (error) {
        console.error('Failed to fetch activity data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const getActivityIcon = (type: string) => {
    return type === 'tutorial' ? BookOpen : Target;
  };

  const getActivityPoints = (type: string, progress: number) => {
    if (type === 'tutorial' && progress === 100) return '+50 XP';
    if (type === 'challenge' && progress === 100) return '+100 PTS';
    return '+10 XP';
  };

  return (
    <div className="grid grid-cols-3 lg:grid-cols-1 gap-8 mt-8">
      <div className="col-span-2 lg:col-span-1">
        <Card>
          <h3 className="text-lg font-bold text-white mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-neon-green" />
            Recent Activity
          </h3>
          <div className="space-y-4">
            {loading ? (
              // Loading skeleton
              [1,2,3].map((i) => (
                <div key={i} className="flex items-center space-x-4 p-3 animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-600 rounded w-3/4 mb-1"></div>
                    <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                  </div>
                  <div className="h-4 bg-gray-600 rounded w-16"></div>
                </div>
              ))
            ) : recentActivity.length > 0 ? (
              recentActivity.map((activity, i) => {
                const IconComponent = getActivityIcon(activity.type);
                return (
                  <div key={i} className="flex items-center space-x-4 p-3 hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/10">
                    <div className="w-2 h-2 rounded-full bg-neon-green"></div>
                    <IconComponent className="w-4 h-4 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm text-white">
                        {activity.status === 'completed' ? 'Completed' : 'Started'} {activity.type} 
                        <span className="text-neon-green font-mono ml-1">{activity.name}</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTimeAgo(activity.activity_date)} • {activity.category}
                      </p>
                    </div>
                    <span className="text-xs font-mono text-yellow-400">
                      {getActivityPoints(activity.type, activity.progress)}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400">No recent activity</p>
                <p className="text-xs text-gray-500">Start a tutorial or challenge to see activity here</p>
              </div>
            )}
          </div>
        </Card>
      </div>
      <div className="col-span-1 lg:col-span-1">
        <Card className="h-full bg-gradient-to-b from-neon-purple/10 to-transparent border-neon-purple/20">
          <div className="text-center py-8">
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
            <h3 className="text-xl font-bold text-white">Weekly Leaderboard</h3>
            <p className="text-sm text-gray-400 mb-6">Top agents this week</p>
            <div className="space-y-2">
              {loading ? (
                // Loading skeleton
                [1,2,3].map((i) => (
                  <div key={i} className="flex justify-between items-center p-2 rounded animate-pulse">
                    <div className="h-4 bg-gray-600 rounded w-20"></div>
                    <div className="h-4 bg-gray-600 rounded w-12"></div>
                  </div>
                ))
              ) : leaderboard.length > 0 ? (
                leaderboard.map((entry, i) => {
                  const isCurrentUser = entry.username === user.username;
                  return (
                    <div key={i} className={`flex justify-between items-center p-2 rounded ${isCurrentUser ? 'bg-neon-green/20 border border-neon-green/30' : ''}`}>
                      <span className="font-mono text-sm text-gray-300">
                        {i+1}. {entry.username || entry.full_name || 'Anonymous'}
                      </span>
                      <span className="font-mono text-sm text-neon-green">
                        {entry.total_points || 0}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-400 text-sm">No leaderboard data</p>
                  <p className="text-xs text-gray-500">Complete challenges to appear here</p>
                </div>
              )}
              
              {/* Show current user if not in top leaderboard */}
              {!loading && leaderboard.length > 0 && !leaderboard.some(entry => entry.username === user.username) && (
                <>
                  <div className="border-t border-gray-600 my-2"></div>
                  <div className="flex justify-between items-center p-2 rounded bg-neon-green/20 border border-neon-green/30">
                    <span className="font-mono text-sm text-gray-300">
                      ... {user.username || 'You'}
                    </span>
                    <span className="font-mono text-sm text-neon-green">
                      {user.stats.totalPoints}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ActivityLeaderboard;