/**
 * pages/CommunityDetail.tsx
 *
 * Detail view for a single community.
 * Displays:
 *   - Community info + leader
 *   - Ranked member leaderboard (community_score)
 *   - Join button (for non-members)
 *   - Leader panel: pending requests (approve/reject) + transfer leadership
 *   - Leave button (for non-leader members)
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getCommunityDetail,
  joinCommunity,
  getPendingRequests,
  respondToRequest,
  transferLeadership,
  leaveCommunity,
  Community,
  CommunityMember,
  deleteCommunity,
  removeMember,
  JoinRequest,
} from '../services/communityApi';
import api from '../services/api'; // existing API — to get current user id
import { randomUUID } from 'crypto';

const CommunityDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [community, setCommunity] = useState<Community | null>(null);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [transferTarget, setTransferTarget] = useState('');

  useEffect(() => {
    loadAll();
  }, [id]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [detail, me] = await Promise.all([
        getCommunityDetail(id!),
        api.get('/users/me').then(r => r.data),
      ]);
      setCommunity(detail.community);
      setMembers(detail.members);
      setCurrentUserId(me.id);

      // If current user is the leader, also load pending requests
      const myRole = detail.members.find((m) => m.id === me.id)?.role;
      if (myRole === 'leader') {
        const reqs = await getPendingRequests(id!);
        setRequests(reqs);
      }
    } catch {
      setActionMsg('Failed to load community');
    } finally {
      setLoading(false);
    }
  };

  const flash = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 3000);
  };

  // ── Derived membership state ───────────────────────────────────────────────

  const myMembership = members.find((m) => m.id === currentUserId);
  const isLeader    = myMembership?.role === 'leader';
  const isMember    = !!myMembership;

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleJoin = async () => {
    try {
      const r = await joinCommunity(id!);
      flash(r.message);
      await loadAll();
    } catch (e: any) {
      flash(e?.response?.data?.message ?? 'Error');
    }
  };

  const handleRequest = async (userId: string, action: 'approve' | 'reject') => {
    try {
      await respondToRequest(id!, userId, action);
      setRequests((prev) => prev.filter((r) => r.id !== userId));
      if (action === 'approve') await loadAll(); // refresh member list
      flash(`Request ${action}d`);
    } catch (e: any) {
      flash(e?.response?.data?.message ?? 'Error');
    }
  };

  const handleTransfer = async () => {
    if (!transferTarget) return;
    try {
      const r = await transferLeadership(id!, transferTarget);
      flash(r.message);
      await loadAll();
    } catch (e: any) {
      flash(e?.response?.data?.message ?? 'Error');
    }
  };

  const handleLeave = async () => {
    if (!window.confirm('Are you sure you want to leave this community?')) return;
    try {
      const r = await leaveCommunity(id!);
      flash(r.message);
      await loadAll();
    } catch (e: any) {
      flash(e?.response?.data?.message ?? 'Error');
    }
  };

  const handleDelete = async () => {
  if (!window.confirm('Are you sure you want to DELETE this community? This cannot be undone.')) return;
  try {
    await deleteCommunity(id!);
    flash('Community deleted');
    navigate('/communities'); // go back to communities list
  } catch (e: any) {
    flash(e?.response?.data?.message ?? 'Error deleting community');
  }
};

const handleRemoveMember = async (memberId: string, memberName: string) => {
  if (!window.confirm(`Are you sure you want to remove ${memberName} from the community?`)) return;
  try {
    await removeMember(id!, memberId);
    flash(`${memberName} removed from community`);
    await loadAll(); // refresh member list
  } catch (e: any) {
    flash(e?.response?.data?.message ?? 'Error removing member');
  }
};

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return <div className="min-h-screen text-green-400 font-mono p-6">Loading...</div>;
  if (!community) return <div className="min-h-screen text-red-400 font-mono p-6">Community not found</div>;

  const rankMedal = (rank: number) => {
    const r=Number(rank);
    if (r === 1) return '🥇';
    if (r === 2) return '🥈';
    if (r === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="min-h-screen text-white font-mono p-6 max-w-4xl mx-auto">

      {/* Flash message */}
      {actionMsg && (
        <div className="fixed top-4 right-4 bg-neon-green text-black px-4 py-2 rounded font-bold z-50">
          {actionMsg}
        </div>
      )}

      {/* Community header */}
      <div className="border border-gray-700 rounded-lg p-6 mb-6 bg-gray-900">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neon-green mb-1">{community.name}</h1>
            <p className="text-gray-400 mb-3">{community.description || 'No description'}</p>
            <p className="text-sm text-gray-500">
  Leader: <span className="text-white font-bold">{community.leader_username}</span>
  &nbsp;·&nbsp;
  <span
    className={`text-xs px-2 py-1 rounded font-semibold ${
      community.is_public
        ? 'bg-green-900 text-green-300'
        : 'bg-red-900 text-red-300'
    }`}
  >
    {community.is_public ? '🌍 Public' : '🔒 Private'}
  </span>
  &nbsp;·&nbsp;
  👥 {community.member_count}/{community.max_members} members
  &nbsp;·&nbsp;
  Score: <span className="text-yellow-400 font-bold">
    {Number(community.avg_score).toFixed(0)}
  </span>
