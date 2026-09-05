import React from 'react';
import { Course } from '../../types/course';
import { Link } from 'react-router-dom';
import { Clock, Users, ExternalLink } from 'lucide-react';
import { getIcon } from '../../utils/iconMap';
import Card from '../ui/Card';

interface CourseCardProps {
  course: Course;
}

const CourseCard: React.FC<CourseCardProps> = ({ course }) => {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'in_progress': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      default: return 'text-gray-400 border';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-green-400';
  };

  const getCourseColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; border: string; text: string }> = {
      'neon-green': { bg: 'bg-green-400/10', border: 'border-green-400/30', text: 'text-green-400' },
      'neon-blue': { bg: 'bg-blue-400/10', border: 'border-blue-400/30', text: 'text-blue-400' },
      'neon-purple': { bg: 'bg-purple-400/10', border: 'border-purple-400/30', text: 'text-purple-400' },
      'yellow-400': { bg: 'bg-yellow-400/10', border: 'border-yellow-400/30', text: 'text-yellow-400' },
    };
    return colorMap[color] || colorMap['neon-green'];
  };

  const totalHours = Math.floor(course.total_time / 60);
  const remainingMinutes = course.total_time % 60;
  const progress = course.user_progress?.total_progress || 0;
  const completedModules = course.user_progress?.completed_modules || 0;

  return (
    <Link to={`/course/${course.id}`} className="block">
      <Card className="transition-all duration-300 hover:border-neon-green/30 group cursor-pointer">
        {/* Course Header */}
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center space-x-4 flex-1">
            {/* Course Icon */}
            <div className={`w-16 h-16 rounded-lg ${getCourseColorClasses(course.color).bg} border ${getCourseColorClasses(course.color).border} flex items-center justify-center group-hover:scale-110 transition-transform`}>
              {React.createElement(getIcon(course.icon), { className: `w-8 h-8 ${getCourseColorClasses(course.color).text}` })}
            </div>

            {/* Course Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-xl font-bold text-white group-hover:text-neon-green transition-colors">{course.title}</h3>
                <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(course.user_progress?.status)}`} style={!course.user_progress?.status || course.user_progress.status === 'not_started' ? { backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' } : {}}>
                  {course.user_progress?.status === 'completed' ? 'Completed' :
                   course.user_progress?.status === 'in_progress' ? 'In Progress' : 'Not Started'}
                </span>
              </div>
              
              <p className="text-sm text-gray-400 mb-3 line-clamp-2">{course.description}</p>
              
              {/* Course Stats */}
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  {React.createElement(getIcon(course.icon), { className: "w-4 h-4" })}
                  <span>{course.total_modules} modules</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{totalHours > 0 ? `${totalHours}h ${remainingMinutes}m` : `${remainingMinutes}m`}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span className="capitalize">{course.level}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Progress and Action */}
          <div className="flex items-center space-x-4">
            {/* Progress Circle */}
            {progress > 0 && (
              <div className="text-center">
                <div className="text-lg font-bold text-white">{progress}%</div>
                <div className="text-xs text-gray-400">Complete</div>
              </div>
            )}
            
            {/* Action Icon */}
            <ExternalLink className="w-6 h-6 text-gray-400 group-hover:text-neon-green group-hover:translate-x-1 transition-all" />
          </div>
        </div>

        {/* Progress Bar */}
        {progress > 0 && (
          <div className="px-6 pb-4">
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="text-gray-400">Progress</span>
              <span className="text-white font-mono">
                {completedModules}/{course.total_modules} modules
              </span>
            </div>
            <div className="w-full rounded-full h-2" style={{ backgroundColor: 'var(--border-subtle)' }}>
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(progress)}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </Card>
    </Link>
  );
};

export default CourseCard;