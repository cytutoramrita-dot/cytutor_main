import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Assignment } from '../types';
import { classrooms } from '../services/api';
import Card from '../components/ui/Card';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import {
  ArrowLeft, Flag, Clock, CheckCircle, AlertCircle,
  XCircle, Lightbulb, Download, Send
} from 'lucide-react';

function difficultyColor(d?: string) {
  if (d === 'Easy') return 'border-green-500 text-green-500 bg-green-500/10';
  if (d === 'Medium') return 'border-yellow-500 text-yellow-500 bg-yellow-500/10';
  if (d === 'Hard') return 'border-red-500 text-red-500 bg-red-500/10';
  return 'border-gray-500 text-gray-400 bg-white/5';
}

const AssignmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast, showToast, dismissToast } = useToast();

  const [assignment, setAssignment] = useState<Assignment & {
    challenge_description?: string;
    challenge_hints?: string[];
    challenge_file_attachments?: string[];
    cc_description?: string;
    cc_hints?: string[];
    cc_file_attachments?: string[];
    classroom_name?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [flagInput, setFlagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ correct: boolean; attempts: number; points_awarded: number; message: string } | null>(null);
  const [revealedHints, setRevealedHints] = useState<Set<number>>(new Set());

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    if (!id) return;
    try {
      const data = await classrooms.getAssignmentById(id);
      setAssignment(data as any);
      if (data.is_correct) {
        setResult({ correct: true, attempts: data.attempts ?? 1, points_awarded: 0, message: 'Already completed!' });
      }
    } catch {
      showToast({ type: 'error', message: 'Failed to load assignment' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !flagInput.trim()) return;
    setSubmitting(true);
    try {
      const res = await classrooms.submitAssignment(id, flagInput.trim());
      setResult(res);
      if (res.correct) {
        setAssignment(prev => prev ? { ...prev, is_correct: true, attempts: res.attempts } : prev);
        showToast({ type: 'success', message: `Correct! +${res.points_awarded} pts` });
      } else {
        showToast({ type: 'error', message: 'Incorrect flag, try again.' });
      }
    } catch (err: any) {
      showToast({ type: 'error', message: err?.response?.data?.error ?? 'Submission failed' });
    } finally {
      setSubmitting(false);
    }
  }

  function toggleHint(i: number) {
    setRevealedHints(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  if (loading) return <div className="text-neon-green font-mono">Loading Assignment...</div>;
  if (!assignment) return <div className="text-red-400">Assignment not found.</div>;

  const isGlobal = !!assignment.global_challenge_id;
  const title = isGlobal ? assignment.challenge_title : assignment.cc_title;
  const description = isGlobal ? (assignment as any).challenge_description : (assignment as any).cc_description;
  const difficulty = isGlobal ? assignment.challenge_difficulty : assignment.cc_difficulty;
  const points = isGlobal ? assignment.challenge_points : assignment.cc_points;
  const category = isGlobal ? assignment.challenge_category : assignment.cc_category;
  const hints: string[] = isGlobal
    ? ((assignment as any).challenge_hints ?? [])
    : ((assignment as any).cc_hints ?? []);
  const fileAttachments: string[] = isGlobal
    ? ((assignment as any).challenge_file_attachments ?? [])
    : ((assignment as any).cc_file_attachments ?? []);

  const isCompleted = assignment.is_correct;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {toast && <Toast {...toast} onDismiss={dismissToast} />}

      {/* Back */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate(assignment.classroom_id ? `/classrooms/${assignment.classroom_id}` : '/classrooms')}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="text-xs text-gray-500 font-mono">{(assignment as any).classroom_name}</p>
          <h1 className="text-2xl font-bold text-white">{assignment.title}</h1>
        </div>
      </div>

      {/* Assignment meta */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {assignment.due_date && (
          <span className="flex items-center space-x-1 text-gray-400">
            <Clock className="w-4 h-4" />
            <span>Due {new Date(assignment.due_date).toLocaleString()}</span>
          </span>
        )}
        {isCompleted && (
          <span className="flex items-center space-x-1 text-green-400">
            <CheckCircle className="w-4 h-4" />
            <span>Completed</span>
          </span>
        )}
        {!isCompleted && assignment.attempts != null && assignment.attempts > 0 && (
          <span className="flex items-center space-x-1 text-yellow-400">
            <AlertCircle className="w-4 h-4" />
            <span>{assignment.attempts} attempt{assignment.attempts !== 1 ? 's' : ''}</span>
          </span>
        )}
      </div>

      {assignment.instructions && (
        <Card>
          <p className="text-sm text-gray-400 font-semibold mb-1">Instructions</p>
          <p className="text-gray-200 whitespace-pre-wrap">{assignment.instructions}</p>
        </Card>
      )}

      {/* Challenge info */}
      <Card>
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              {difficulty && (
                <span className={`px-2 py-0.5 rounded text-xs font-bold border ${difficultyColor(difficulty)}`}>
                  {difficulty}
                </span>
              )}
              {category && (
                <span className="text-xs text-gray-500 font-mono uppercase">{category}</span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white">{title ?? 'Challenge'}</h2>
          </div>
          <span className="text-neon-green font-mono font-bold text-lg">{points} PTS</span>
        </div>

        {description && (
          <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{description}</p>
        )}

        {fileAttachments.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-gray-400 font-semibold">Files</p>
            {fileAttachments.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer"
                className="flex items-center space-x-2 text-neon-green hover:underline text-sm">
                <Download className="w-4 h-4" />
                <span>Download file {i + 1}</span>
              </a>
            ))}
          </div>
        )}
      </Card>

      {/* Hints */}
      {hints.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-400 font-semibold flex items-center space-x-1">
            <Lightbulb className="w-4 h-4" /><span>Hints</span>
          </p>
          {hints.map((hint, i) => (
            <Card key={i} className="py-3">
              <button onClick={() => toggleHint(i)} className="flex items-center justify-between w-full text-left">
                <span className="text-sm text-gray-400">Hint {i + 1}</span>
                <span className="text-xs text-neon-green">{revealedHints.has(i) ? 'Hide' : 'Reveal'}</span>
              </button>
              {revealedHints.has(i) && (
                <p className="mt-2 text-gray-300 text-sm">{hint}</p>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Flag submission */}
      <Card>
        <h3 className="text-white font-bold mb-3 flex items-center space-x-2">
          <Flag className="w-4 h-4 text-neon-green" />
          <span>Submit Flag</span>
        </h3>

        {isCompleted ? (
          <div className="flex items-center space-x-3 py-3 px-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <div>
              <p className="text-green-400 font-bold">Challenge Completed!</p>
              <p className="text-sm text-gray-400">You solved this assignment in {assignment.attempts} attempt{assignment.attempts !== 1 ? 's' : ''}.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              value={flagInput}
              onChange={e => setFlagInput(e.target.value)}
              placeholder="Cytutor{your_flag_here}"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 font-mono focus:outline-none focus:border-neon-green/50 text-sm"
              disabled={submitting}
              required
            />
            {result && !result.correct && (
              <div className="flex items-center space-x-2 text-red-400 text-sm">
                <XCircle className="w-4 h-4" />
                <span>Incorrect — {result.attempts} attempt{result.attempts !== 1 ? 's' : ''} so far.</span>
              </div>
            )}
            <button
              type="submit"
              disabled={submitting || !flagInput.trim()}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-neon-green text-black font-bold rounded-lg hover:bg-neon-green-dark disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Submitting...' : 'Submit Flag'}</span>
            </button>
          </form>
        )}
      </Card>
    </div>
  );
};

export default AssignmentDetail;
