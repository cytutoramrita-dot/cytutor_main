import { Course, CourseCatalog } from '../types/course';
import api from './api';

class CourseService {
  
  /**
   * Get all courses with user progress
   */
  async getAllCourses(): Promise<Course[]> {
    try {
      const response = await api.get('/courses');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      throw new Error('Failed to load courses');
    }
  }

  /**
   * Get specific course with modules and progress
   */
  async getCourseById(courseId: string): Promise<Course> {
    try {
      const response = await api.get(`/courses/${courseId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch course ${courseId}:`, error);
      throw new Error('Failed to load course');
    }
  }

  /**
   * Update course progress (recalculates based on tutorial progress)
   */
  async updateCourseProgress(courseId: string): Promise<any> {
    try {
      const response = await api.post(`/courses/${courseId}/progress`);
      return response.data;
    } catch (error) {
      console.error(`Failed to update course progress for ${courseId}:`, error);
      throw new Error('Failed to update course progress');
    }
  }

  /**
   * Get course categories
   */
  async getCategories(): Promise<string[]> {
    try {
      const response = await api.get('/courses/meta/categories');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch course categories:', error);
      return [];
    }
  }

  /**
   * Get featured courses
   */
  async getFeaturedCourses(): Promise<Course[]> {
    try {
      const allCourses = await this.getAllCourses();
      // For now, return first 2 courses as featured
      // In future, this could be a separate API endpoint
      return allCourses.slice(0, 2);
    } catch (error) {
      console.error('Failed to fetch featured courses:', error);
      return [];
    }
  }

  /**
   * Search courses by query
   */
  async searchCourses(query: string): Promise<Course[]> {
    try {
      const allCourses = await this.getAllCourses();
      const searchQuery = query.toLowerCase();
      
      return allCourses.filter(course => 
        course.title.toLowerCase().includes(searchQuery) ||
        course.description.toLowerCase().includes(searchQuery) ||
        course.tags.some(tag => tag.toLowerCase().includes(searchQuery)) ||
        course.category.toLowerCase().includes(searchQuery)
      );
    } catch (error) {
      console.error('Failed to search courses:', error);
      return [];
    }
  }

  /**
   * Get courses by category
   */
  async getCoursesByCategory(category: string): Promise<Course[]> {
    try {
      const allCourses = await this.getAllCourses();
      return allCourses.filter(course => course.category === category);
    } catch (error) {
      console.error(`Failed to fetch courses for category ${category}:`, error);
      return [];
    }
  }
}

export const courseService = new CourseService();