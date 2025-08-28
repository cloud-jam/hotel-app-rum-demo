#!/bin/sh
set -e

# Ensure data directory exists
mkdir -p /app/data

# Initialize database if it doesn't exist
if [ ! -f /app/data/hotel_pms.db ]; then
    echo "Initializing database..."
    ruby db/seeds.rb
else
    echo "Database already exists, skipping initialization"
fi

# Execute the main command
exec "$@"