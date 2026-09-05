import { query } from '../db/index.js';
import { logger } from '../utils/logger.js';

export interface TutorialProgress {
  userId: string;
  tutorialId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progressPercentage: number;
  currentSection: number;
  // quizScore removed - tutorials are now quiz-free
  timeSpent: number;
  startedAt?: Date;
  completedAt?: Date;
  lastAccessedAt: Date;
  notes?: string;
}

export interface TutorialStats {
  totalUsers: number;
  completions: number;
  inProgress: number;
  avgProgress: number;
  avgTimeSpent: number;
  // avgQuizScore removed - tutorials are now quiz-free
  avgRating: number;
  ratingCount: number;
}

export class TutorialService {
  
  /**
   * Get user's progress for a specific tutorial
   */
  static async getUserProgress(userId: string, tutorialId: string): Promise<TutorialProgress | null> {
    try {
      const result = await query(`
        SELECT * FROM user_tutorial_progress 
        WHERE user_id = $1 AND tutorial_id = $2
      `, [userId, tutorialId]);
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get user tutorial progress:', error);
      throw error;
    }
  }
  
  /**
   * Get all tutorials with user progress
   */
  static async getTutorialsWithProgress(userId: string, filters?: {
    level?: string;
    category?: string;
    status?: string;
  }) {
    try {
      let whereClause = '';
      const params = [userId];
      
      if (filters) {
        const conditions = [];
        
        if (filters.level) {
          conditions.push(`t.level = $${params.length + 1}`);
          params.push(filters.level);
        }
        
        if (filters.category) {
          conditions.push(`t.category = $${params.length + 1}`);
          params.push(filters.category);
        }
        
        if (filters.status) {
          conditions.push(`COALESCE(utp.status, 'not_started') = $${params.length + 1}`);
          params.push(filters.status);
        }
        
        if (conditions.length > 0) {
          whereClause = `WHERE ${conditions.join(' AND ')}`;
        }
      }
      
      const result = await query(`
        SELECT 
          t.*,
          COALESCE(utp.status, 'not_started') as user_status,
          COALESCE(utp.progress_percentage, 0) as user_progress,
          COALESCE(utp.current_section, 0) as current_section,
          COALESCE(utp.time_spent, 0) as time_spent,
          utp.completed_at as user_completed_at,
          AVG(tr.rating) as avg_rating,
          COUNT(tr.rating) as rating_count
        FROM tutorials t
        LEFT JOIN user_tutorial_progress utp ON t.id = utp.tutorial_id AND utp.user_id = $1
        LEFT JOIN tutorial_ratings tr ON t.id = tr.tutorial_id
        ${whereClause}
        GROUP BY t.id, utp.status, utp.progress_percentage, utp.current_section, 
                 utp.time_spent, utp.completed_at
        ORDER BY t.level, t.category, t.title
      `, params);
      
      return result.rows.map(row => ({
        ...row,
        content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content,
        // quiz_data removed - tutorials are now quiz-free
        avg_rating: row.avg_rating ? parseFloat(row.avg_rating).toFixed(1) : null,
        rating_count: parseInt(row.rating_count) || 0
      }));
    } catch (error) {
      logger.error('Failed to get tutorials with progress:', error);
      throw error;
    }
  }
  
  /**
   * Update user progress for a tutorial
   */
  static async updateProgress(
    userId: string, 
    tutorialId: string, 
    updates: Partial<TutorialProgress>
  ) {
    try {
      const updateFields = [];
      const updateValues = [userId, tutorialId];
      let valueIndex = 3;
      
      if (updates.progressPercentage !== undefined) {
        updateFields.push(`progress_percentage = $${valueIndex++}`);
        updateValues.push(updates.progressPercentage);
        
        // Auto-update status based on progress
        if (updates.progressPercentage === 100) {
          updateFields.push(`status = 'completed'`);
          updateFields.push(`completed_at = CURRENT_TIMESTAMP`);
        } else if (updates.progressPercentage > 0) {
          updateFields.push(`status = 'in_progress'`);
        }
      }
      
      if (updates.currentSection !== undefined) {
        updateFields.push(`current_section = $${valueIndex++}`);
        updateValues.push(updates.currentSection);
      }
      
      if (updates.timeSpent !== undefined) {
        updateFields.push(`time_spent = time_spent + $${valueIndex++}`);
        updateValues.push(updates.timeSpent);
      }
      
      if (updates.notes !== undefined) {
        updateFields.push(`notes = $${valueIndex++}`);
        updateValues.push(updates.notes);
      }
      
      // Quiz functionality removed - tutorials are now quiz-free
      
      updateFields.push(`last_accessed_at = CURRENT_TIMESTAMP`);
      
      const upsertQuery = `
        INSERT INTO user_tutorial_progress (user_id, tutorial_id, started_at, last_accessed_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, tutorial_id)
        DO UPDATE SET ${updateFields.join(', ')}
        RETURNING *
      `;
      
      const result = await query(upsertQuery, updateValues);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update tutorial progress:', error);
      throw error;
    }
  }
  
