import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Course } from '../../types/course';
import { courseService } from '../../services/courseApi';
import CourseCard from './CourseCard';
import { Search, Filter, BookOpen, Clock, CheckCircle, PlayCircle } from 'lucide-react';
import Card from '../ui/Card';

const CourseCatalog: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [view, setView] = useState<'courses' | 'modules'>('courses');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [coursesData, categoriesData] = await Promise.all([
          courseService.getAllCourses(),
          courseService.getCategories()
        ]);
        console.log('Fetched courses data:', coursesData);
        console.log('Fetched categories data:', categoriesData);
        setCourses(coursesData);
        setFilteredCourses(coursesData);
        setCategories(categoriesData);
      } catch (err) {
        console.error('Error fetching course data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load courses');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    let filtered = courses;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(course => 
        course.title.toLowerCase().includes(query) ||
        course.description.toLowerCase().includes(query) ||
        course.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(course => course.category === selectedCategory);
    }

    setFilteredCourses(filtered);
  }, [courses, searchQuery, selectedCategory]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neon-green font-mono">Loading courses...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Error Loading Courses</h2>
          <p className="text-gray-400">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Learning Catalog</h1>
        <p className="text-gray-400">
          Comprehensive courses designed to build your cybersecurity and technical skills.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:border-neon-green"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
          />
        </div>

        {/* Category Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="pl-10 pr-8 py-3 rounded-lg focus:outline-none focus:border-neon-green appearance-none cursor-pointer"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Course Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          hover
          onClick={() => setView('courses')}
          className={`p-4 bg-neon-green/5 ${view === 'courses' ? 'border-neon-green' : 'border-neon-green/20'}`}
        >
          <div className="flex items-center space-x-3">
            <BookOpen className="w-6 h-6 text-neon-green" />
            <div>
              <p className="text-lg font-bold text-white">{filteredCourses.length}</p>
              <p className="text-sm text-gray-400">Total Courses</p>
            </div>
          </div>
        </Card>

        <Card
          hover
          onClick={() => setView('modules')}
          className={`p-4 bg-yellow-500/5 ${view === 'modules' ? 'border-yellow-400' : 'border-yellow-500/20'}`}
        >
          <div className="flex items-center space-x-3">
            <BookOpen className="w-6 h-6 text-yellow-400" />
            <div>
              <p className="text-lg font-bold text-white">
                {filteredCourses.reduce((sum, course) => sum + Number(course.total_modules || 0), 0)}
              </p>
              <p className="text-sm text-gray-400">Total Modules</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-neon-purple/5 border-neon-purple/20">
          <div className="flex items-center space-x-3">
            <BookOpen className="w-6 h-6 text-neon-purple" />
            <div>
              <p className="text-lg font-bold text-white">
                {Math.floor(filteredCourses.reduce((sum, course) => sum + course.total_time, 0) / 60)}h
              </p>
              <p className="text-sm text-gray-400">Total Content</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Courses / Modules List */}
      {view === 'courses' ? (
        <div className="space-y-4">
          {filteredCourses.length === 0 ? (
            <Card className="text-center py-12">
              <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No courses found</h3>
              <p className="text-gray-400">
                {searchQuery || selectedCategory !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'No courses are available at the moment.'}
              </p>
            </Card>
          ) : (
            filteredCourses.map(course => (
              <CourseCard key={course.id} course={course} />
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCourses.every(course => course.modules.length === 0) ? (
            <Card className="text-center py-12">
              <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No modules found</h3>
              <p className="text-gray-400">
                {searchQuery || selectedCategory !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'No modules are available at the moment.'}
              </p>
            </Card>
          ) : (
            filteredCourses.map(course => course.modules.length > 0 && (
              <div key={course.id} className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">{course.title}</p>
                {course.modules.map((module, index) => (
                  <Link key={module.id} to={module.route} className="block group">
                    <Card hover className="p-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-neon-green/10 text-neon-green flex-shrink-0">
                          {index + 1}
                        </div>
                        {module.user_status === 'completed' ? (
                          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                        ) : (
                          <PlayCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-white group-hover:text-neon-green transition-colors truncate">
                            {module.title}
                          </h4>
                          <p className="text-sm text-gray-400 line-clamp-1">{module.description}</p>
                        </div>
                        <div className="flex items-center space-x-1 text-sm text-gray-500 flex-shrink-0">
                          <Clock className="w-4 h-4" />
                          <span>{module.estimated_time} min</span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CourseCatalog;