</p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 shrink-0">
            {!isMember && (
              <button
                onClick={handleJoin}
                className="bg-neon-green text-black px-5 py-2 rounded font-bold hover:bg-green-400 transition"
              >
                Request to Join
              </button>
            )}
            {isMember && !isLeader && (
              <button
                onClick={handleLeave}
                className="border border-red-700 text-red-400 px-5 py-2 rounded hover:bg-red-900/30 transition"
              >
                Leave Community
              </button>
            )}
            {isLeader && (
  <div className="flex flex-col gap-2 shrink-0">
    <span className="border border-neon-green text-neon-green px-4 py-2 rounded text-center text-sm">
      👑 You are the leader
    </span>
    <button
      onClick={handleDelete}
      className="border border-red-700 text-red-400 px-5 py-2 rounded hover:bg-red-900/30 transition text-sm"
    >
      🗑 Delete Community
    </button>
  </div>
)}
          </div>
        </div>
      </div>

      {/* Ranked member leaderboard */}
      <div className="border border-gray-700 rounded-lg p-5 mb-6 bg-gray-900">
        <h2 className="text-lg font-bold text-neon-green mb-4">Member Rankings</h2>
        {members.length === 0 && <p className="text-gray-500">No members yet.</p>}
        <div className="space-y-2">
{members.map((m) => (
  <div
    key={m.id}
    className={`flex items-center justify-between px-4 py-3 rounded border ${
      m.id === currentUserId
        ? 'border-neon-green bg-green-900/10'
        : 'border-gray-800 bg-black/30'
    }`}
  >
    <div className="flex items-center gap-3">
      <span className="w-8 text-center font-bold text-sm">
        {rankMedal(m.rank)}
      </span>
      <div>
        <span className="font-bold">
          {m.username ?? 'Unknown'}
          {m.id === currentUserId && (
            <span className="text-neon-green text-xs ml-2">(you)</span>
          )}
        </span>
        <div className="flex gap-2 mt-0.5">
          {m.role === 'leader' && (
            <span className="text-xs text-yellow-400 border border-yellow-700 rounded px-1">
              Leader
            </span>
          )}
          <span className="text-xs text-gray-500">{m.experience_level}</span>
        </div>
      </div>
    </div>

    <div className="flex items-center gap-3">
      <span className="font-bold text-yellow-400">
        {m.community_score} pts
      </span>
      {/* Show remove button only for leader, and not on themselves */}
      {isLeader && m.id !== currentUserId && m.role !== 'leader' && (
        <button
          onClick={() => handleRemoveMember(m.id, m.username ?? 'this member')}
          className="text-red-400 border border-red-800 rounded px-2 py-1 text-xs hover:bg-red-900/30 transition"
        >
          Remove
        </button>
      )}
    </div>
  </div>
))}
        </div>
      </div>

      {/* Leader Panel */}
      {isLeader && (
        <>
          {/* Pending join requests */}
          <div className="border border-yellow-700 rounded-lg p-5 mb-6 bg-gray-900">
            <h2 className="text-lg font-bold text-yellow-400 mb-4">
              Pending Join Requests ({requests.length})
            </h2>
            {requests.length === 0 && <p className="text-gray-500">No pending requests.</p>}
            <div className="space-y-3">
              {requests.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between bg-black border border-gray-800 rounded px-4 py-3"
                >
                  <div>
                    <span className="font-bold">{r.username}</span>
                    <span className="text-xs text-gray-500 ml-2">{r.experience_level}</span>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Requested: {new Date(r.requested_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRequest(r.id, 'approve')}
                      className="bg-green-700 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleRequest(r.id, 'reject')}
                      className="bg-red-900 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition"
                    >
                      ✕ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transfer leadership */}
          <div className="border border-gray-700 rounded-lg p-5 bg-gray-900">
            <h2 className="text-lg font-bold text-gray-300 mb-4">Transfer Leadership</h2>
            <p className="text-gray-500 text-sm mb-3">
              Select an approved member to hand over your leadership role.
            </p>
            <div className="flex gap-3">
              <select
                value={transferTarget}
                onChange={(e) => setTransferTarget(e.target.value)}
                className="flex-1 bg-black border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-neon-green"
              >
                <option value="">-- Select member --</option>
                {members
                  .filter((m) => m.role !== 'leader')
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.username} ({m.community_score} pts)
                    </option>
                  ))}
              </select>
              <button
                onClick={handleTransfer}
                disabled={!transferTarget}
                className="bg-yellow-600 text-black px-4 py-2 rounded font-bold hover:bg-yellow-500 transition disabled:opacity-50"
              >
                Transfer
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CommunityDetail;