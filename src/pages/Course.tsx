import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { courseService } from '../services/courseApi';
import { Course as CourseType } from '../types/course';
import { ArrowLeft, Clock, Users, BookOpen, CheckCircle, PlayCircle, ExternalLink } from 'lucide-react';
import { getIcon } from '../utils/iconMap';
import Card from '../components/ui/Card';

const Course: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<CourseType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) return;
      
      try {
        setLoading(true);
        const courseData = await courseService.getCourseById(courseId);
        setCourse(courseData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load course');
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId]);

  const getCourseColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; border: string; text: string }> = {
      'neon-green': { bg: 'bg-green-400/10', border: 'border-green-400/30', text: 'text-green-400' },
      'neon-blue': { bg: 'bg-blue-400/10', border: 'border-blue-400/30', text: 'text-blue-400' },
      'neon-purple': { bg: 'bg-purple-400/10', border: 'border-purple-400/30', text: 'text-purple-400' },
      'yellow-400': { bg: 'bg-yellow-400/10', border: 'border-yellow-400/30', text: 'text-yellow-400' },
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neon-green font-mono">Loading course...</div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Course Not Found</h2>
          <p className="text-gray-400 mb-4">{error || 'The requested course could not be found.'}</p>
          <Link to="/materials" className="text-neon-green hover:text-neon-green/80">
            ← Back to Catalog
          </Link>
        </Card>
      </div>
    );
  }

  const IconComponent = getIcon(course.icon);
  const colorClasses = getCourseColorClasses(course.color);
  const progress = course.user_progress?.total_progress || 0;
  const completedModules = course.user_progress?.completed_modules || 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Back Navigation */}
      <Link 
        to="/materials" 
        className="inline-flex items-center text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Catalog
      </Link>

      {/* Course Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex items-start space-x-6 mb-6">
            <div className={`w-20 h-20 rounded-xl ${colorClasses.bg} border ${colorClasses.border} flex items-center justify-center flex-shrink-0`}>
              <IconComponent className={`w-10 h-10 ${colorClasses.text}`} />
            </div>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">{course.title}</h1>
              <p className="text-gray-400 text-lg mb-4">{course.description}</p>
              
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <BookOpen className="w-4 h-4" />
                  <span>{course.total_modules} modules</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{Math.floor(course.total_time / 60)}h {course.total_time % 60}m</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span className="capitalize">{course.level}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Learning Objectives */}
          <Card className="mb-6">
            <h3 className="text-lg font-bold text-white mb-4">What You'll Learn</h3>
            <ul className="space-y-2">
              {course.learning_objectives.map((objective, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-neon-green mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">{objective}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Progress Sidebar */}
        <div className="lg:col-span-1">
          <Card className={`${colorClasses.bg} border ${colorClasses.border}`}>
            <div className="text-center mb-6">
              <div className="text-4xl font-bold text-white mb-2">{progress}%</div>
              <div className="text-gray-400">Course Progress</div>
              <div className="w-full bg-gray-800 rounded-full h-3 mt-4">
                <div 
                  className={`h-3 rounded-full transition-all duration-500 ${colorClasses.text.replace('text-', 'bg-')}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Completed Modules</span>
                <span className="text-white font-mono">{completedModules}/{course.total_modules}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Time</span>
                <span className="text-white font-mono">{Math.floor(course.total_time / 60)}h {course.total_time % 60}m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Level</span>
                <span className="text-white capitalize">{course.level}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Course Modules */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Course Modules</h2>
        <div className="space-y-4">
          {course.modules && course.modules.length > 0 ? (
            course.modules.map((module, index) => {
              const statusInfo = getModuleStatus(module.user_status);
              
              return (
                <Link key={module.id} to={module.route} className="block group">
                  <Card className="hover:border-gray-600 transition-all duration-200">
                    <div className="flex items-center space-x-4 p-6">
                      {/* Module Number & Icon */}
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                          module.user_status === 'completed'
                            ? 'bg-green-500/20 text-green-400'
                            : module.user_status === 'in_progress'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : `${colorClasses.bg} ${colorClasses.text}`
                        }`}>
                          {index + 1}
                        </div>
                        {getModuleIcon(module.user_status)}
                      </div>

                      {/* Module Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-white group-hover:text-neon-green transition-colors">
                            {module.title}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm">
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
                        
                        <p className="text-sm text-gray-400 mb-2">{module.description}</p>
                        
                        {module.prerequisites && module.prerequisites.length > 0 && (
                          <div className="text-xs text-gray-500">
                            Prerequisites: {module.prerequisites.join(', ')}
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-medium ${statusInfo.class}`}>
                          {statusInfo.text}
                        </span>
                        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })
          ) : (
            <Card className="text-center py-12">
              <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No modules available</h3>
              <p className="text-gray-400">This course doesn't have any modules yet.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Course;