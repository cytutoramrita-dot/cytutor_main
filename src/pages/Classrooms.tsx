import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Classroom } from '../types';
import { classrooms } from '../services/api';
import Card from '../components/ui/Card';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { Plus, Users, Copy, Settings, LogIn, LogOut, GraduationCap, Calendar, Clock, CheckCircle, XCircle, ShieldCheck } from 'lucide-react';

interface ClassroomsProps {
  user: User;
}

type ModalMode = 'create' | 'join' | null;

const Classrooms: React.FC<ClassroomsProps> = ({ user }) => {
  const navigate = useNavigate();
  const { toast, showToast, dismissToast } = useToast();
  const [list, setList] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);

  // Create form
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [creating, setCreating] = useState(false);

  // Join form
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  // Admin: pending classrooms
  const [pendingList, setPendingList] = useState<(Classroom & { creator_name: string; creator_email: string })[]>([]);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Student: settings menu + leave classroom
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);

  const isAdmin = user.role === 'admin';

  useEffect(() => {
    load();
    loadPending(); // always try — backend returns 403 for non-admins, caught silently below
  }, []);

  async function load() {
    try {
      const data = await classrooms.getMy();
      setList(data);
    } catch {
      showToast({ type: 'error', message: 'Failed to load classrooms' });
    } finally {
      setLoading(false);
    }
  }

  async function loadPending() {
    try {
      const data = await classrooms.getPending();
      setPendingList(data);
    } catch {
      // Non-fatal — admin panel simply stays empty
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createName.trim()) return;
    setCreating(true);
    try {
      const c = await classrooms.create(createName.trim(), createDesc.trim() || undefined);
      setList(prev => [c, ...prev]);
      setModalMode(null);
      setCreateName('');
      setCreateDesc('');
      showToast({ type: 'success', message: `Classroom "${c.name}" submitted — waiting for admin approval.` });
    } catch {
      showToast({ type: 'error', message: 'Failed to create classroom' });
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      const res = await classrooms.join(joinCode.trim().toUpperCase());
      showToast({ type: 'success', message: `Join request sent for "${res.classroom.name}" — waiting for mentor approval.` });
      setModalMode(null);
      setJoinCode('');
      load();
    } catch (err: any) {
      showToast({ type: 'error', message: err?.response?.data?.error ?? 'Invalid invite code' });
    } finally {
      setJoining(false);
    }
  }

  async function handleApprove(id: string) {
    setApprovingId(id);
    try {
      await classrooms.approveClassroom(id);
      setPendingList(prev => prev.filter(c => c.id !== id));
      window.dispatchEvent(new Event('classroom-pending-updated'));
      showToast({ type: 'success', message: 'Classroom approved' });
      load();
    } catch {
      showToast({ type: 'error', message: 'Failed to approve classroom' });
    } finally {
      setApprovingId(null);
    }
  }

  async function handleReject(id: string) {
    setApprovingId(id);
    try {
      await classrooms.rejectClassroom(id);
      setPendingList(prev => prev.filter(c => c.id !== id));
      window.dispatchEvent(new Event('classroom-pending-updated'));
      showToast({ type: 'success', message: 'Classroom rejected' });
    } catch {
      showToast({ type: 'error', message: 'Failed to reject classroom' });
    } finally {
      setApprovingId(null);
    }
  }

  async function handleLeave(id: string, name: string) {
    if (!window.confirm(`Leave "${name}"? You'll need a new invite code to rejoin.`)) return;
    setLeavingId(id);
    try {
      await classrooms.leave(id);
      setList(prev => prev.filter(c => c.id !== id));
      showToast({ type: 'success', message: `Left "${name}"` });
    } catch (err: any) {
      showToast({ type: 'error', message: err?.response?.data?.error ?? 'Failed to leave classroom' });
    } finally {
      setLeavingId(null);
      setMenuOpenId(null);
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    showToast({ type: 'success', message: 'Invite code copied' });
  }

  function approvalBadge(c: Classroom) {
    if (c.my_relation === 'owner') {
      if (c.approval_status === 'pending') {
        return <span className="flex items-center space-x-1 px-2 py-0.5 text-xs rounded border border-yellow-500 text-yellow-400 bg-yellow-500/10 font-mono"><Clock className="w-3 h-3" /><span>Pending admin approval</span></span>;
      }
      if (c.approval_status === 'rejected') {
        return <span className="flex items-center space-x-1 px-2 py-0.5 text-xs rounded border border-red-500 text-red-400 bg-red-500/10 font-mono"><XCircle className="w-3 h-3" /><span>Rejected</span></span>;
      }
    }
    if (c.my_relation === 'member') {
      if (c.join_status === 'pending') {
        return <span className="flex items-center space-x-1 px-2 py-0.5 text-xs rounded border border-yellow-500 text-yellow-400 bg-yellow-500/10 font-mono"><Clock className="w-3 h-3" /><span>Pending mentor approval</span></span>;
      }
      if (c.join_status === 'rejected') {
        return <span className="flex items-center space-x-1 px-2 py-0.5 text-xs rounded border border-red-500 text-red-400 bg-red-500/10 font-mono"><XCircle className="w-3 h-3" /><span>Request rejected</span></span>;
      }
    }
    return null;
  }

  const isOwner = (c: Classroom) => c.my_relation === 'owner' || c.mentor_id === user.id;
  const isAccessible = (c: Classroom) =>
    (c.my_relation === 'owner' && c.approval_status === 'approved') ||
    (c.my_relation === 'member' && c.join_status === 'approved') ||
    isAdmin;

  if (loading) return <div className="text-neon-green font-mono">Loading Classrooms...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast {...toast} onDismiss={dismissToast} />}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">My Classrooms</h1>
          <p className="text-gray-400">Create or join classrooms to collaborate with a mentor.</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setModalMode('join')}
            className="flex items-center space-x-2 px-4 py-2 bg-white/5 text-gray-300 border border-white/10 font-bold rounded-lg hover:border-neon-green/40 hover:text-white transition-colors"
          >
            <LogIn className="w-4 h-4" />
            <span>Join</span>
          </button>
          <button
            onClick={() => setModalMode('create')}
            className="flex items-center space-x-2 px-4 py-2 bg-neon-green text-black font-bold rounded-lg hover:bg-neon-green-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Classroom</span>
          </button>
        </div>
      </div>

      {/* Admin: pending approvals panel — shown whenever the API returned pending items */}
      {pendingList.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-bold text-yellow-400 uppercase tracking-widest font-mono">
              Pending Approvals ({pendingList.length})
            </h2>
          </div>
          {pendingList.map(c => (
            <Card key={c.id} className="border-yellow-500/20 bg-yellow-500/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-bold">{c.name}</p>
                  {c.description && <p className="text-sm text-gray-400 mt-0.5">{c.description}</p>}
                  <p className="text-xs text-gray-500 font-mono mt-1">
                    Requested by <span className="text-yellow-400">{c.creator_name}</span> ({c.creator_email}) ·{' '}
                    {new Date(c.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex space-x-2 ml-4 shrink-0">
                  <button
                    onClick={() => handleApprove(c.id)}
                    disabled={approvingId === c.id}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-neon-green text-black text-sm font-bold rounded-lg hover:bg-neon-green-dark disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => handleReject(c.id)}
                    disabled={approvingId === c.id}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/30 text-sm font-bold rounded-lg hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {list.length === 0 && (
        <Card className="text-center py-16">
          <GraduationCap className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No classrooms yet.</p>
          <p className="text-gray-500 text-sm mt-1">Create one (pending admin approval) or join with an invite code.</p>
          <div className="flex justify-center space-x-3 mt-4">
            <button onClick={() => setModalMode('create')} className="px-4 py-2 bg-neon-green text-black font-bold rounded-lg">Create Classroom</button>
            <button onClick={() => setModalMode('join')} className="px-4 py-2 bg-white/5 text-gray-300 border border-white/10 font-bold rounded-lg hover:border-white/30">Join Classroom</button>
          </div>
        </Card>
      )}

      {/* Classroom grid */}
      <div className="grid grid-cols-2 md:grid-cols-1 gap-6">
        {list.map(c => {
          const badge = approvalBadge(c);
          const accessible = isAccessible(c);
          const owner = isOwner(c);

          return (
            <Card key={c.id} className={`group ${!accessible ? 'opacity-75' : ''}`}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-white truncate">{c.name}</h3>
                  {c.description && <p className="text-sm text-gray-400 mt-1 line-clamp-2">{c.description}</p>}
                  {!owner && c.mentor_name && (
                    <p className="text-xs text-neon-green mt-1 font-mono">Mentor: {c.mentor_name}</p>
                  )}
                </div>
                <div className="ml-2 shrink-0">{badge}</div>
              </div>

              <div className="flex items-center space-x-4 text-sm text-gray-400 mb-4">
                <span className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>{c.member_count ?? 0} students</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(c.created_at).toLocaleDateString()}</span>
                </span>
              </div>

              {/* Invite code — only show for active, owned classrooms */}
              {owner && c.approval_status === 'approved' && (
                <div className="flex items-center space-x-2 mb-4 p-2 bg-white/5 rounded-lg border border-white/10">
                  <span className="font-mono text-neon-green font-bold tracking-widest text-sm flex-1">{c.invite_code}</span>
                  <button onClick={() => copyCode(c.invite_code)} className="text-gray-400 hover:text-white transition-colors" title="Copy invite code">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex space-x-2 relative">
                {accessible ? (
                  <>
                    <button
                      onClick={() => navigate(`/classrooms/${c.id}`)}
                      className="flex-1 py-2 bg-neon-green/10 text-neon-green border border-neon-green/30 rounded-lg font-bold text-sm hover:bg-neon-green/20 transition-colors"
                    >
                      View Classroom
                    </button>
                    {owner && (
                      <button
                        onClick={() => navigate(`/classrooms/${c.id}/manage`)}
                        className="px-3 py-2 bg-white/5 text-gray-400 border border-white/10 rounded-lg hover:text-white hover:border-white/30 transition-colors"
                        title="Manage classroom"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    )}
                    {/* Only an actual approved member can leave — admins can view pending/foreign classrooms without being a real member */}
                    {!owner && c.join_status === 'approved' && (
                      <button
                        onClick={() => setMenuOpenId(menuOpenId === c.id ? null : c.id)}
                        className="px-3 py-2 bg-white/5 text-gray-400 border border-white/10 rounded-lg hover:text-white hover:border-white/30 transition-colors"
                        title="Classroom settings"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    )}
                    {menuOpenId === c.id && !owner && c.join_status === 'approved' && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
                        <div className="absolute right-0 bottom-full mb-2 w-44 bg-bg-dark border border-white/10 rounded-lg shadow-xl z-20 overflow-hidden">
                          <button
                            onClick={() => handleLeave(c.id, c.name)}
                            disabled={leavingId === c.id}
                            className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>{leavingId === c.id ? 'Leaving...' : 'Leave Classroom'}</span>
                          </button>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-gray-500 font-mono py-2">
                    {owner && c.approval_status === 'pending' && 'Waiting for admin to approve this classroom.'}
                    {owner && c.approval_status === 'rejected' && 'This classroom request was rejected.'}
                    {!owner && c.join_status === 'pending' && 'Waiting for the mentor to approve your request.'}
                    {!owner && c.join_status === 'rejected' && 'Your join request was rejected.'}
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modal */}
      {modalMode && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-dark border border-neon-green/20 rounded-2xl p-6 w-full max-w-md animate-fade-in">
            <h2 className="text-xl font-bold text-white mb-1">
              {modalMode === 'create' ? 'Create Classroom' : 'Join Classroom'}
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              {modalMode === 'create'
                ? 'Your request will be sent to an admin for approval.'
                : 'Enter the invite code — the mentor will approve your request.'}
            </p>

            {modalMode === 'create' ? (
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Classroom Name *</label>
                  <input
                    value={createName}
                    onChange={e => setCreateName(e.target.value)}
                    placeholder="e.g. CSE Batch A"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-neon-green/50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Description (optional)</label>
                  <textarea
                    value={createDesc}
                    onChange={e => setCreateDesc(e.target.value)}
                    placeholder="Brief description of this classroom"
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-neon-green/50 resize-none"
                  />
                </div>
                <div className="flex space-x-3 pt-2">
                  <button type="button" onClick={() => setModalMode(null)} className="flex-1 py-2 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={creating} className="flex-1 py-2 bg-neon-green text-black font-bold rounded-lg hover:bg-neon-green-dark disabled:opacity-50 transition-colors">
                    {creating ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Invite Code *</label>
                  <input
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="CYT-XXXXXX"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-neon-green/50 font-mono tracking-widest"
                    required
                  />
                </div>
                <div className="flex space-x-3 pt-2">
                  <button type="button" onClick={() => setModalMode(null)} className="flex-1 py-2 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={joining} className="flex-1 py-2 bg-neon-green text-black font-bold rounded-lg hover:bg-neon-green-dark disabled:opacity-50 transition-colors">
                    {joining ? 'Sending...' : 'Send Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Classrooms;
