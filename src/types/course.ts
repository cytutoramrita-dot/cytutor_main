// Course catalog types for unified learning interface

export interface CourseModule {
  id: string;
  title: string;
  description: string;
  estimated_time: number;
  prerequisites: string[];
  user_status?: 'not_started' | 'in_progress' | 'completed';
  user_progress?: number;
  route: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  total_modules: number;
  total_time: number;
  modules: CourseModule[];
  icon: string;
  color: string;
  tags: string[];
  learning_objectives: string[];
  // User progress for the entire course
  user_progress?: {
    completed_modules: number;
    total_progress: number;
    status: 'not_started' | 'in_progress' | 'completed';
  };
}

export interface CourseCatalog {
  courses: Course[];
  featured_courses: string[];
  categories: string[];
}