import { query } from './index.js';

async function run() {
  console.log('Running assignment attachments migration...');

  await query(`
    ALTER TABLE assignments
    ADD COLUMN IF NOT EXISTS attachment_urls TEXT[];
  `);
  console.log('✅ assignments.attachment_urls added');

  console.log('🎉 Assignment attachments migration complete');
  process.exit(0);
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
