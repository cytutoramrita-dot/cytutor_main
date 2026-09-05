import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Card from '../components/ui/Card';
import { Challenge } from '../types';
import { challenges } from '../services/api';
import { Lock, Flag, ChevronRight, Search, Filter } from 'lucide-react';

const Challenges: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [challengesList, setChallengesList] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDomain, setSelectedDomain] = useState<string>(() => searchParams.get('domain') || 'all');

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        const data = await challenges.getAll();
        setChallengesList(data);
      } catch (error) {
        console.error("Failed to fetch challenges:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChallenges();
  }, []);

  const domains = Array.from(new Set(challengesList.map((c) => c.category))).sort();

  const DIFFICULTY_ORDER: Record<string, number> = { Easy: 0, Medium: 1, Hard: 2 };

  const filteredChallenges = challengesList
    .filter((challenge) => {
      const matchesSearch = !searchQuery.trim() ||
        challenge.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        challenge.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        challenge.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDifficulty = selectedDifficulty === 'all' || challenge.difficulty === selectedDifficulty;
      const matchesStatus = selectedStatus === 'all' || challenge.status === selectedStatus;
      const matchesDomain = selectedDomain === 'all' || challenge.category === selectedDomain;
      return matchesSearch && matchesDifficulty && matchesStatus && matchesDomain;
    })
    .sort((a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]);

  if (loading) {
    return <div className="text-neon-green font-mono">Loading Challenges...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Active Challenges</h1>
          <p className="text-gray-400">Capture flags to earn points and increase your rank.</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search challenges..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:border-neon-green"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="pl-10 pr-8 py-3 rounded-lg focus:outline-none focus:border-neon-green appearance-none cursor-pointer"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            >
              <option value="all">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="pl-10 pr-8 py-3 rounded-lg focus:outline-none focus:border-neon-green appearance-none cursor-pointer"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            >
              <option value="all">All Domains</option>
              {domains.map((domain) => (
                <option key={domain} value={domain}>{domain}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="pl-10 pr-8 py-3 rounded-lg focus:outline-none focus:border-neon-green appearance-none cursor-pointer"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            >
              <option value="all">All Statuses</option>
              <option value="available">Available</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="locked">Locked</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredChallenges.length === 0 ? (
          <Card className="col-span-full text-center py-12">
            <Flag className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No challenges found</h3>
            <p className="text-gray-400">
              {searchQuery || selectedDifficulty !== 'all' || selectedStatus !== 'all' || selectedDomain !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'No challenges are available at the moment.'}
            </p>
          </Card>
        ) : filteredChallenges.map((challenge) => (
          <Card key={challenge.id} className="relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <Flag className="w-24 h-24" />
            </div>

            <div className="flex justify-between items-start mb-2 relative z-10">
              <span className={`px-2 py-1 rounded text-xs font-bold uppercase border ${challenge.difficulty === 'Easy' ? 'border-green-500 text-green-500 bg-green-500/10' :
                  challenge.difficulty === 'Medium' ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10' :
                    'border-red-500 text-red-500 bg-red-500/10'
                }`}>
                {challenge.difficulty}
              </span>
              <span className="text-neon-green font-mono font-bold">{challenge.points} PTS</span>
            </div>

            <h3 className="text-xl font-bold text-white mb-2 relative z-10">{challenge.title}</h3>
            <p className="text-sm text-gray-400 mb-6 relative z-10 truncate">{challenge.description}</p>

            <div className="flex justify-between items-center relative z-10">
              <span className="text-xs text-gray-500 font-mono uppercase tracking-wider">{challenge.category}</span>
              <button
                onClick={() => navigate(`/challenges/${challenge.id}`)}
                disabled={challenge.status === 'locked'}
                className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center space-x-2 transition-all ${challenge.status === 'locked'
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'bg-neon-green text-black hover:bg-neon-green-dark hover:shadow-[0_0_15px_rgba(34,197,94,0.4)]'
                  }`}
              >
                {challenge.status === 'locked' ? <Lock className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <span>{challenge.status === 'locked' ? 'Locked' : challenge.status === 'completed' ? 'Completed ✓' : 'View Challenge'}</span>
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Challenges;