import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../ui/Card';
import { Shield, Lock, Search, Bug, Zap, Globe, Network, Terminal } from 'lucide-react';
import { courseService } from '../../services/courseApi';
import { Course } from '../../types/course';

const TrainingDomains: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const coursesData = await courseService.getAllCourses();
        setCourses(coursesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load courses');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Terminal': return Terminal;
      case 'Network': return Network;
      case 'Lock': return Lock;
      case 'Search': return Search;
      case 'Bug': return Bug;
      case 'Zap': return Zap;
      case 'Globe': return Globe;
      default: return Shield;
    }
  };

  const getColorClass = (color: string) => {
    switch (color) {
      case 'neon-green': return 'text-neon-green border-neon-green/20 bg-neon-green/10';
      case 'neon-blue': return 'text-blue-400 border-blue-400/20 bg-blue-400/10';
      case 'neon-purple': return 'text-purple-400 border-purple-400/20 bg-purple-400/10';
      case 'yellow-400': return 'text-yellow-400 border-yellow-400/20 bg-yellow-400/10';
      default: return 'text-neon-green border-neon-green/20 bg-neon-green/10';
    }
  };

  if (loading) {
    return (
      <>
        <h2 className="text-xl font-bold text-white mt-8 mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2 text-neon-green"/> Training Domains
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-24 bg-gray-700 rounded"></div>
            </Card>
          ))}
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <h2 className="text-xl font-bold text-white mt-8 mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2 text-neon-green"/> Training Domains
        </h2>
        <Card>
          <div className="text-center py-8">
            <p className="text-red-400 mb-2">Failed to load courses</p>
            <p className="text-gray-400 text-sm">{error}</p>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <h2 className="text-xl font-bold text-white mt-8 mb-4 flex items-center">
        <Shield className="w-5 h-5 mr-2 text-neon-green"/> Training Domains
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => {
          const IconComponent = getIcon(course.icon);
          const colorClass = getColorClass(course.color);
          const progress = course.user_progress?.total_progress || 0;
          const completedModules = course.user_progress?.completed_modules || 0;
          
          return (
            <Link key={course.id} to={`/course/${course.id}`} className="block">
              <Card className="hover:border-white/20 transition-all duration-300 group cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg border ${colorClass} group-hover:scale-110 transition-transform`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-white">{course.total_modules}</span>
                    <p className="text-xs text-gray-400">modules</p>
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-neon-green transition-colors">
                  {course.title}
                </h3>
                <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                  {course.description}
                </p>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Progress</span>
                    <span className="text-white font-mono">
                      {completedModules}/{course.total_modules} ({progress}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        progress > 0 ? 'bg-neon-green' : 'bg-gray-600'
                      }`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                    <span>{course.total_time} min total</span>
                    <span className="capitalize">{course.level}</span>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
};

export default TrainingDomains;