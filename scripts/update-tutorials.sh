#!/bin/bash

echo "Updating Tutorial System"
echo "========================"

cd server

# Step 1: Run tutorial migration to ensure latest schema
echo ""
echo "Step 1: Updating database schema..."
npm run migrate-tutorials

if [ $? -ne 0 ]; then
    echo "ERROR: Migration failed!"
    exit 1
fi

# Step 2: Reload tutorials with latest data
echo ""
echo "Step 2: Loading tutorials..."
npm run load-tutorials

if [ $? -ne 0 ]; then
    echo "ERROR: Tutorial loading failed!"
    exit 1
fi

# Step 3: Verify
echo ""
echo "Step 3: Verifying..."
TUTORIAL_COUNT=$(psql -U $USER -d cytutor -t -c "SELECT COUNT(*) FROM tutorials;" 2>/dev/null | xargs)

if [ -z "$TUTORIAL_COUNT" ] || [ "$TUTORIAL_COUNT" -eq 0 ]; then
    echo "WARNING: No tutorials found in database"
else
    echo "Successfully loaded $TUTORIAL_COUNT tutorials"
fi

cd ..

echo ""
echo "Tutorial system updated!"
echo ""
echo "Tutorial breakdown:"
psql -U $USER -d cytutor -c "SELECT category, level, COUNT(*) as count FROM tutorials GROUP BY category, level ORDER BY category, level;" 2>/dev/null

echo ""
echo "Tutorial statistics:"
psql -U $USER -d cytutor -c "SELECT 
  COUNT(*) as total_tutorials,
  AVG(estimated_time) as avg_duration_minutes,
  COUNT(CASE WHEN level = 'beginner' THEN 1 END) as beginner_count,
  COUNT(CASE WHEN level = 'intermediate' THEN 1 END) as intermediate_count,
  COUNT(CASE WHEN level = 'advanced' THEN 1 END) as advanced_count
FROM tutorials;" 2>/dev/null

echo ""
echo "Restart your server to apply changes"