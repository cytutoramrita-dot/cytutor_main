import { query } from './index.js';

async function run() {
  console.log('Running classroom migration...');

  // 1. Add role to users
  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student'
    CHECK (role IN ('student', 'mentor', 'admin'));
  `);
  console.log('✅ users.role added');

  // 2. classrooms
  await query(`
    CREATE TABLE IF NOT EXISTS classrooms (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name        TEXT NOT NULL,
      description TEXT,
      mentor_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      invite_code TEXT NOT NULL UNIQUE,
      is_active   BOOLEAN NOT NULL DEFAULT TRUE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_classrooms_mentor ON classrooms(mentor_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_classrooms_invite ON classrooms(invite_code);`);
  console.log('✅ classrooms table created');

  // 3. classroom_members
  await query(`
    CREATE TABLE IF NOT EXISTS classroom_members (
      classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
      user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (classroom_id, user_id)
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_cm_user ON classroom_members(user_id);`);
  console.log('✅ classroom_members table created');

  // 4. classroom_challenges (mentor-authored, scoped to classroom)
  await query(`
    CREATE TABLE IF NOT EXISTS classroom_challenges (
      id               TEXT PRIMARY KEY,
      classroom_id     UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
      title            TEXT NOT NULL,
      description      TEXT NOT NULL,
      category         TEXT NOT NULL,
      difficulty       TEXT NOT NULL CHECK (difficulty IN ('Easy','Medium','Hard')),
      points           INTEGER NOT NULL,
      challenge_type   TEXT NOT NULL CHECK (challenge_type IN ('description','downloadable')),
      flag             TEXT NOT NULL,
      hints            TEXT[],
      file_attachments TEXT[],
      created_by       UUID NOT NULL REFERENCES users(id),
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_cc_classroom ON classroom_challenges(classroom_id);`);
  console.log('✅ classroom_challenges table created');

  // 5. assignments
  await query(`
    CREATE TABLE IF NOT EXISTS assignments (
      id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      classroom_id           UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
      created_by             UUID NOT NULL REFERENCES users(id),
      title                  TEXT NOT NULL,
      instructions           TEXT,
      global_challenge_id    TEXT REFERENCES challenges(id) ON DELETE SET NULL,
      classroom_challenge_id TEXT REFERENCES classroom_challenges(id) ON DELETE SET NULL,
      due_date               TIMESTAMPTZ,
      assigned_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      is_active              BOOLEAN NOT NULL DEFAULT TRUE,
      CONSTRAINT one_challenge_source CHECK (
        (global_challenge_id IS NOT NULL)::int +
        (classroom_challenge_id IS NOT NULL)::int = 1
      )
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_assignments_classroom ON assignments(classroom_id);`);
  console.log('✅ assignments table created');

  // 6. assignment_submissions
  await query(`
    CREATE TABLE IF NOT EXISTS assignment_submissions (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      assignment_id  UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
      user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      submitted_flag TEXT NOT NULL,
      is_correct     BOOLEAN NOT NULL,
      attempts       INTEGER NOT NULL DEFAULT 1,
      submitted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (assignment_id, user_id)
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_as_assignment ON assignment_submissions(assignment_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_as_user ON assignment_submissions(user_id);`);
  console.log('✅ assignment_submissions table created');

  console.log('🎉 Classroom migration complete');
  process.exit(0);
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
