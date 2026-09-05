import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { ResolvedPath } from '../../utils/learningPathProgress';
import { getPathColorClasses } from '../../utils/pathColors';
import { getIcon } from '../../utils/iconMap';
import Card from '../ui/Card';

interface PathCardProps {
  path: ResolvedPath;
}

const getProgressColor = (progress: number) => {
  if (progress >= 100) return 'bg-green-500';
  if (progress >= 50) return 'bg-yellow-500';
  return 'bg-green-400';
};

const PathCard: React.FC<PathCardProps> = ({ path }) => {
  const { def, percentComplete, completedNodes, totalNodes } = path;
  const colorClasses = getPathColorClasses(def.color);
  const Icon = getIcon(def.icon);

  return (
    <Link to={`/learning-paths/${def.id}`} className="block h-full">
      <Card className="transition-all duration-300 hover:border-neon-green/30 group cursor-pointer h-full">
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-lg ${colorClasses.bg} border ${colorClasses.border} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
            <Icon className={`w-7 h-7 ${colorClasses.text}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="text-lg font-bold text-[var(--text-primary)] group-hover:text-neon-green transition-colors truncate">
                {def.title}
              </h3>
              <ExternalLink className="w-4 h-4 text-[var(--text-muted)] group-hover:text-neon-green group-hover:translate-x-1 transition-all shrink-0" />
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-3 line-clamp-2">{def.goal}</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {def.skills.slice(0, 4).map((skill) => (
                <span
                  key={skill}
                  className="px-2 py-0.5 rounded text-[10px] font-medium border"
                  style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
                >
                  {skill}
                </span>
              ))}
            </div>
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-[var(--text-muted)]">Progress</span>
              <span className="text-[var(--text-primary)] font-mono">
                {completedNodes}/{totalNodes}
              </span>
            </div>
            <div className="w-full rounded-full h-2" style={{ backgroundColor: 'var(--border-subtle)' }}>
              <div
                className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(percentComplete)}`}
                style={{ width: `${percentComplete}%` }}
              />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default PathCard;
