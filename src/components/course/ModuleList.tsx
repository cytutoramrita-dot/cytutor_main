import React from 'react';
import { CourseModule } from '../../types/course';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle, PlayCircle, ExternalLink } from 'lucide-react';

interface ModuleListProps {
  modules: CourseModule[];
  courseColor: string;
}

const ModuleList: React.FC<ModuleListProps> = ({ modules, courseColor }) => {
  // Debug logging
  console.log('ModuleList received modules:', modules);
  console.log('ModuleList received courseColor:', courseColor);
  
  const getCourseColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; text: string }> = {
      'neon-green': { bg: 'bg-green-400/20', text: 'text-green-400' },
      'neon-purple': { bg: 'bg-purple-400/20', text: 'text-purple-400' },
      'yellow-400': { bg: 'bg-yellow-400/20', text: 'text-yellow-400' },
    };
    return colorMap[color] || colorMap['neon-green'];
  };
  const getModuleIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'in_progress':
        return <PlayCircle className="w-5 h-5 text-yellow-400" />;
      default:
        return <PlayCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getModuleStatus = (status?: string) => {
    switch (status) {
      case 'completed': return { text: 'Completed', class: 'text-green-400' };
      case 'in_progress': return { text: 'In Progress', class: 'text-yellow-400' };
      default: return { text: 'Start Module', class: 'text-gray-400' };
    }
  };

  // All modules are now accessible - no locking logic

  // If no modules, show a message
  if (!modules || modules.length === 0) {
    return (
      <div className="px-6 pb-6">
        <div className="text-center py-8">
          <p className="text-gray-400">No modules available for this course.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 pb-6">
      <div className="space-y-3">
        {modules.map((module, index) => {
          const locked = false; // All modules are accessible
          const statusInfo = getModuleStatus(module.user_status);
          
          const ModuleContent = (
            <div className={`flex items-center space-x-4 p-4 rounded-lg border transition-all duration-200 ${
              locked 
                ? 'bg-gray-900/50 border-gray-800 cursor-not-allowed opacity-60' 
                : 'bg-gray-900/30 border-gray-700 hover:border-gray-600 hover:bg-gray-900/50'
            }`}>
              {/* Module Number & Icon */}
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  locked 
                    ? 'bg-gray-800 text-gray-500' 
                    : module.user_status === 'completed'
                    ? 'bg-green-500/20 text-green-400'
                    : module.user_status === 'in_progress'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : `${getCourseColorClasses(courseColor).bg} ${getCourseColorClasses(courseColor).text}`
                }`}>
                  {index + 1}
                </div>
                {getModuleIcon(module.user_status)}
              </div>

              {/* Module Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className={`font-semibold ${locked ? 'text-gray-500' : 'text-white'}`}>
                    {module.title}
                  </h4>
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="flex items-center space-x-1 text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span>{module.estimated_time} min</span>
                    </div>
                    {module.user_progress && module.user_progress > 0 && (
                      <span className="text-xs text-gray-400">
                        {module.user_progress}% complete
                      </span>
                    )}
                  </div>
                </div>
                
                <p className={`text-sm ${locked ? 'text-gray-600' : 'text-gray-400'}`}>
                  {module.description}
                </p>
              </div>

              {/* Action Button */}
              <div className="flex-shrink-0">
                {!locked && (
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${statusInfo.class}`}>
                      {statusInfo.text}
                    </span>
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
                {locked && (
                  <span className="text-sm text-gray-500">Locked</span>
                )}
              </div>
            </div>
          );

          return (
            <Link 
              key={module.id} 
              to={module.route}
              className="block group"
            >
              {ModuleContent}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default ModuleList;