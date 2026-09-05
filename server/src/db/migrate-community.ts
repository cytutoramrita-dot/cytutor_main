import { query } from './index.js';

async function run() {
  console.log('Running community migration...');

  // 1. communities
  await query(`
    CREATE TABLE IF NOT EXISTS communities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        leader_id UUID REFERENCES users(id) ON DELETE SET NULL,
        avatar TEXT,
        is_public BOOLEAN DEFAULT TRUE,
        max_members INTEGER DEFAULT 50,
        avg_score DECIMAL(10,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ communities table created');

  // 2. community_members
  await query(`
    CREATE TABLE IF NOT EXISTS community_members (
        community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) CHECK (role IN ('leader', 'member')) DEFAULT 'member',
        status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'rejected', 'left')) DEFAULT 'pending',
        community_score INTEGER DEFAULT 0,
        joined_at TIMESTAMP,
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (community_id, user_id)
    );
  `);
  console.log('✅ community_members table created');

  // 3. Indexes
  await query(`CREATE INDEX IF NOT EXISTS idx_communities_leader ON communities(leader_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_communities_created_by ON communities(created_by);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_community_members_user ON community_members(user_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_community_members_status ON community_members(community_id, status);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_community_members_score ON community_members(community_id, community_score DESC);`);
  console.log('✅ community indexes created');

  console.log('🎉 Community migration complete');
  process.exit(0);
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
