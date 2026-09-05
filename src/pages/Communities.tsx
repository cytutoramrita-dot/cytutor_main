/**
 * pages/Communities.tsx
 *
 * Main community listing page.
 * Shows all communities, lets the user:
 *   - Search by name
 *   - Create a new community (modal)
 *   - Click into a community for detail/join
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAllCommunities,
  createCommunity,
  Community,
} from '../services/communityApi';

const Communities: React.FC = () => {
  const navigate = useNavigate();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', is_public: true, max_members: 50 });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    fetchCommunities();
  }, []);

  const fetchCommunities = async () => {
    try {
      setLoading(true);
      const data = await getAllCommunities();
      setCommunities(data);
    } catch {
      setError('Failed to load communities');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      await createCommunity(form);
      setShowCreate(false);
      setForm({ name: '', description: '', is_public: true, max_members: 50 });
      fetchCommunities();
    } catch (err: any) {
      setCreateError(err?.response?.data?.message ?? 'Failed to create community');
    } finally {
      setCreating(false);
    }
  };

  const filtered = communities.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const difficultyColor = (score: number) => {
    if (score >= 1000) return 'text-red-400';
    if (score >= 500) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neon-green">[ COMMUNITIES ]</h1>
          <p className="text-gray-400 text-sm mt-1">
            Join a group, compete, climb the ranks
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-neon-green text-black px-4 py-2 rounded font-bold hover:bg-green-400 transition"
        >
          + Create Community
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search communities..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-gray-900 border border-gray-700 rounded px-4 py-2 mb-6 text-white placeholder-gray-500 focus:outline-none focus:border-neon-green"
      />

      {/* Community list */}
      {loading && <p className="text-gray-500">Loading...</p>}
      {error   && <p className="text-red-400">{error}</p>}
      {!loading && filtered.length === 0 && (
        <p className="text-gray-500">No communities found.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <div
            key={c.id}
            onClick={() => navigate(`/communities/${c.id}`)}
            className="bg-gray-900 border border-gray-700 rounded-lg p-5 cursor-pointer hover:border-neon-green transition group"
          >
            {/* Community name */}
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold group-hover:text-neon-green transition">
                {c.name}
              </h2>
                <span
    className={`text-xs px-2 py-1 rounded font-semibold ${
      c.is_public
        ? 'bg-green-900 text-green-300'
        : 'bg-red-900 text-red-300'
    }`}
  >
    {c.is_public ? '🌍 Public' : '🔒 Private'}
  </span>
              
            </div>

            {/* Description */}
            <p className="text-gray-400 text-sm mb-4 line-clamp-2">
              {c.description ?? 'No description'}
            </p>

            {/* Stats row */}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                👥 {c.member_count}/{c.max_members}
              </span>
              <span className={`font-bold ${difficultyColor(Number(c.avg_score))}`}>
                ⭐ {Number(c.avg_score).toFixed(0)} pts
              </span>
            </div>

            {/* Leader */}
            <p className="text-xs text-gray-600 mt-3">
              Leader: <span className="text-gray-400">{c.leader_username}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Create Community Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-neon-green rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-neon-green mb-4">Create Community</h2>
            {createError && <p className="text-red-400 text-sm mb-3">{createError}</p>}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm block mb-1">Community Name *</label>
                <input
                  required
                  minLength={3}
                  maxLength={100}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-neon-green"
                  placeholder="e.g. HackersUnited"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm block mb-1">Description</label>
                <textarea
                  maxLength={500}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-neon-green h-24 resize-none"
                  placeholder="What is this community about?"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-gray-400 text-sm block mb-1">Max Members</label>
                  <input
                    type="number"
                    min={2}
                    max={200}
                    value={form.max_members}
                    onChange={(e) => setForm({ ...form, max_members: Number(e.target.value) })}
                    className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-neon-green"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-gray-400 text-sm block mb-1">Visibility</label>
                  <select
                    value={form.is_public ? 'public' : 'private'}
                    onChange={(e) => setForm({ ...form, is_public: e.target.value === 'public' })}
                    className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-neon-green"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 border border-gray-700 text-gray-400 rounded py-2 hover:border-gray-500 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-neon-green text-black rounded py-2 font-bold hover:bg-green-400 transition disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Communities;