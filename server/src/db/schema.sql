-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    username VARCHAR(100) UNIQUE,
    avatar TEXT,
    location VARCHAR(255),
    timezone VARCHAR(100) DEFAULT 'UTC',
    experience_level VARCHAR(20) CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
    interests TEXT[],
    bio TEXT,
    goals TEXT,
    is_profile_complete BOOLEAN DEFAULT FALSE,
    is_email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OTP table for email verification and password reset
CREATE TABLE IF NOT EXISTS otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    otp_type VARCHAR(20) CHECK (otp_type IN ('signup', 'forgot_password')) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for OTP lookups
CREATE INDEX IF NOT EXISTS idx_otps_email_type ON otps(email, otp_type, is_used);

-- User stats table
CREATE TABLE IF NOT EXISTS user_stats (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    challenges_solved INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    global_rank INTEGER DEFAULT 9999,
    day_streak INTEGER DEFAULT 0,
    max_streak INTEGER DEFAULT 0,
    previous_streak INTEGER,
    last_active_date DATE,
    streak_freezes INTEGER DEFAULT 1,
    streak_claimed_today BOOLEAN DEFAULT FALSE,
    streak_broken_at TIMESTAMP,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    activity_history DATE[] DEFAULT ARRAY[]::DATE[],
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Challenges table (using TEXT for id to match challenge registry)
CREATE TABLE IF NOT EXISTS challenges (
    id TEXT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    difficulty VARCHAR(20) CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    points INTEGER NOT NULL,
    description TEXT NOT NULL,
    flag VARCHAR(255),
    challenge_type VARCHAR(20) CHECK (challenge_type IN ('terminal', 'web', 'description', 'downloadable')) NOT NULL DEFAULT 'web',
    hints TEXT[], -- Array of hint strings
    file_attachments TEXT[], -- Array of file URLs/paths for downloadable challenges
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User challenge progress
CREATE TABLE IF NOT EXISTS user_challenges (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    challenge_id TEXT REFERENCES challenges(id) ON DELETE CASCADE,
    status VARCHAR(20) CHECK (status IN ('locked', 'available', 'completed', 'running', 'stopped', 'expired')),
    completed_at TIMESTAMP,
    container_id VARCHAR(255),
    instance_port INTEGER,
    last_started_at TIMESTAMP,
    PRIMARY KEY (user_id, challenge_id)
);

-- Tutorials table (quiz-free)
CREATE TABLE IF NOT EXISTS tutorials (
    id TEXT PRIMARY KEY, -- Changed to TEXT to match JSON structure
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    level VARCHAR(20) CHECK (level IN ('beginner', 'intermediate', 'advanced')),
    category VARCHAR(100) NOT NULL,
    route VARCHAR(255) NOT NULL,
    estimated_time INTEGER, -- in minutes
    prerequisites TEXT[], -- array of tutorial IDs
    learning_objectives TEXT[],
    content JSONB, -- structured content sections
    resources TEXT[], -- external links
    completion_rate DECIMAL(5,2) DEFAULT 0.00,
    author VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    level VARCHAR(20) CHECK (level IN ('beginner', 'intermediate', 'advanced')),
    total_modules INTEGER DEFAULT 0,
    total_time INTEGER DEFAULT 0, -- in minutes
    icon VARCHAR(50),
    color VARCHAR(50),
    tags TEXT[],
    learning_objectives TEXT[],
    completion_rate DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Course modules mapping
CREATE TABLE IF NOT EXISTS course_modules (
    id TEXT PRIMARY KEY,
    course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
    tutorial_id TEXT REFERENCES tutorials(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_time INTEGER,
    prerequisites TEXT[],
    route VARCHAR(255),
    UNIQUE(course_id, tutorial_id),
    UNIQUE(course_id, order_index)
);

-- User course progress tracking
CREATE TABLE IF NOT EXISTS user_course_progress (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
    status VARCHAR(20) CHECK (status IN ('not_started', 'in_progress', 'completed')) DEFAULT 'not_started',
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    completed_modules INTEGER DEFAULT 0,
    total_modules INTEGER DEFAULT 0,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, course_id)
);

-- User tutorial progress tracking (quiz-free)
CREATE TABLE IF NOT EXISTS user_tutorial_progress (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tutorial_id TEXT REFERENCES tutorials(id) ON DELETE CASCADE,
    status VARCHAR(20) CHECK (status IN ('not_started', 'in_progress', 'completed')) DEFAULT 'not_started',
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    current_section INTEGER DEFAULT 0,
    time_spent INTEGER DEFAULT 0, -- in minutes
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    PRIMARY KEY (user_id, tutorial_id)
);

-- Tutorial ratings and feedback
CREATE TABLE IF NOT EXISTS tutorial_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tutorial_id TEXT REFERENCES tutorials(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    is_helpful BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, tutorial_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_user_stats_global_rank ON user_stats(global_rank);
CREATE INDEX IF NOT EXISTS idx_user_stats_last_active ON user_stats(last_active_date);
CREATE INDEX IF NOT EXISTS idx_user_stats_streak_claimed ON user_stats(user_id, streak_claimed_today);
CREATE INDEX IF NOT EXISTS idx_user_challenges_user_id ON user_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_category ON challenges(category);
CREATE INDEX IF NOT EXISTS idx_tutorials_category ON tutorials(category);
CREATE INDEX IF NOT EXISTS idx_tutorials_level ON tutorials(level);
CREATE INDEX IF NOT EXISTS idx_user_tutorial_progress_user_id ON user_tutorial_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tutorial_progress_status ON user_tutorial_progress(status);
CREATE INDEX IF NOT EXISTS idx_tutorial_ratings_tutorial_id ON tutorial_ratings(tutorial_id);

-- Ports table for atomic allocation
CREATE TABLE IF NOT EXISTS ports (
    port INTEGER PRIMARY KEY,
    is_allocated BOOLEAN DEFAULT FALSE,
    allocated_at TIMESTAMP,
    allocated_to UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ports_is_allocated ON ports(is_allocated);
