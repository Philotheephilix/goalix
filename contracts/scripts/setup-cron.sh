#!/bin/bash

# Setup script for daily player data update cron job
# This script will add a cron job that runs every 24 hours

echo "🕐 Setting up daily player data update cron job..."

# Get the current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Create the cron job command
CRON_COMMAND="0 2 * * * cd $PROJECT_DIR && npx hardhat run scripts/update-player-data-cron.ts --network xlayer >> logs/cron-update.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "update-player-data-cron.ts"; then
    echo "⚠️  Cron job already exists. Removing old entry..."
    crontab -l 2>/dev/null | grep -v "update-player-data-cron.ts" | crontab -
fi

# Add the new cron job
(crontab -l 2>/dev/null; echo "$CRON_COMMAND") | crontab -

# Create logs directory if it doesn't exist
mkdir -p "$PROJECT_DIR/logs"

echo "✅ Cron job added successfully!"
echo "📅 Job will run daily at 2:00 AM"
echo "📁 Logs will be saved to: $PROJECT_DIR/logs/cron-update.log"
echo ""
echo "To view current cron jobs:"
echo "  crontab -l"
echo ""
echo "To remove the cron job:"
echo "  crontab -e"
echo "  (then delete the line with update-player-data-cron.ts)"
echo ""
echo "To test the script manually:"
echo "  cd $PROJECT_DIR"
echo "  npx hardhat run scripts/update-player-data-cron.ts --network xlayer" 