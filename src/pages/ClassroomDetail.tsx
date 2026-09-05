import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { User, Classroom, Assignment, LeaderboardEntry, AssignmentStatus } from '../types';
import { classrooms } from '../services/api';
import Card from '../components/ui/Card';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import {
  ArrowLeft, Settings, Trophy, ClipboardList,
  Clock, CheckCircle, AlertCircle, XCircle, ChevronRight
} from 'lucide-react';

interface ClassroomDetailProps {
  user: User;
}

function computeStatus(a: Assignment): AssignmentStatus {
  if (a.is_correct) return 'completed';
  if (a.attempts && a.attempts > 0) return 'attempted';
  if (a.due_date && new Date(a.due_date) < new Date()) return 'overdue';
  return 'pending';
}

function StatusBadge({ status }: { status: AssignmentStatus }) {
  const map: Record<AssignmentStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    completed: { label: 'Completed', cls: 'border-green-500 text-green-500 bg-green-500/10', icon: <CheckCircle className="w-3 h-3" /> },
    attempted:  { label: 'Attempted',  cls: 'border-yellow-500 text-yellow-500 bg-yellow-500/10', icon: <AlertCircle className="w-3 h-3" /> },
    overdue:    { label: 'Overdue',    cls: 'border-red-500 text-red-500 bg-red-500/10', icon: <XCircle className="w-3 h-3" /> },
    pending:    { label: 'Pending',    cls: 'border-gray-500 text-gray-400 bg-white/5', icon: <Clock className="w-3 h-3" /> },
  };
  const { label, cls, icon } = map[status];
  return (
    <span className={`flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-bold border ${cls}`}>
      {icon}<span>{label}</span>
    </span>
  );
}

function difficultyColor(d?: string) {
  if (d === 'Easy') return 'text-green-400';
  if (d === 'Medium') return 'text-yellow-400';
  if (d === 'Hard') return 'text-red-400';
  return 'text-gray-400';
}

