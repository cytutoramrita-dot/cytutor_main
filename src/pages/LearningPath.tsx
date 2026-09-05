import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { courseService } from '../services/courseApi';
import { challenges as challengesApi } from '../services/api';
import { Course } from '../types/course';
import { Challenge } from '../types';
import { LEARNING_PATHS } from '../utils/learningPaths';
import { resolveLearningPath, ResolvedPath } from '../utils/learningPathProgress';
import { getPathColorClasses } from '../utils/pathColors';
import { getIcon } from '../utils/iconMap';
import PathStageGraph from '../components/learningPaths/PathStageGraph';
import Card from '../components/ui/Card';

const LearningPath: React.FC = () => {
  const { pathId } = useParams<{ pathId: string }>();
  const [resolved, setResolved] = useState<ResolvedPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const def = LEARNING_PATHS.find((p) => p.id === pathId);
    if (!pathId || !def) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const [courses, challenges]: [Course[], Challenge[]] = await Promise.all([
          courseService.getAllCourses(),
          challengesApi.getAll(),
        ]);
        setResolved(resolveLearningPath(def, courses, challenges));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load learning path');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pathId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neon-green font-mono">Loading path...</div>
      </div>
    );
  }

  if (error || !resolved) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="text-center">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Path Not Found</h2>
          <p className="text-[var(--text-secondary)] mb-4">{error || 'The requested learning path could not be found.'}</p>
          <Link to="/learning-paths" className="text-neon-green hover:text-neon-green/80">
            ← Back to Learning Paths
          </Link>
        </Card>
      </div>
    );
  }

  const { def, stages, percentComplete, completedNodes, totalNodes } = resolved;
  const colorClasses = getPathColorClasses(def.color);
  const Icon = getIcon(def.icon);

  return (
    <div className="space-y-8 animate-fade-in">
      <Link to="/learning-paths" className="inline-flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Learning Paths
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex items-start space-x-6 mb-6">
            <div className={`w-20 h-20 rounded-xl ${colorClasses.bg} border ${colorClasses.border} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-10 h-10 ${colorClasses.text}`} />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">{def.title}</h1>
              <p className="text-[var(--text-secondary)] text-lg">{def.goal}</p>
            </div>
          </div>

          <Card>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Skills Covered</h3>
            <div className="flex flex-wrap gap-2">
              {def.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-2.5 py-1 rounded text-xs font-medium border"
                  style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className={`${colorClasses.bg} border ${colorClasses.border}`}>
            <div className="text-center mb-6">
              <div className="text-4xl font-bold text-[var(--text-primary)] mb-2">{percentComplete}%</div>
              <div className="text-[var(--text-secondary)]">Path Progress</div>
              <div className="w-full bg-gray-800 rounded-full h-3 mt-4">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${colorClasses.text.replace('text-', 'bg-')}`}
                  style={{ width: `${percentComplete}%` }}
                />
              </div>
            </div>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Completed Steps</span>
                <span className="text-[var(--text-primary)] font-mono">
                  {completedNodes}/{totalNodes}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Stages</span>
                <span className="text-[var(--text-primary)] font-mono">{stages.length}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Path Progression</h2>
        <PathStageGraph stages={stages} />
      </div>
    </div>
  );
};

export default LearningPath;
