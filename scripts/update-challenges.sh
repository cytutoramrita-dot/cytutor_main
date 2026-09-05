#!/bin/bash

echo "🔄 Updating Challenge System"
echo "=============================="

cd server

# Step 1: Run migration to add new columns
echo ""
echo "📊 Step 1: Adding new database columns..."
npx tsx src/db/migrate-challenge-types.ts

if [ $? -ne 0 ]; then
    echo "❌ Migration failed!"
    exit 1
fi

# Step 2: Clear old challenges
echo ""
echo "🗑️  Step 2: Clearing old challenges..."
psql -U $USER -d cytutor -c "DELETE FROM user_challenges;" 2>/dev/null
psql -U $USER -d cytutor -c "DELETE FROM challenges;" 2>/dev/null

# Step 3: Reload challenges with new structure
echo ""
echo "📚 Step 3: Loading new challenges..."
npm run load-challenges

if [ $? -ne 0 ]; then
    echo "❌ Challenge loading failed!"
    exit 1
fi

# Step 4: Verify
echo ""
echo "✅ Step 4: Verifying..."
CHALLENGE_COUNT=$(psql -U $USER -d cytutor -t -c "SELECT COUNT(*) FROM challenges;" 2>/dev/null | xargs)

if [ -z "$CHALLENGE_COUNT" ] || [ "$CHALLENGE_COUNT" -eq 0 ]; then
    echo "⚠️  Warning: No challenges found in database"
else
    echo "✅ Successfully loaded $CHALLENGE_COUNT challenges"
fi

cd ..

echo ""
echo "🎉 Challenge system updated!"
echo ""
echo "📋 Challenge types:"
psql -U $USER -d cytutor -c "SELECT challenge_type, COUNT(*) as count FROM challenges GROUP BY challenge_type;" 2>/dev/null

echo ""
echo "🚀 Restart your server to apply changes"