const ClassroomDetail: React.FC<ClassroomDetailProps> = ({ user }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast, showToast, dismissToast } = useToast();

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [tab, setTab] = useState<'assignments' | 'leaderboard'>('assignments');
  const [loading, setLoading] = useState(true);
  const [lbLoading, setLbLoading] = useState(false);

  const isMentor = user.role === 'mentor' || user.role === 'admin';

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    if (!id) return;
    try {
      const [cr, asgn] = await Promise.all([
        classrooms.getById(id),
        classrooms.getAssignments(id),
      ]);
      setClassroom(cr);
      setAssignments(asgn);
    } catch {
      showToast({ type: 'error', message: 'Failed to load classroom' });
    } finally {
      setLoading(false);
    }
    // Loaded upfront (not just on the Leaderboard tab) so the "vs class average" comparison is always available
    loadLeaderboard();
  }

  async function loadLeaderboard() {
    if (!id || leaderboard.length) return;
    setLbLoading(true);
    try {
      const data = await classrooms.getLeaderboard(id);
      setLeaderboard(data);
    } catch {
      showToast({ type: 'error', message: 'Failed to load leaderboard' });
    } finally {
      setLbLoading(false);
    }
  }

  function handleTabChange(t: 'assignments' | 'leaderboard') {
    setTab(t);
    if (t === 'leaderboard') loadLeaderboard();
  }

  if (loading) return <div className="text-neon-green font-mono">Loading Classroom...</div>;
  if (!classroom) return <div className="text-red-400">Classroom not found.</div>;

  const activeAssignments = assignments.filter(a => a.is_active);
  const completedCount = activeAssignments.filter(a => a.is_correct).length;

  const myEntry = leaderboard.find(e => e.id === user.id);
  const classAvgPoints = leaderboard.length
    ? leaderboard.reduce((sum, e) => sum + e.classroom_points, 0) / leaderboard.length
    : 0;
  const classAvgCompleted = leaderboard.length
    ? leaderboard.reduce((sum, e) => sum + e.assignments_completed, 0) / leaderboard.length
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast {...toast} onDismiss={dismissToast} />}

      {/* Back + header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <button onClick={() => navigate('/classrooms')} className="mt-1 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">{classroom.name}</h1>
            {classroom.description && <p className="text-gray-400 mt-1">{classroom.description}</p>}
            {classroom.mentor_name && (
              <p className="text-sm text-neon-green font-mono mt-1">Mentor: {classroom.mentor_name}</p>
            )}
          </div>
        </div>
        {isMentor && classroom.mentor_id === user.id && (
          <button
            onClick={() => navigate(`/classrooms/${id}/manage`)}
            className="flex items-center space-x-2 px-3 py-2 bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/30 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm">Manage</span>
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center py-4">
          <p className="text-2xl font-bold text-neon-green">{classroom.member_count ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">Students</p>
        </Card>
        <Card className="text-center py-4">
          <p className="text-2xl font-bold text-white">{activeAssignments.length}</p>
          <p className="text-xs text-gray-400 mt-1">Assignments</p>
        </Card>
        <Card className="text-center py-4">
          <p className="text-2xl font-bold text-neon-purple">{completedCount}</p>
          <p className="text-xs text-gray-400 mt-1">Completed</p>
        </Card>
      </div>

      {/* You vs class average */}
      {!isMentor && leaderboard.length > 0 && (
        <Card>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Your Progress vs Class Average</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-gray-500 mb-1">Points</p>
              <p className={`text-2xl font-bold ${(myEntry?.classroom_points ?? 0) >= classAvgPoints ? 'text-neon-green' : 'text-red-400'}`}>
                {myEntry?.classroom_points ?? 0}
                <span className="text-sm text-gray-500 font-normal ml-2">class avg {classAvgPoints.toFixed(1)}</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Assignments Completed</p>
              <p className={`text-2xl font-bold ${(myEntry?.assignments_completed ?? 0) >= classAvgCompleted ? 'text-neon-green' : 'text-red-400'}`}>
                {myEntry?.assignments_completed ?? 0}
                <span className="text-sm text-gray-500 font-normal ml-2">class avg {classAvgCompleted.toFixed(1)}</span>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {(['assignments', 'leaderboard'] as const).map(t => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-neon-green text-neon-green'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {t === 'assignments' ? <ClipboardList className="w-4 h-4" /> : <Trophy className="w-4 h-4" />}
            <span className="capitalize">{t}</span>
          </button>
        ))}
      </div>

      {/* Assignments tab */}
      {tab === 'assignments' && (
        <div className="space-y-3">
          {isMentor && classroom.mentor_id === user.id && (
            <div className="flex justify-end">
              <button
                onClick={() => navigate(`/classrooms/${id}/manage`)}
                className="px-3 py-2 bg-neon-green/10 text-neon-green border border-neon-green/30 rounded-lg text-sm font-bold hover:bg-neon-green/20 transition-colors"
              >
                + New Assignment
              </button>
            </div>
          )}

          {activeAssignments.length === 0 && (
            <Card className="text-center py-12">
              <ClipboardList className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No assignments yet.</p>
            </Card>
          )}

          {activeAssignments.map(a => {
            const status = computeStatus(a);
            const title = a.challenge_title ?? a.cc_title ?? a.title;
            const difficulty = a.challenge_difficulty ?? a.cc_difficulty;
            const points = a.challenge_points ?? a.cc_points ?? 0;
            const category = a.challenge_category ?? a.cc_category;

            return (
              <Card key={a.id} className="flex items-center justify-between group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-1">
                    <StatusBadge status={status} />
                    {difficulty && (
                      <span className={`text-xs font-bold ${difficultyColor(difficulty)}`}>{difficulty}</span>
                    )}
                    {category && (
                      <span className="text-xs text-gray-500 font-mono uppercase">{category}</span>
                    )}
                  </div>
                  <h3 className="text-white font-semibold truncate">{a.title}</h3>
                  <p className="text-sm text-gray-400 truncate">{title}</p>
                  <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                    <span className="text-neon-green font-mono">{points} pts</span>
                    {a.due_date && (
                      <span>Due {new Date(a.due_date).toLocaleDateString()}</span>
                    )}
                    {a.attempts != null && a.attempts > 0 && (
                      <span>{a.attempts} attempt{a.attempts !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>
                {!isMentor && status !== 'completed' && (
                  <Link
                    to={`/assignments/${a.id}`}
                    className="ml-4 flex items-center space-x-1 px-3 py-2 bg-neon-green/10 text-neon-green border border-neon-green/30 rounded-lg text-sm font-bold hover:bg-neon-green/20 transition-colors whitespace-nowrap"
                  >
                    <span>Solve</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
                {!isMentor && status === 'completed' && (
                  <CheckCircle className="ml-4 w-6 h-6 text-green-500" />
                )}
                {isMentor && (
                  <Link
                    to={`/assignments/${a.id}`}
                    className="ml-4 text-gray-400 hover:text-white transition-colors"
                    title="View assignment"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Link>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Leaderboard tab */}
      {tab === 'leaderboard' && (
        <div className="space-y-3">
          {lbLoading && <div className="text-neon-green font-mono">Loading leaderboard...</div>}
          {!lbLoading && leaderboard.length === 0 && (
            <Card className="text-center py-12">
              <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No submissions yet.</p>
            </Card>
          )}
          {leaderboard.map(entry => (
            <Card key={entry.id} className="flex items-center space-x-4">
              <div className={`w-10 h-10 flex items-center justify-center rounded-full font-bold text-lg font-mono
                ${entry.rank === 1 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                  entry.rank === 2 ? 'bg-gray-400/20 text-gray-300 border border-gray-400/30' :
                  entry.rank === 3 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                  'bg-white/5 text-gray-500 border border-white/10'}`}
              >
                {entry.rank}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold truncate">{entry.full_name}</p>
                <p className="text-xs text-gray-500 font-mono">@{entry.username}</p>
              </div>
              <div className="text-right">
                <p className="text-neon-green font-mono font-bold">{entry.classroom_points} pts</p>
                <p className="text-xs text-gray-500">{entry.assignments_completed} solved</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClassroomDetail;
