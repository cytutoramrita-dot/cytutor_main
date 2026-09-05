import { query } from './index.js';

async function run() {
  console.log('Running classroom approval migration...');

  // 1. Add approval_status to classrooms (pending → approved → rejected)
  await query(`
    ALTER TABLE classrooms
    ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  `);
  // Back-fill: any classroom that is currently active is already approved
  await query(`
    UPDATE classrooms SET approval_status = 'approved'
    WHERE is_active = TRUE AND approval_status = 'pending';
  `);
  console.log('✅ classrooms.approval_status added');

  // 2. Add join_status to classroom_members
  await query(`
    ALTER TABLE classroom_members
    ADD COLUMN IF NOT EXISTS join_status TEXT NOT NULL DEFAULT 'approved'
    CHECK (join_status IN ('pending', 'approved', 'rejected'));
  `);

  // 3. Add approved_at timestamp
  await query(`
    ALTER TABLE classroom_members
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
  `);
  // Back-fill existing rows
  await query(`
    UPDATE classroom_members SET approved_at = joined_at
    WHERE approved_at IS NULL AND join_status = 'approved';
  `);
  console.log('✅ classroom_members.join_status and approved_at added');

  console.log('🎉 Classroom approval migration complete');
  process.exit(0);
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
