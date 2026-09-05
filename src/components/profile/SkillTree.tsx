import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bug, Check, Globe, Lock, Network, Search, Shield, Terminal, Zap } from 'lucide-react';
import { courseService } from '../../services/courseApi';
import { Course } from '../../types/course';
import { SkillTreeModule, withLockState } from '../../utils/skillTree';

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'Terminal':
      return Terminal;
    case 'Network':
      return Network;
    case 'Lock':
      return Lock;
    case 'Search':
      return Search;
    case 'Bug':
      return Bug;
    case 'Zap':
      return Zap;
    case 'Globe':
      return Globe;
    default:
      return Shield;
  }
};

const SkillTree: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const data = await courseService.getAllCourses();
        if (!cancelled) setCourses(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load skill tree');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-[rgba(15,23,42,0.05)]" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-[var(--text-secondary)]">Couldn't load skill tree: {error}</p>;
  }

  return (
    <div className="space-y-8">
      {courses.map((course) => {
        const modules = withLockState(course);
        const TrackIcon = getIcon(course.icon);
        const completed = course.user_progress?.completed_modules ?? 0;

        return (
          <div key={course.id}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrackIcon className="h-4 w-4 text-[var(--accent-primary)]" />
                <span className="text-sm font-semibold text-[var(--text-primary)]">{course.title}</span>
              </div>
              <span className="font-mono text-xs text-[var(--text-muted)]">
                {completed}/{modules.length}
              </span>
            </div>

            <div className="flex items-start overflow-x-auto pb-2">
              {modules.map((module, idx) => {
                const previous = modules[idx - 1];
                const connectorActive = idx > 0 && previous?.user_status === 'completed';
                const lockedReason = module.locked
                  ? modules.find((m) => module.prerequisites.includes(m.id) && m.user_status !== 'completed')?.title
                  : undefined;

                return (
                  <React.Fragment key={module.id}>
                    {idx > 0 && (
                      <div
                        className={`mt-5 h-0.5 w-8 shrink-0 sm:w-12 ${
                          connectorActive ? 'bg-[var(--accent-primary)]' : 'bg-[var(--border-subtle)]'
                        }`}
                      />
                    )}
                    <SkillNode module={module} lockedReason={lockedReason} />
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface SkillNodeProps {
  module: SkillTreeModule;
  lockedReason?: string;
}

const SkillNode: React.FC<SkillNodeProps> = ({ module, lockedReason }) => {
  const completed = module.user_status === 'completed';

  const circleClass = module.locked
    ? 'border-[var(--border-subtle)] bg-[rgba(15,23,42,0.04)] text-[var(--text-muted)]'
    : completed
    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white'
    : 'border-[var(--accent-primary)] bg-transparent text-[var(--accent-primary)]';

  const content = (
    <div className="flex w-20 flex-col items-center gap-1.5 text-center">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${circleClass}`}>
        {module.locked ? (
          <Lock className="h-4 w-4" />
        ) : completed ? (
          <Check className="h-4 w-4" />
        ) : (
          <span className="h-2 w-2 rounded-full bg-current" />
        )}
      </div>
      <span
        className={`line-clamp-2 text-[11px] leading-tight ${
          module.locked ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'
        }`}
      >
        {module.title}
      </span>
    </div>
  );

  if (module.locked) {
    return (
      <div className="cursor-not-allowed" title={lockedReason ? `Locked — complete "${lockedReason}" first` : 'Locked'}>
        {content}
      </div>
    );
  }

  return (
    <Link to={module.route} className="shrink-0" title={module.title}>
      {content}
    </Link>
  );
};

export default SkillTree;
