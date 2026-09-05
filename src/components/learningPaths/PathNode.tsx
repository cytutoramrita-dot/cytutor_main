import React from 'react';
import { Link } from 'react-router-dom';
import { Check, Lock } from 'lucide-react';
import { ResolvedPathNode } from '../../utils/learningPathProgress';

const TYPE_BADGE_CLASS: Record<string, string> = {
  Course: 'text-[var(--accent-primary)] border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10',
  Module: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  Easy: 'text-green-400 border-green-400/30 bg-green-400/10',
  Medium: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  Hard: 'text-red-400 border-red-400/30 bg-red-400/10',
};

interface PathNodeProps {
  node: ResolvedPathNode;
}

const PathNode: React.FC<PathNodeProps> = ({ node }) => {
  const { status, title, typeLabel, route } = node;
  const locked = status === 'locked';
  const completed = status === 'completed';

  const circleClass = locked
    ? 'border-[var(--border-subtle)] bg-[rgba(15,23,42,0.04)] text-[var(--text-muted)]'
    : completed
    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white'
    : 'border-[var(--accent-primary)] bg-transparent text-[var(--accent-primary)]';

  const content = (
    <div
      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 min-w-[180px] max-w-[220px] transition-all duration-200 ${
        locked ? 'border-[var(--border-subtle)] opacity-60' : 'border-[var(--border-accent)] hover:border-[var(--accent-primary)]/50'
      }`}
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${circleClass}`}>
        {locked ? (
          <Lock className="h-3.5 w-3.5" />
        ) : completed ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`truncate text-sm font-medium ${locked ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>{title}</div>
        <span className={`inline-block mt-0.5 rounded border px-1.5 py-0.5 text-[10px] font-medium ${TYPE_BADGE_CLASS[typeLabel] || TYPE_BADGE_CLASS.Course}`}>
          {typeLabel}
        </span>
      </div>
    </div>
  );

  if (locked) {
    return (
      <div className="cursor-not-allowed" title="Locked — complete the previous stage first">
        {content}
      </div>
    );
  }

  return (
    <Link to={route} title={title}>
      {content}
    </Link>
  );
};

export default PathNode;
