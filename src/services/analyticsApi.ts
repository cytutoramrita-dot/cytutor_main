import api from './api';

export interface RecentActivity {
  type: 'tutorial' | 'challenge';
  name: string;
  category: string;
  activity_date: string;
  status: string;
  progress: number;
}

export interface LeaderboardEntry {
  username: string;
  full_name?: string;
  avatar?: string;
  tutorials_completed: number;
  challenges_completed: number;
  total_points: number;
  total_time_spent: number;
  avg_quiz_score?: number;
}

export interface AnalyticsDashboard {
  tutorials: any;
  challenges: any;
  recentActivity: RecentActivity[];
  streak: {
    day_streak: number;
    max_streak: number;
    last_active_date: string | null;
  };
}

class AnalyticsService {
  
  /**
   * Get user's analytics dashboard data
   */
  async getDashboard(): Promise<AnalyticsDashboard> {
    try {
      const response = await api.get('/analytics/dashboard');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch analytics dashboard:', error);
      throw new Error('Failed to load analytics data');
    }
  }

  /**
   * Get recent activity for the user
   */
  async getRecentActivity(limit: number = 10): Promise<RecentActivity[]> {
    try {
      const dashboard = await this.getDashboard();
      return dashboard.recentActivity.slice(0, limit);
    } catch (error) {
      console.error('Failed to fetch recent activity:', error);
      return [];
    }
  }

  /**
   * Get leaderboard data
   */
  async getLeaderboard(limit: number = 10, timeframe: 'all' | 'week' | 'month' = 'week'): Promise<LeaderboardEntry[]> {
    try {
      const response = await api.get(`/analytics/leaderboard?limit=${limit}&timeframe=${timeframe}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      return [];
    }
  }

  /**
   * Get learning recommendations
   */
  async getRecommendations(limit: number = 5): Promise<any[]> {
    try {
      const response = await api.get(`/analytics/recommendations?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      return [];
    }
  }

  /**
   * Get progress timeline
   */
  async getProgressTimeline(days: number = 30): Promise<any[]> {
    try {
      const response = await api.get(`/analytics/progress-timeline?days=${days}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch progress timeline:', error);
      return [];
    }
  }

  /**
   * Get skills assessment
   */
  async getSkills(): Promise<any[]> {
    try {
      const response = await api.get('/analytics/skills');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch skills assessment:', error);
      return [];
    }
  }
}

export const analyticsService = new AnalyticsService();