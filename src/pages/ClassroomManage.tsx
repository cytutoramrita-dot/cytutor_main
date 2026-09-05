import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Classroom, ClassroomMember, ClassroomChallenge, Challenge, Assignment, AssignmentProgressRow, JoinRequest } from '../types';
import { classrooms, challenges } from '../services/api';
import Card from '../components/ui/Card';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import {
  ArrowLeft, Users, ClipboardList, Flag, Crown,
  Trash2, Plus, Search, Calendar, ChevronDown, ChevronUp, Eye, UserCheck, CheckCircle, XCircle,
  Upload, Paperclip, X
} from 'lucide-react';

interface ClassroomManageProps {
  user: User;
}

type Tab = 'members' | 'assignments' | 'challenges' | 'requests';

const CATEGORIES = ['Web Exploitation', 'Cryptography', 'Forensics', 'Reverse Engineering', 'Pwn', 'OSINT', 'Misc'];

// Combined cap for a single upload batch — must match MAX_TOTAL_UPLOAD_BYTES
// in server/src/routes/classrooms.ts
const MAX_TOTAL_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB
const totalFileSize = (files: File[]) => files.reduce((sum, f) => sum + f.size, 0);

const ClassroomManage: React.FC<ClassroomManageProps> = ({ user }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast, showToast, dismissToast } = useToast();

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [members, setMembers] = useState<ClassroomMember[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [ccList, setCcList] = useState<ClassroomChallenge[]>([]);
  const [globalChallenges, setGlobalChallenges] = useState<Challenge[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [tab, setTab] = useState<Tab>('assignments');
  const [loading, setLoading] = useState(true);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [deletingClassroom, setDeletingClassroom] = useState(false);

  // Progress panel state (per-assignment: which students did it)
  const [expandedProgress, setExpandedProgress] = useState<string | null>(null);
  const [progressData, setProgressData] = useState<Record<string, AssignmentProgressRow[]>>({});
  const [loadingProgress, setLoadingProgress] = useState<string | null>(null);

  // Member progress panel state (per-student: which assignments they did)
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [memberProgress, setMemberProgress] = useState<Record<string, Assignment[]>>({});
  const [loadingMemberProgress, setLoadingMemberProgress] = useState<string | null>(null);

  // Assignment form
  const [aTitle, setATitle] = useState('');
  const [aInstructions, setAInstructions] = useState('');
  const [aDueDate, setADueDate] = useState('');
  const [aSource, setASource] = useState<'global' | 'classroom'>('global');
  const [aGlobalId, setAGlobalId] = useState('');
  const [aCcId, setACcId] = useState('');
  const [challengeSearch, setChallengeSearch] = useState('');
  const [creatingAssignment, setCreatingAssignment] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);

  // Classroom challenge form
  const [ccTitle, setCcTitle] = useState('');
  const [ccDesc, setCcDesc] = useState('');
  const [ccCategory, setCcCategory] = useState(CATEGORIES[0]);
  const [ccDifficulty, setCcDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Easy');
  const [ccPoints, setCcPoints] = useState('50');
  const [ccType, setCcType] = useState<'description' | 'downloadable'>('description');
  const [ccFlag, setCcFlag] = useState('');
  const [ccHints, setCcHints] = useState('');
  const [ccFileUrls, setCcFileUrls] = useState('');
  const [ccFiles, setCcFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [creatingCc, setCreatingCc] = useState(false);
  const [showCcForm, setShowCcForm] = useState(false);

  useEffect(() => {
    loadAll();
  }, [id]);

  async function loadAll() {
    if (!id) return;
    try {
      const [cr, mem, asgn, cc, glob] = await Promise.all([
        classrooms.getById(id),
        classrooms.getMembers(id),
        classrooms.getAssignments(id),
        classrooms.getChallenges(id),
        challenges.getAll(),
      ]);
      setClassroom(cr);
      setMembers(mem);
      setAssignments(asgn);
      setCcList(cc);
      setGlobalChallenges(glob);
    } catch {
      showToast({ type: 'error', message: 'Failed to load classroom data' });
    } finally {
      setLoading(false);
    }
    // Load join requests separately so a failure here doesn't break the whole page
    try {
      const reqs = await classrooms.getJoinRequests(id);
      setJoinRequests(reqs);
    } catch {
      // Non-critical — tab will simply show "No pending join requests"
    }
  }

  async function handleApproveJoin(userId: string, name: string) {
    if (!id) return;
    setProcessingRequestId(userId);
    try {
      await classrooms.approveJoin(id, userId);
      setJoinRequests(prev => prev.filter(r => r.user_id !== userId));
      // Reload members list so the approved user appears
      const updated = await classrooms.getMembers(id);
      setMembers(updated);
      showToast({ type: 'success', message: `${name} approved` });
    } catch {
      showToast({ type: 'error', message: 'Failed to approve request' });
    } finally {
      setProcessingRequestId(null);
    }
  }

  async function handleRejectJoin(userId: string, name: string) {
    if (!id) return;
    setProcessingRequestId(userId);
    try {
      await classrooms.rejectJoin(id, userId);
      setJoinRequests(prev => prev.filter(r => r.user_id !== userId));
      showToast({ type: 'success', message: `${name}'s request rejected` });
    } catch {
      showToast({ type: 'error', message: 'Failed to reject request' });
    } finally {
      setProcessingRequestId(null);
    }
  }

  async function handleRemoveMember(userId: string, name: string) {
    if (!id || !confirm(`Remove ${name} from this classroom?`)) return;
    try {
      await classrooms.removeMember(id, userId);
      setMembers(prev => prev.filter(m => m.id !== userId));
      showToast({ type: 'success', message: `${name} removed` });
    } catch {
      showToast({ type: 'error', message: 'Failed to remove member' });
    }
  }

  async function handleDeleteClassroom() {
    if (!id || !classroom) return;
    if (!confirm(`Delete "${classroom.name}"? This cannot be undone — all members will lose access.`)) return;
    setDeletingClassroom(true);
    try {
      await classrooms.deactivate(id);
      showToast({ type: 'success', message: 'Classroom deleted' });
      navigate('/classrooms');
    } catch {
      showToast({ type: 'error', message: 'Failed to delete classroom' });
      setDeletingClassroom(false);
    }
  }

  async function handleDeleteAssignment(aId: string, title: string) {
    if (!id || !confirm(`Delete assignment "${title}"?`)) return;
    try {
      await classrooms.deleteAssignment(id, aId);
      setAssignments(prev => prev.filter(a => a.id !== aId));
      showToast({ type: 'success', message: 'Assignment deleted' });
    } catch {
      showToast({ type: 'error', message: 'Failed to delete assignment' });
    }
  }

  async function handleToggleProgress(aId: string) {
    if (expandedProgress === aId) {
      setExpandedProgress(null);
      return;
    }
    setExpandedProgress(aId);
    if (progressData[aId]) return;
    setLoadingProgress(aId);
    try {
      const rows = await classrooms.getAssignmentProgress(id!, aId);
      setProgressData(prev => ({ ...prev, [aId]: rows }));
    } catch {
      showToast({ type: 'error', message: 'Failed to load progress' });
    } finally {
      setLoadingProgress(null);
    }
  }

  async function handleToggleMemberProgress(userId: string) {
    if (expandedMember === userId) {
      setExpandedMember(null);
      return;
    }
    setExpandedMember(userId);
    if (memberProgress[userId]) return;
    setLoadingMemberProgress(userId);
    try {
      const rows = await classrooms.getMemberAssignments(id!, userId);
      setMemberProgress(prev => ({ ...prev, [userId]: rows }));
    } catch {
      showToast({ type: 'error', message: 'Failed to load student progress' });
    } finally {
      setLoadingMemberProgress(null);
    }
  }

  async function handleCreateAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !aTitle.trim()) return;
    if (aSource === 'global' && !aGlobalId) { showToast({ type: 'error', message: 'Select a challenge' }); return; }
    if (aSource === 'classroom' && !aCcId) { showToast({ type: 'error', message: 'Select a classroom challenge' }); return; }
    setCreatingAssignment(true);
    try {
      const created = await classrooms.createAssignment(id, {
        title: aTitle.trim(),
        instructions: aInstructions.trim() || undefined,
        global_challenge_id: aSource === 'global' ? aGlobalId : undefined,
        classroom_challenge_id: aSource === 'classroom' ? aCcId : undefined,
        due_date: aDueDate || undefined,
      });
      setAssignments(prev => [created, ...prev]);
      showToast({ type: 'success', message: 'Assignment created' });
      setShowAssignmentForm(false);
      setATitle(''); setAInstructions(''); setADueDate('');
      setAGlobalId(''); setACcId(''); setChallengeSearch('');
    } catch {
      showToast({ type: 'error', message: 'Failed to create assignment' });
    } finally {
      setCreatingAssignment(false);
    }
  }

  // Plain button handler (not a <form onSubmit>) because this form can render
  // nested inside the "Create Assignment" form — nested <form> elements are
  // invalid HTML and browsers mis-handle their submit buttons.
  async function handleCreateCc() {
    if (!id) return;
    const pointsNum = parseInt(ccPoints, 10);
    if (!ccTitle.trim() || !ccDesc.trim() || !ccFlag.trim() || !pointsNum || pointsNum < 1) {
      showToast({ type: 'error', message: 'Title, description, flag, and a positive points value are required' });
      return;
    }
    setCreatingCc(true);
    try {
      let fileAttachments: string[] = ccType === 'downloadable' && ccFileUrls.trim()
        ? ccFileUrls.split('\n').map(u => u.trim()).filter(Boolean)
        : [];
      if (ccType === 'downloadable' && ccFiles.length > 0) {
        setUploadingFiles(true);
        try {
          const { urls } = await classrooms.uploadChallengeFiles(id, ccFiles);
          fileAttachments = [...urls, ...fileAttachments];
        } finally {
          setUploadingFiles(false);
        }
      }

      const nc = await classrooms.createChallenge(id, {
        title: ccTitle.trim(),
        description: ccDesc.trim(),
        category: ccCategory,
        difficulty: ccDifficulty,
        points: pointsNum,
        challenge_type: ccType,
        flag: ccFlag.trim(),
        hints: ccHints.trim() ? ccHints.split('\n').map(h => h.trim()).filter(Boolean) : [],
        file_attachments: fileAttachments,
      });
      setCcList(prev => [...prev, nc]);
      showToast({ type: 'success', message: 'Classroom challenge created' });
      setShowCcForm(false);
      setCcTitle(''); setCcDesc(''); setCcFlag(''); setCcHints(''); setCcPoints('50');
      setCcFileUrls(''); setCcFiles([]);
      // Pre-select it in case this was created from inside the assignment form
      setASource('classroom');
      setACcId(nc.id);
    } catch (err: any) {
      const fallback = ccFiles.length > 0 ? 'Failed to upload files or create challenge' : 'Failed to create challenge';
      showToast({ type: 'error', message: err.response?.data?.error || err.message || fallback });
    } finally {
      setCreatingCc(false);
    }
  }

  // Enforces the 5MB combined-size cap client-side so mentors get instant
  // feedback instead of waiting for the upload request to be rejected.
  function handleAddCcFiles(newFiles: File[]) {
    const combined = [...ccFiles, ...newFiles];
    const dropped = combined.length - Math.min(combined.length, 5);
    const capped = combined.slice(0, 5);
    if (totalFileSize(capped) > MAX_TOTAL_UPLOAD_BYTES) {
      showToast({
        type: 'error',
        message: `Combined file size (${(totalFileSize(capped) / (1024 * 1024)).toFixed(1)}MB) exceeds the 5MB limit. Remove or shrink some files.`,
      });
      return;
    }
    if (dropped > 0) {
      showToast({
        type: 'error',
        message: `Only 5 files can be attached at once — ${dropped} file(s) were not added.`,
      });
    }
    setCcFiles(capped);
  }

  async function handleDeleteCc(cId: string) {
    if (!id || !confirm('Delete this challenge?')) return;
    try {
      await classrooms.deleteChallenge(id, cId);
      setCcList(prev => prev.filter(c => c.id !== cId));
      showToast({ type: 'success', message: 'Challenge deleted' });
    } catch {
      showToast({ type: 'error', message: 'Failed to delete challenge' });
    }
  }

  // Shared between the Challenges tab and the inline "create while assigning" flow
  const ccForm = showCcForm && (
    <Card className="space-y-4">
      <h3 className="text-white font-bold text-lg">Create Classroom Challenge</h3>
      <p className="text-xs text-gray-500">v1: description and downloadable types only — no Docker required.</p>
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Title *</label>
            <input value={ccTitle} onChange={e => setCcTitle(e.target.value)} required
              placeholder="Internal SQLi Test"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-neon-green/50" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Category *</label>
            <select value={ccCategory} onChange={e => setCcCategory(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-neon-green/50">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Difficulty *</label>
            <select value={ccDifficulty} onChange={e => setCcDifficulty(e.target.value as any)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-neon-green/50">
              <option>Easy</option><option>Medium</option><option>Hard</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Points *</label>
            <input type="number" min="1" value={ccPoints} onChange={e => setCcPoints(e.target.value)} required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-neon-green/50" />
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Type *</label>
          <div className="flex space-x-2">
            {(['description', 'downloadable'] as const).map(t => (
              <button key={t} type="button" onClick={() => setCcType(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  ccType === t ? 'bg-neon-green text-black' : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
                }`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {ccType === 'downloadable' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Attach Files (up to 5 files, 5MB total)</label>
              <label className="flex items-center justify-center space-x-2 px-4 py-3 bg-white/5 border border-dashed border-white/20 rounded-lg text-gray-400 hover:text-white hover:border-neon-green/40 cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                <span className="text-sm">{ccFiles.length > 0 ? `${ccFiles.length} file(s) selected` : 'Click to choose files'}</span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={e => {
                    handleAddCcFiles(Array.from(e.target.files ?? []));
                    e.target.value = '';
                  }}
                />
              </label>
              {ccFiles.length > 0 && (
                <>
                  <ul className="mt-2 space-y-1">
                    {ccFiles.map((f, i) => (
                      <li key={i} className="flex items-center justify-between text-xs text-gray-400 bg-white/5 rounded px-2 py-1">
                        <span className="flex items-center space-x-1 truncate">
                          <Paperclip className="w-3 h-3 shrink-0" />
                          <span className="truncate">{f.name}</span>
                          <span className="text-gray-600 shrink-0">({(f.size / 1024).toFixed(0)} KB)</span>
                        </span>
                        <button type="button" onClick={() => setCcFiles(prev => prev.filter((_, j) => j !== i))}
                          className="text-gray-500 hover:text-red-400 transition-colors shrink-0 ml-2">
                          <X className="w-3 h-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className={`text-xs mt-1 font-mono ${totalFileSize(ccFiles) > MAX_TOTAL_UPLOAD_BYTES ? 'text-red-400' : 'text-gray-500'}`}>
                    Total: {(totalFileSize(ccFiles) / (1024 * 1024)).toFixed(2)}MB / 5MB
                  </p>
                </>
              )}
              {uploadingFiles && <p className="text-xs text-neon-green mt-1 font-mono">Uploading files...</p>}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Or paste file URLs (one per line, optional)</label>
              <textarea value={ccFileUrls} onChange={e => setCcFileUrls(e.target.value)} rows={2}
                placeholder={"https://drive.google.com/.../handout.zip\nhttps://example.com/capture.pcap"}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 font-mono text-sm focus:outline-none focus:border-neon-green/50 resize-none" />
            </div>
          </div>
        )}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Description *</label>
          <textarea value={ccDesc} onChange={e => setCcDesc(e.target.value)} required rows={4}
            placeholder="Challenge description and context..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-neon-green/50 resize-none" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Flag *</label>
          <input value={ccFlag} onChange={e => setCcFlag(e.target.value)} required
            placeholder="Cytutor{your_flag_here}"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 font-mono focus:outline-none focus:border-neon-green/50" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Hints (one per line, optional)</label>
          <textarea value={ccHints} onChange={e => setCcHints(e.target.value)} rows={3}
            placeholder={"First hint\nSecond hint"}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-neon-green/50 resize-none" />
        </div>
        <div className="flex space-x-3 pt-2">
          <button type="button" onClick={() => setShowCcForm(false)}
            className="flex-1 py-2 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleCreateCc} disabled={creatingCc}
            className="flex-1 py-2 bg-neon-green text-black font-bold rounded-lg hover:bg-neon-green-dark disabled:opacity-50 transition-colors">
            {uploadingFiles ? 'Uploading...' : creatingCc ? 'Creating...' : 'Create Challenge'}
          </button>
        </div>
      </div>
    </Card>
  );

  const filteredGlobal = globalChallenges.filter(c =>
    c.title.toLowerCase().includes(challengeSearch.toLowerCase()) ||
    c.category.toLowerCase().includes(challengeSearch.toLowerCase())
  );

  if (loading) return <div className="text-neon-green font-mono">Loading...</div>;
  if (!classroom) return <div className="text-red-400">Classroom not found.</div>;
  if (classroom.mentor_id !== user.id && user.role !== 'admin') {
    return <div className="text-red-400">Access denied.</div>;
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'assignments', label: 'Assignments', icon: <ClipboardList className="w-4 h-4" /> },
    { key: 'members', label: `Members (${members.length})`, icon: <Users className="w-4 h-4" /> },
    { key: 'requests', label: `Join Requests${joinRequests.length > 0 ? ` (${joinRequests.length})` : ''}`, icon: <UserCheck className="w-4 h-4" /> },
    { key: 'challenges', label: 'Challenges', icon: <Flag className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast {...toast} onDismiss={dismissToast} />}

      {/* Back button */}
      <button onClick={() => navigate(`/classrooms/${id}`)} className="text-gray-400 hover:text-white transition-colors flex items-center space-x-1 text-sm">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Classroom</span>
      </button>

      {/* Header card */}
      <Card>
        <h1 className="text-2xl sm:text-3xl font-bold font-mono text-neon-green">{classroom.name}</h1>
        <p className="text-gray-400 mt-1">{classroom.description || 'No description'}</p>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 mt-3 text-sm text-gray-400">
          <span className="flex items-center space-x-1">
            <Users className="w-4 h-4" />
            <span>{members.length} students</span>
          </span>
          <span className="text-gray-600">·</span>
          <span>
            Invite code: <span className="text-neon-green font-bold font-mono tracking-widest">{classroom.invite_code}</span>
          </span>
        </div>

        <div className="w-full mt-4 py-3 bg-neon-green/10 border border-neon-green/30 text-neon-green font-bold rounded-lg flex items-center justify-center space-x-2">
          <Crown className="w-4 h-4" />
          <span>You are the mentor</span>
        </div>
        <button
          onClick={handleDeleteClassroom}
          disabled={deletingClassroom}
          className="w-full mt-3 py-3 bg-transparent border border-red-500/60 text-red-400 font-bold rounded-lg hover:bg-red-500/10 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
        >
          <Trash2 className="w-4 h-4" />
          <span>{deletingClassroom ? 'Deleting...' : 'Delete Classroom'}</span>
        </button>
      </Card>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-white/10 scrollbar-hide">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              tab === t.key ? 'border-neon-green text-neon-green' : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {t.icon}<span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Assignments tab ── */}
      {tab === 'assignments' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAssignmentForm(v => !v)}
              className="flex items-center space-x-2 px-4 py-2 bg-neon-green text-black font-bold rounded-lg hover:bg-neon-green-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Assignment</span>
            </button>
          </div>

          {showAssignmentForm && (
            <Card className="space-y-4">
              <h3 className="text-white font-bold text-lg">Create Assignment</h3>
              <form onSubmit={handleCreateAssignment} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Title *</label>
                  <input value={aTitle} onChange={e => setATitle(e.target.value)} required
                    placeholder="Day 3 Homework — XSS Basics"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-neon-green/50" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Instructions (optional)</label>
                  <textarea value={aInstructions} onChange={e => setAInstructions(e.target.value)}
                    rows={2} placeholder="Additional context for students..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-neon-green/50 resize-none" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Due Date (optional)</label>
                  <input type="datetime-local" value={aDueDate} onChange={e => setADueDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-neon-green/50" />
                </div>

                {/* Challenge source toggle */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Challenge Source</label>
                  <div className="flex space-x-2 mb-3">
                    {(['global', 'classroom'] as const).map(src => (
                      <button key={src} type="button" onClick={() => setASource(src)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          aSource === src ? 'bg-neon-green text-black' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                        }`}>
                        {src === 'global' ? 'CyTutor Challenge' : 'Classroom Challenge'}
                      </button>
                    ))}
                  </div>

                  {aSource === 'global' && (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input value={challengeSearch} onChange={e => setChallengeSearch(e.target.value)}
                          placeholder="Search challenges..."
                          className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-neon-green/50" />
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1 border border-white/10 rounded-lg p-2">
                        {filteredGlobal.length === 0 && <p className="text-gray-500 text-sm p-2">No challenges found.</p>}
                        {filteredGlobal.map(c => (
                          <button key={c.id} type="button" onClick={() => setAGlobalId(c.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center transition-colors ${
                              aGlobalId === c.id ? 'bg-neon-green/15 text-neon-green border border-neon-green/30' : 'hover:bg-white/5 text-gray-300'
                            }`}>
                            <span>{c.title}</span>
                            <span className={`text-xs font-bold ${
                              c.difficulty === 'Easy' ? 'text-green-400' :
                              c.difficulty === 'Medium' ? 'text-yellow-400' : 'text-red-400'
                            }`}>{c.difficulty}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {aSource === 'classroom' && (
                    <div className="space-y-2">
                      <div className="space-y-1 border border-white/10 rounded-lg p-2 max-h-48 overflow-y-auto">
                        {ccList.length === 0 && !showCcForm && (
                          <p className="text-gray-500 text-sm p-2">No classroom challenges yet — create one below.</p>
                        )}
                        {ccList.map(c => (
                          <button key={c.id} type="button" onClick={() => setACcId(c.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center transition-colors ${
                              aCcId === c.id ? 'bg-neon-green/15 text-neon-green border border-neon-green/30' : 'hover:bg-white/5 text-gray-300'
                            }`}>
                            <span>{c.title}</span>
                            <span className={`text-xs font-bold ${
                              c.difficulty === 'Easy' ? 'text-green-400' :
                              c.difficulty === 'Medium' ? 'text-yellow-400' : 'text-red-400'
                            }`}>{c.difficulty}</span>
                          </button>
                        ))}
                      </div>
                      {!showCcForm && (
                        <button type="button" onClick={() => setShowCcForm(true)}
                          className="flex items-center space-x-1 text-sm text-neon-green hover:text-neon-green-dark transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                          <span>Create New Challenge</span>
                        </button>
                      )}
                      {ccForm}
                    </div>
                  )}
                </div>

                <div className="flex space-x-3 pt-2">
                  <button type="button" onClick={() => setShowAssignmentForm(false)}
                    className="flex-1 py-2 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={creatingAssignment}
                    className="flex-1 py-2 bg-neon-green text-black font-bold rounded-lg hover:bg-neon-green-dark disabled:opacity-50 transition-colors">
                    {creatingAssignment ? 'Creating...' : 'Assign'}
                  </button>
                </div>
              </form>
            </Card>
          )}

          {assignments.length === 0 && !showAssignmentForm && (
            <Card className="text-center py-12">
              <ClipboardList className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No assignments yet. Create one above.</p>
            </Card>
          )}

          {assignments.map(a => {
            const challengeTitle = a.challenge_title ?? a.cc_title ?? '—';
            const challengeDiff  = a.challenge_difficulty ?? a.cc_difficulty;
            const isExpanded = expandedProgress === a.id;
            const progress   = progressData[a.id];

            return (
              <Card key={a.id} className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold">{a.title}</p>
                    <div className="flex items-center space-x-2 mt-1 flex-wrap gap-y-1">
                      <span className="text-xs text-gray-500 font-mono">{challengeTitle}</span>
                      {challengeDiff && (
                        <span className={`text-xs font-bold ${
                          challengeDiff === 'Easy' ? 'text-green-400' :
                          challengeDiff === 'Medium' ? 'text-yellow-400' : 'text-red-400'
                        }`}>{challengeDiff}</span>
                      )}
                      {a.due_date && (
                        <span className="flex items-center space-x-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          <span>Due {new Date(a.due_date).toLocaleDateString()}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-3 shrink-0">
                    <button
                      onClick={() => handleToggleProgress(a.id)}
                      className="flex items-center space-x-1 px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:text-white hover:border-neon-green/40 transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Progress</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    <button onClick={() => handleDeleteAssignment(a.id, a.title)}
                      className="text-gray-500 hover:text-red-400 transition-colors p-1" title="Delete assignment">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-white/10 pt-3">
                    {loadingProgress === a.id && (
                      <p className="text-xs text-gray-500 font-mono">Loading...</p>
                    )}
                    {progress && progress.length === 0 && (
                      <p className="text-xs text-gray-500">No submissions yet.</p>
                    )}
                    {progress && progress.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-500 border-b border-white/10">
                              <th className="text-left py-1.5 pr-4">Student</th>
                              <th className="text-left py-1.5 pr-4">Status</th>
                              <th className="text-left py-1.5 pr-4">Attempts</th>
                              <th className="text-left py-1.5">Submitted</th>
                            </tr>
                          </thead>
                          <tbody>
                            {progress.map(row => (
                              <tr key={row.id} className="border-b border-white/5 last:border-0">
                                <td className="py-1.5 pr-4">
                                  <span className="text-white">{row.full_name || row.username || row.email?.split('@')[0]}</span>
                                  {row.username && <span className="text-gray-500 ml-1">@{row.username}</span>}
                                </td>
                                <td className="py-1.5 pr-4">
                                  <span className={`font-semibold ${
                                    row.status === 'completed' ? 'text-neon-green' :
                                    row.status === 'attempted' ? 'text-yellow-400' :
                                    row.status === 'overdue'   ? 'text-red-400' : 'text-gray-500'
                                  }`}>{row.status}</span>
                                </td>
                                <td className="py-1.5 pr-4 text-gray-400 font-mono">{row.attempts ?? 0}</td>
                                <td className="py-1.5 text-gray-400">
                                  {row.submitted_at ? new Date(row.submitted_at).toLocaleString() : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Members tab ── */}
      {tab === 'members' && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-neon-green">Member Rankings</h2>

          {members.length === 0 && (
            <Card className="text-center py-12">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No students yet. Share your invite code.</p>
              <p className="mt-2 font-mono text-neon-green font-bold text-xl tracking-widest">{classroom.invite_code}</p>
            </Card>
          )}
          {[...members].sort((a, b) => b.total_points - a.total_points).map((m, i) => {
            const isExpanded = expandedMember === m.id;
            const progress = memberProgress[m.id];
            const isYou = m.id === user.id;
            const rank = i + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
            return (
              <Card key={m.id} className={`space-y-3 ${isYou ? 'border-neon-green/60 bg-neon-green/5' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 text-center text-xl shrink-0">
                      {medal ?? <span className="text-gray-500 font-mono text-sm">#{rank}</span>}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-neon-purple flex items-center justify-center font-bold text-white text-sm shrink-0">
                      {(m.full_name || m.username || m.email).substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-bold flex items-center space-x-2">
                        <span>{m.full_name || m.username || m.email.split('@')[0]}</span>
                        {isYou && <span className="text-gray-400 font-normal text-sm">(you)</span>}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">{m.username ? `@${m.username}` : m.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-right text-sm">
                      <p className="text-orange-400 font-bold text-lg">{m.total_points} pts</p>
                      <p className="text-gray-500 text-xs">{m.assignments_completed} assignments</p>
                    </div>
                    <button
                      onClick={() => handleToggleMemberProgress(m.id)}
                      className="flex items-center space-x-1 px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:text-white hover:border-neon-green/40 transition-colors"
                      title="View this student's assignment progress"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Progress</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    <button onClick={() => handleRemoveMember(m.id, m.full_name || m.username || m.email)}
                      className="text-gray-500 hover:text-red-400 transition-colors p-1" title="Remove from classroom">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-white/10 pt-3">
                    {loadingMemberProgress === m.id && (
                      <p className="text-xs text-gray-500 font-mono">Loading...</p>
                    )}
                    {progress && progress.length === 0 && (
                      <p className="text-xs text-gray-500">No assignments in this classroom yet.</p>
                    )}
                    {progress && progress.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-500 border-b border-white/10">
                              <th className="text-left py-1.5 pr-4">Assignment</th>
                              <th className="text-left py-1.5 pr-4">Status</th>
                              <th className="text-left py-1.5 pr-4">Attempts</th>
                              <th className="text-left py-1.5">Submitted</th>
                            </tr>
                          </thead>
                          <tbody>
                            {progress.map(a => (
                              <tr key={a.id} className="border-b border-white/5 last:border-0">
                                <td className="py-1.5 pr-4">
                                  <span className="text-white">{a.title}</span>
                                  <span className="text-gray-500 ml-1">({a.challenge_title ?? a.cc_title ?? '—'})</span>
                                </td>
                                <td className="py-1.5 pr-4">
                                  <span className={`font-semibold ${
                                    a.status === 'completed' ? 'text-neon-green' :
                                    a.status === 'attempted' ? 'text-yellow-400' :
                                    a.status === 'overdue'   ? 'text-red-400' : 'text-gray-500'
                                  }`}>{a.status}</span>
                                </td>
                                <td className="py-1.5 pr-4 text-gray-400 font-mono">{a.attempts ?? 0}</td>
                                <td className="py-1.5 text-gray-400">
                                  {a.submitted_at ? new Date(a.submitted_at).toLocaleString() : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Join Requests tab ── */}
      {tab === 'requests' && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <UserCheck className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-bold text-yellow-400 uppercase tracking-widest font-mono">
              Pending Join Requests ({joinRequests.length})
            </h2>
          </div>

          {joinRequests.length === 0 && (
            <Card className="border-yellow-500/20 bg-yellow-500/5 text-center py-12">
              <UserCheck className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No pending join requests.</p>
            </Card>
          )}
          {joinRequests.map(r => (
            <Card key={r.user_id} className="border-yellow-500/20 bg-yellow-500/5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-neon-purple flex items-center justify-center font-bold text-white text-sm">
                  {(r.full_name || r.username || r.email).substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-semibold">{r.full_name || r.username || r.email.split('@')[0]}</p>
                  <p className="text-xs text-gray-500 font-mono">{r.username ? `@${r.username} · ` : ''}{r.email}</p>
                  <p className="text-xs text-gray-600 mt-0.5">Requested {new Date(r.requested_at).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-3 shrink-0">
                <button
                  onClick={() => handleApproveJoin(r.user_id, r.full_name || r.username || r.email)}
                  disabled={processingRequestId === r.user_id}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-neon-green text-black text-sm font-bold rounded-lg hover:bg-neon-green-dark disabled:opacity-50 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Approve</span>
                </button>
                <button
                  onClick={() => handleRejectJoin(r.user_id, r.full_name || r.username || r.email)}
                  disabled={processingRequestId === r.user_id}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/30 text-sm font-bold rounded-lg hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject</span>
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Classroom Challenges tab ── */}
      {tab === 'challenges' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowCcForm(v => !v)}
              className="flex items-center space-x-2 px-4 py-2 bg-neon-green text-black font-bold rounded-lg hover:bg-neon-green-dark transition-colors">
              <Plus className="w-4 h-4" />
              <span>New Challenge</span>
            </button>
          </div>

          {ccForm}

          {ccList.length === 0 && !showCcForm && (
            <Card className="text-center py-12">
              <Flag className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No classroom challenges yet.</p>
            </Card>
          )}

          {ccList.map(c => (
            <Card key={c.id} className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className={`text-xs font-bold ${
                    c.difficulty === 'Easy' ? 'text-green-400' :
                    c.difficulty === 'Medium' ? 'text-yellow-400' : 'text-red-400'
                  }`}>{c.difficulty}</span>
                  <span className="text-xs text-gray-500 font-mono uppercase">{c.category}</span>
                  <span className="text-xs text-gray-500 font-mono">{c.challenge_type}</span>
                </div>
                <p className="text-white font-semibold truncate">{c.title}</p>
                <p className="text-neon-green font-mono text-xs">{c.points} pts</p>
              </div>
              <button onClick={() => handleDeleteCc(c.id)}
                className="ml-4 text-gray-500 hover:text-red-400 transition-colors p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClassroomManage;