  /**
   * Get tutorial statistics
   */
  static async getTutorialStats(tutorialId: string): Promise<TutorialStats | null> {
    try {
      const result = await query(`
        SELECT 
          COUNT(DISTINCT utp.user_id) as total_users,
          COUNT(CASE WHEN utp.status = 'completed' THEN 1 END) as completions,
          COUNT(CASE WHEN utp.status = 'in_progress' THEN 1 END) as in_progress,
          AVG(utp.progress_percentage) as avg_progress,
          AVG(utp.time_spent) as avg_time_spent,
          AVG(tr.rating) as avg_rating,
          COUNT(tr.rating) as rating_count
        FROM tutorials t
        LEFT JOIN user_tutorial_progress utp ON t.id = utp.tutorial_id
        LEFT JOIN tutorial_ratings tr ON t.id = tr.tutorial_id
        WHERE t.id = $1
        GROUP BY t.id
      `, [tutorialId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const stats = result.rows[0];
      return {
        totalUsers: parseInt(stats.total_users) || 0,
        completions: parseInt(stats.completions) || 0,
        inProgress: parseInt(stats.in_progress) || 0,
        avgProgress: parseFloat(stats.avg_progress) || 0,
        avgTimeSpent: parseFloat(stats.avg_time_spent) || 0,
        // avgQuizScore removed - tutorials are now quiz-free
        avgRating: parseFloat(stats.avg_rating) || 0,
        ratingCount: parseInt(stats.rating_count) || 0
      };
    } catch (error) {
      logger.error('Failed to get tutorial statistics:', error);
      throw error;
    }
  }
  
  /**
   * Get user's learning path recommendations
   */
  static async getRecommendedTutorials(userId: string, limit: number = 5) {
    try {
      // Get user's completed tutorials and skill level
      const userProgress = await query(`
        SELECT 
          t.category,
          t.level,
          COUNT(*) as completed_count
        FROM user_tutorial_progress utp
        JOIN tutorials t ON utp.tutorial_id = t.id
        WHERE utp.user_id = $1 AND utp.status = 'completed'
        GROUP BY t.category, t.level
      `, [userId]);
      
      // Find tutorials user hasn't started yet
      const recommendations = await query(`
        SELECT 
          t.*,
          AVG(tr.rating) as avg_rating,
          COUNT(tr.rating) as rating_count
        FROM tutorials t
        LEFT JOIN tutorial_ratings tr ON t.id = tr.tutorial_id
        LEFT JOIN user_tutorial_progress utp ON t.id = utp.tutorial_id AND utp.user_id = $1
        WHERE utp.tutorial_id IS NULL
        GROUP BY t.id
        ORDER BY t.level, avg_rating DESC NULLS LAST, t.created_at DESC
        LIMIT $2
      `, [userId, limit]);
      
      return recommendations.rows.map(row => ({
        ...row,
        content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content,
        avg_rating: row.avg_rating ? parseFloat(row.avg_rating).toFixed(1) : null,
        rating_count: parseInt(row.rating_count) || 0
      }));
    } catch (error) {
      logger.error('Failed to get tutorial recommendations:', error);
      throw error;
    }
  }
  
  /**
   * Get user's learning analytics
   */
  static async getUserAnalytics(userId: string) {
    try {
      const analytics = await query(`
        SELECT 
          COUNT(*) as total_tutorials,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
          AVG(progress_percentage) as avg_progress,
          SUM(time_spent) as total_time_spent,
          MAX(last_accessed_at) as last_activity
        FROM user_tutorial_progress
        WHERE user_id = $1
      `, [userId]);
      
      const categoryProgress = await query(`
        SELECT 
          t.category,
          COUNT(*) as total,
          COUNT(CASE WHEN utp.status = 'completed' THEN 1 END) as completed,
          AVG(utp.progress_percentage) as avg_progress
        FROM user_tutorial_progress utp
        JOIN tutorials t ON utp.tutorial_id = t.id
        WHERE utp.user_id = $1
        GROUP BY t.category
        ORDER BY completed DESC, avg_progress DESC
      `, [userId]);
      
      return {
        overview: analytics.rows[0],
        byCategory: categoryProgress.rows
      };
    } catch (error) {
      logger.error('Failed to get user analytics:', error);
      throw error;
    }
  }
  
  /**
   * Check if user meets prerequisites for a tutorial
   */
  static async checkPrerequisites(userId: string, tutorialId: string): Promise<{
    canAccess: boolean;
    missingPrerequisites: string[];
  }> {
    try {
      // Get tutorial prerequisites
      const tutorialResult = await query(`
        SELECT prerequisites FROM tutorials WHERE id = $1
      `, [tutorialId]);
      
      if (tutorialResult.rows.length === 0) {
        return { canAccess: false, missingPrerequisites: [] };
      }
      
      const prerequisites = tutorialResult.rows[0].prerequisites || [];
      
      if (prerequisites.length === 0) {
        return { canAccess: true, missingPrerequisites: [] };
      }
      
      // Check which prerequisites are completed
      const completedResult = await query(`
        SELECT tutorial_id 
        FROM user_tutorial_progress 
        WHERE user_id = $1 AND tutorial_id = ANY($2) AND status = 'completed'
      `, [userId, prerequisites]);
      
      const completedIds = completedResult.rows.map(row => row.tutorial_id);
      const missingPrerequisites = prerequisites.filter((id: string) => !completedIds.includes(id));
      
      return {
        canAccess: missingPrerequisites.length === 0,
        missingPrerequisites
      };
    } catch (error) {
      logger.error('Failed to check prerequisites:', error);
      throw error;
    }
  }
}

export default TutorialService;