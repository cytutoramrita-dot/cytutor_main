import React, { useEffect, useState } from 'react';
import { courseService } from '../services/courseApi';
import { challenges as challengesApi } from '../services/api';
import { Course } from '../types/course';
import { Challenge } from '../types';
import { resolveAllLearningPaths, ResolvedPath } from '../utils/learningPathProgress';
import PathCard from '../components/learningPaths/PathCard';
import Card from '../components/ui/Card';

const LearningPaths: React.FC = () => {
  const [paths, setPaths] = useState<ResolvedPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [courses, challenges]: [Course[], Challenge[]] = await Promise.all([
          courseService.getAllCourses(),
          challengesApi.getAll(),
        ]);
        setPaths(resolveAllLearningPaths(courses, challenges));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load learning paths');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neon-green font-mono">Loading learning paths...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="text-center">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Couldn't load learning paths</h2>
          <p className="text-[var(--text-secondary)]">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Learning Paths</h1>
        <p className="text-[var(--text-secondary)]">
          Curated progressions through courses and challenges, built for specific goals — pick one to see your progress.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {paths.map((path) => (
          <PathCard key={path.def.id} path={path} />
        ))}
      </div>
    </div>
  );
};

export default LearningPaths;
