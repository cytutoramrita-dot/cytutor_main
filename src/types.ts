export interface User {
  id: string;
  email: string;
  fullName?: string;
  username?: string;
  avatar?: string;
  location?: string;
  timezone?: string; // IANA Timezone string (e.g., 'America/New_York')
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  interests?: string[];
  bio?: string;
  goals?: string;
  isProfileComplete: boolean;
  isEmailVerified: boolean;
  role: 'student' | 'mentor' | 'admin';
  stats: UserStats;
}

// ─── Mentored Classroom ───────────────────────────────────────────────────────

export interface Classroom {
  id: string;
  name: string;
  description?: string;
  mentor_id: string;
  mentor_name?: string;
  invite_code: string;
  is_active: boolean;
  approval_status: 'pending' | 'approved' | 'rejected';
  member_count?: number;
  created_at: string;
  // Set by GET /classrooms/my to indicate user's relationship to the classroom
  my_relation?: 'owner' | 'member';
  // Only present when my_relation = 'member'
  join_status?: 'pending' | 'approved' | 'rejected';
}

export interface JoinRequest {
  user_id: string;
  full_name: string;
  username: string;
  email: string;
  avatar?: string;
  requested_at: string;
}

export interface ClassroomMember {
  id: string;
  full_name: string;
  username: string;
  email: string;
  avatar?: string;
  joined_at: string;
  total_points: number;
  challenges_solved: number;
  assignments_completed: number;
}

export interface ClassroomChallenge {
  id: string;
  classroom_id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  points: number;
  challenge_type: 'description' | 'downloadable';
  flag?: string;
  hints?: string[];
  file_attachments?: string[];
  created_by: string;
  created_at: string;
}

export type AssignmentStatus = 'pending' | 'attempted' | 'completed' | 'overdue';

export interface Assignment {
  id: string;
  classroom_id: string;
  classroom_name?: string;
  created_by: string;
  title: string;
  instructions?: string;
  // global challenge fields
  global_challenge_id?: string;
  challenge_title?: string;
  challenge_difficulty?: string;
  challenge_points?: number;
  challenge_category?: string;
  // classroom challenge fields
  classroom_challenge_id?: string;
  cc_title?: string;
  cc_difficulty?: string;
  cc_points?: number;
  cc_category?: string;
  due_date?: string;
  assigned_at: string;
  is_active: boolean;
  // submission state (joined for current user)
  is_correct?: boolean;
  attempts?: number;
  submitted_at?: string;
  // present when fetched via the per-student progress endpoint
  status?: AssignmentStatus;
}

export interface AssignmentProgressRow {
  id: string;
  full_name: string;
  username: string;
  email: string;
  is_correct?: boolean;
  attempts?: number;
  submitted_at?: string;
  status: AssignmentStatus;
}

export interface LeaderboardEntry {
  id: string;
  full_name: string;
  username: string;
  avatar?: string;
  assignments_completed: number;
  classroom_points: number;
  rank: number;
}

export interface UserStats {
  challengesSolved: number;
  totalPoints: number;
  globalRank: number;
  dayStreak: number;
  maxStreak: number;
  previousStreak?: number; // Stores the streak count before a break, allowing for repair
  lastActiveDate: string; // ISO YYYY-MM-DD
  streakFreezes: number;
  level: number;
  xp: number;
  activityHistory: string[]; // Array of YYYY-MM-DD
}

export interface Challenge {
  id: string;
  title: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  points: number;
  description: string;
  status: 'locked' | 'available' | 'completed' | 'running';
  challenge_type: 'web' | 'terminal' | 'description' | 'downloadable';
  hints?: string[];
  file_attachments?: string[];
  instance_port?: number;
  container_id?: string;
  last_started_at?: string;
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  route: string;
}

// ─── Community ────────────────────────────────────────────────────────────

export interface Community {
  id: string;
  name: string;
  description?: string;
  is_public: boolean;
  avg_score: number;
  max_members: number;
  member_count: number;
  leader_username: string;
  leader_avatar?: string;
  created_at: string;
}

export interface CommunityMember {
  id: string;
  username: string;
  avatar?: string;
  experience_level: string;
  role: 'leader' | 'member';
  community_score: number;
  joined_at: string;
  rank: number;
}

export interface CommunityJoinRequest {
  id: string;
  username: string;
  avatar?: string;
  experience_level: string;
  requested_at: string;
}

export enum AuthStep {
  LOGIN,
  OTP,
  ONBOARDING_1,
  ONBOARDING_2,
  ONBOARDING_3,
  COMPLETE
}