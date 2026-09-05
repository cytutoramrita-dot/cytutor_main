// Shared tutorial interfaces to ensure consistency across frontend and backend

export interface TutorialSection {
  title: string;
  type: 'text' | 'code' | 'video' | 'image' | 'interactive';
  content: string;
  codeLanguage?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation?: string;
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  route: string;
  estimated_time: number;
  prerequisites: string[];
  learning_objectives: string[];
  content: {
    sections: TutorialSection[];
  };
  quiz_data?: {
    questions: QuizQuestion[];
  };
  resources: string[];
  author: string;
  created_at: string;
  // User-specific fields (added by backend when user is authenticated)
  user_status?: 'not_started' | 'in_progress' | 'completed';
  user_progress?: number;
  user_quiz_score?: number;
  avg_rating?: string;
  rating_count?: number;
}

export interface TutorialProgress {
  user_id: string;
  tutorial_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress_percentage: number;
  current_section: number;
  quiz_score?: number;
  quiz_attempts: number;
  time_spent: number;
  started_at?: string;
  completed_at?: string;
  last_accessed_at: string;
  notes?: string;
}

export interface QuizSubmission {
  answers: number[];
}

export interface QuizResult {
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  passed: boolean;
  results: Array<{
    question: string;
    userAnswer: number;
    correctAnswer: number;
    isCorrect: boolean;
    explanation?: string;
  }>;
}