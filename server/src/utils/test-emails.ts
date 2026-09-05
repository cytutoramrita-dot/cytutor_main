import { sendWelcomeEmail, sendStreakReminderEmail, sendStreakLostEmail } from '../services/email.js';

/**
 * Test script to send all email types to a test user
 * This helps verify all email templates are working correctly
 */

const TEST_EMAIL = 'mstejas6105@gmail.com'; // Your email
const TEST_NAME = 'Tejas';
const TEST_USERNAME = 'mstejas6105';

async function testAllEmails() {
    console.log('📧 Testing all email templates...\n');
    console.log(`Sending all emails to: ${TEST_EMAIL}\n`);

    try {
        // Test 1: Welcome Email
        console.log('1️⃣ Sending Welcome Email...');
        await sendWelcomeEmail(TEST_EMAIL, TEST_USERNAME, TEST_NAME);
        console.log('   ✓ Welcome email sent!\n');

        // Small delay between emails
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test 2: Streak Reminder Email
        console.log('2️⃣ Sending Streak Reminder Email...');
        await sendStreakReminderEmail(
            TEST_EMAIL,
            TEST_NAME,
            7,  // 7-day current streak
            14, // 14-day max streak
            2   // 2 freezes available
        );
        console.log('   ✓ Streak reminder sent!\n');

        // Small delay between emails
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test 3: Streak Lost Email (with restore option)
        console.log('3️⃣ Sending Streak Lost Email (can restore)...');
        await sendStreakLostEmail(
            TEST_EMAIL,
            TEST_NAME,
            10,   // Lost a 10-day streak
            14,   // Max streak is 14 days
            true  // Can restore (has enough points)
        );
        console.log('   ✓ Streak lost email (with restore) sent!\n');

        // Small delay between emails
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test 4: Streak Lost Email (without restore option)
        console.log('4️⃣ Sending Streak Lost Email (cannot restore)...');
        await sendStreakLostEmail(
            TEST_EMAIL,
            TEST_NAME,
            5,     // Lost a 5-day streak
            14,    // Max streak is 14 days
            false  // Cannot restore (not enough points)
        );
        console.log('   ✓ Streak lost email (no restore) sent!\n');

        console.log('='.repeat(50));
        console.log('✅ All test emails sent successfully!');
        console.log('='.repeat(50));
        console.log('\n📬 Check your inbox at:', TEST_EMAIL);
        console.log('\nYou should have received 4 emails:');
        console.log('  1. Welcome to CyTutor');
        console.log('  2. Keep Your Streak Alive!');
        console.log('  3. Streak Broken (with restore option)');
        console.log('  4. Streak Broken (no restore option)');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error sending test emails:', error);
        process.exit(1);
    }
}

// Run the test
testAllEmails();
