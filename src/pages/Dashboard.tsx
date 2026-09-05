import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Assignment } from '../types';
import { users, classrooms } from '../services/api';
import StreakModal from '../components/StreakModal';
import StatsOverview from '../components/dashboard/StatsOverview';
import StreakCard from '../components/dashboard/StreakCard';
import TrainingDomains from '../components/dashboard/TrainingDomains';
import ActivityLeaderboard from '../components/dashboard/ActivityLeaderboard';
import { Clock, CheckCircle, AlertCircle, GraduationCap, ChevronRight } from 'lucide-react';

interface DashboardProps {
  user: User;
  onUpdateUser: (user: User) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onUpdateUser }) => {
  const [streakStatus, setStreakStatus] = useState<'extended' | 'frozen' | 'broken' | 'new' | null>(null);
  const [streakReward, setStreakReward] = useState<{ xp: number, points: number, message?: string } | undefined>(undefined);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [pendingAssignments, setPendingAssignments] = useState<Assignment[]>([]);
  const displayName = user.username || user.fullName || user.email.split('@')[0];

  useEffect(() => {
    const checkStreak = async () => {
      try {
        // Check if we've already shown the streak modal today
        const today = new Date().toDateString();
        const lastShown = localStorage.getItem('streakModalLastShown');

        if (lastShown === today) {
          // Already shown today, skip
          return;
        }

        const { status, stats, reward } = await users.checkStreak();

        if (status !== 'same_day') {
          const updatedUser = { ...user, stats: { ...user.stats, ...stats } };
          onUpdateUser(updatedUser);
          setStreakStatus(status as any);
          setStreakReward(reward);
          setShowStreakModal(true);

          // Mark that we've shown the modal today
          localStorage.setItem('streakModalLastShown', today);
        }
      } catch (error) {
        console.error("Failed to check streak:", error);
      }
    };

    checkStreak();

    classrooms.getMyAssignments().then(data => {
      const pending = data.filter(a => !a.is_correct);
      setPendingAssignments(pending.slice(0, 5));
    }).catch(() => {});
  }, []);

  const handleRepairStreak = async () => {
    try {
      const { success, newStreak, pointsSpent } = await users.restoreStreak();
      if (success) {
        const updatedUser = {
          ...user,
          stats: {
            ...user.stats,
            dayStreak: newStreak,
            totalPoints: user.stats.totalPoints - pointsSpent,
            previousStreak: undefined // Clear previous streak
          }
        };
        onUpdateUser(updatedUser);
        setShowStreakModal(false);
      }
    } catch (error) {
      console.error("Failed to repair streak:", error);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in relative">
      {/* Streak Modal Overlay */}
      {showStreakModal && streakStatus && (
        <StreakModal
          status={streakStatus}
          streakCount={user.stats.dayStreak}
          userPoints={user.stats.totalPoints}
          reward={streakReward}
          onClose={() => setShowStreakModal(false)}
          onRepair={streakStatus === 'broken' ? handleRepairStreak : undefined}
        />
      )}

      {/* Header Section */}
      <div className="flex flex-row md:flex-col justify-between items-center md:items-start">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Welcome back, <span className="text-neon-green">{displayName}</span></h1>
          <p className="text-gray-400">System status optimal. Ready for training.</p>
        </div>
        <div className="mt-0 md:mt-4 flex items-center space-x-4">
          <div className="text-right">
            <p className="text-xs text-gray-500 font-bold uppercase">Current Level</p>
            <p className="text-2xl font-mono text-neon-purple font-bold">{user.stats.level}</p>
          </div>
          {(() => {
            const xpInLevel = user.stats.xp % 1000;
            const pct = Math.round((xpInLevel / 1000) * 100);
            const r = 26;
            const circ = 2 * Math.PI * r;
            const dash = (pct / 100) * circ;
            return (
              <div className="w-16 h-16 flex items-center justify-center relative">
                <svg width="64" height="64" className="-rotate-90">
                  <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(139,92,246,0.2)" strokeWidth="4" />
                  <circle
                    cx="32" cy="32" r={r} fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="4"
                    strokeDasharray={`${dash} ${circ}`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-xs font-bold text-white">{pct}%</span>
              </div>
            );
          })()}
        </div>
      </div>

      {!user.isProfileComplete && (
        <div className="rounded-2xl border border-neon-green/20 bg-neon-green/5 p-4 flex flex-row md:flex-col md:items-start items-center justify-between gap-4">
          <div>
            <p className="text-white font-semibold">Complete your profile when you&apos;re ready</p>
            <p className="text-sm text-gray-400">Learning is already unlocked. Add your profile details later for personalization.</p>
          </div>
          <Link
            to="/onboarding"
            className="px-4 py-2 rounded-lg bg-neon-green text-black font-bold hover:bg-neon-green-dark transition-colors"
          >
            Finish Profile
          </Link>
        </div>
      )}

      {/* Stats and Streak Grid */}
      <div className="grid grid-cols-3 lg:grid-cols-1 gap-8">

        {/* Main Stats Grid */}
        <div className="col-span-2 lg:col-span-1">
          <StatsOverview stats={user.stats} />
        </div>

        {/* Streak & Calendar Card */}
        <div className="col-span-1 lg:col-span-1">
          <StreakCard stats={user.stats} />
        </div>

      </div>

      {/* Domain Cards */}
      <TrainingDomains />

      {/* Activity Log & Leaderboard */}
      <ActivityLeaderboard user={user} />

      {/* Classroom Assignments Widget */}
      {pendingAssignments.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <GraduationCap className="w-5 h-5 text-neon-green" />
              <span>Pending Assignments</span>
            </h2>
            <Link to="/classrooms" className="text-sm text-neon-green hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {pendingAssignments.map(a => {
              const title = a.challenge_title ?? a.cc_title ?? a.title;
              const isOverdue = a.due_date && new Date(a.due_date) < new Date() && !a.is_correct;
              const hasAttempt = (a.attempts ?? 0) > 0;
              return (
                <Link key={a.id} to={`/assignments/${a.id}`}
                  className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/2 hover:border-neon-green/30 hover:bg-neon-green/5 transition-all group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-0.5">
                      {isOverdue
                        ? <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                        : hasAttempt
                        ? <AlertCircle className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                        : <Clock className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                      <span className={`text-xs font-mono ${isOverdue ? 'text-red-400' : hasAttempt ? 'text-yellow-400' : 'text-gray-500'}`}>
                        {isOverdue ? 'Overdue' : hasAttempt ? 'Attempted' : 'Pending'}
                      </span>
                      {a.classroom_name && (
                        <span className="text-xs text-gray-600 truncate">— {a.classroom_name}</span>
                      )}
                    </div>
                    <p className="text-white font-medium truncate">{a.title}</p>
                    <p className="text-xs text-gray-500 truncate">{title}</p>
                    {a.due_date && (
                      <p className="text-xs text-gray-600 mt-0.5">
                        Due {new Date(a.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-neon-green transition-colors ml-3 flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
