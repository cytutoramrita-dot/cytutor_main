import { query } from '../db/index.js';
import { sendWelcomeEmail } from '../services/email.js';

/**
 * Utility script to send welcome emails to all existing verified users
 * This is a one-time operation for users who registered before the welcome email feature
 */

async function sendBulkWelcomeEmails() {
    try {
        console.log('🚀 Starting bulk welcome email send...\n');

        // Query all verified users who haven't received a welcome email yet
        const result = await query(`
            SELECT u.id, u.email, u.username, u.full_name
            FROM users u
            WHERE u.is_email_verified = TRUE
            ORDER BY u.created_at ASC
        `);

        const totalUsers = result.rows.length;
        console.log(`Found ${totalUsers} verified users\n`);

        if (totalUsers === 0) {
            console.log('No users to send emails to.');
            process.exit(0);
        }

        let successCount = 0;
        let failureCount = 0;
        const failures: string[] = [];

        // Send emails with rate limiting (to avoid provider limits)
        for (let i = 0; i < result.rows.length; i++) {
            const user = result.rows[i];

            try {
                console.log(`[${i + 1}/${totalUsers}] Sending to: ${user.email}...`);

                await sendWelcomeEmail(
                    user.email,
                    user.username,
                    user.full_name
                );

                successCount++;
                console.log(`  ✓ Sent successfully`);

                // Add a small delay between emails to avoid rate limiting
                // Most email providers limit: ~100 emails per minute
                if (i < result.rows.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
                }

            } catch (error) {
                failureCount++;
                failures.push(user.email);
                console.error(`  ✗ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('📊 Summary:');
        console.log('='.repeat(50));
        console.log(`Total Users: ${totalUsers}`);
        console.log(`✓ Successful: ${successCount}`);
        console.log(`✗ Failed: ${failureCount}`);

        if (failures.length > 0) {
            console.log('\nFailed emails:');
            failures.forEach(email => console.log(`  - ${email}`));
        }

        console.log('\n✅ Bulk email send complete!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }
}

// Run the script
sendBulkWelcomeEmails();
