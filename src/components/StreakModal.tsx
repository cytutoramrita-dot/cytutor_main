import React from 'react';
import { Flame, Shield, XCircle, Award, RefreshCcw, Star, Trophy } from 'lucide-react';

interface StreakModalProps {
  status: 'extended' | 'frozen' | 'broken' | 'new';
  streakCount: number;
  onClose: () => void;
  onRepair?: () => void;
  userPoints?: number;
  reward?: {
    xp: number;
    points: number;
    message?: string;
  };
}

const StreakModal: React.FC<StreakModalProps> = ({ status, streakCount, onClose, onRepair, userPoints = 0, reward }) => {
  const REPAIR_COST = 100;

  const getContent = () => {
    switch (status) {
      case 'extended':
        return {
          icon: Flame,
          color: 'text-orange-500',
          bg: 'bg-orange-500/10',
          border: 'border-orange-500/20',
          title: 'Streak Extended!',
          message: `You're on fire! ${streakCount} day${streakCount > 1 ? 's' : ''} in a row.`,
          button: 'Keep Going'
        };
      case 'frozen':
        return {
          icon: Shield,
          color: 'text-blue-400',
          bg: 'bg-blue-400/10',
          border: 'border-blue-400/20',
          title: 'Streak Frozen',
          message: 'You missed a day, but your Streak Freeze protected your progress!',
          button: 'Phew, Thanks!'
        };
      case 'broken':
        return {
          icon: XCircle,
          color: 'text-red-500',
          bg: 'bg-red-500/10',
          border: 'border-red-500/20',
          title: 'Streak Broken',
          message: 'You missed yesterday, and your streak has reset.',
          button: 'Start Fresh'
        };
      case 'new':
      default:
        return {
          icon: Award,
          color: 'text-neon-green',
          bg: 'bg-neon-green/10',
          border: 'border-neon-green/20',
          title: 'Streak Started',
          message: 'You\'ve started your daily learning streak. Come back tomorrow to keep it going!',
          button: 'Let\'s Do This'
        };
    }
  };

  const content = getContent();
  const Icon = content.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className={`w-full max-w-md p-8 rounded-2xl glass-panel ${content.border} border shadow-2xl transform scale-100 animate-fade-in-up`}>
        <div className="flex flex-col items-center text-center space-y-6">
          
          <div className={`p-6 rounded-full ${content.bg} ${content.color} border ${content.border} relative`}>
            <Icon className="w-12 h-12" />
            {(status === 'extended' || status === 'new') && (
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-black font-bold text-sm border-2 border-black animate-pulse">
                    {streakCount}
                </div>
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-white font-mono">{content.title}</h2>
            <p className="text-gray-400">{content.message}</p>
          </div>

          {/* Reward Section */}
          {reward && (reward.xp > 0 || reward.points > 0) && (
             <div className="w-full bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                {reward.message && <p className="text-neon-green font-bold text-sm uppercase tracking-wider">{reward.message}</p>}
                <div className="flex justify-center space-x-6">
                    {reward.xp > 0 && (
                        <div className="flex items-center space-x-2">
                            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                            <span className="text-white font-bold">+{reward.xp} XP</span>
                        </div>
                    )}
                    {reward.points > 0 && (
                        <div className="flex items-center space-x-2">
                             <Trophy className="w-5 h-5 text-purple-400 fill-purple-400" />
                            <span className="text-white font-bold">+{reward.points} PTS</span>
                        </div>
                    )}
                </div>
             </div>
          )}

          <div className="flex flex-col w-full space-y-3">
             {status === 'broken' && onRepair && (
                 <button
                    onClick={onRepair}
                    disabled={userPoints < REPAIR_COST}
                    className={`w-full px-8 py-3 rounded-xl font-bold text-lg transition-all flex items-center justify-center space-x-2 ${
                        userPoints >= REPAIR_COST 
                        ? 'bg-neon-green hover:bg-neon-green-dark text-black transform hover:scale-[1.02]' 
                        : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    }`}
                 >
                    <RefreshCcw className="w-5 h-5" />
                    <span>Repair for {REPAIR_COST} PTS</span>
                 </button>
             )}

              <button
                onClick={onClose}
                className={`w-full px-8 py-3 rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02] ${
                    status === 'broken' ? 'bg-transparent border border-white/20 hover:bg-white/5 text-white' :
                    status === 'extended' ? 'bg-orange-500 hover:bg-orange-600 text-black' :
                    status === 'frozen' ? 'bg-blue-500 hover:bg-blue-600 text-black' :
                    'bg-neon-green hover:bg-neon-green-dark text-black'
                }`}
              >
                {content.button}
              </button>
          </div>
          
          {status === 'broken' && userPoints < REPAIR_COST && (
              <p className="text-xs text-red-400">Insufficient points to repair streak.</p>
          )}

        </div>
      </div>
    </div>
  );
};

export default StreakModal;