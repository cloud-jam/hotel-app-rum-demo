#!/bin/bash

# Simple traffic generator using curl
# This script generates basic traffic patterns for testing

echo "=== Simple Traffic Generator for Hotel PMS ==="
echo "Generating traffic to http://localhost:8080"
echo

# Function to generate random trace IDs
generate_trace_id() {
    openssl rand -hex 16
}

generate_span_id() {
    openssl rand -hex 8
}

# Function to make API calls with trace context
make_api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local session_id="session-$(date +%s)-$RANDOM"
    local user_id="user-$RANDOM"
    local trace_id=$(generate_trace_id)
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $method $endpoint"
    
    if [ -z "$data" ]; then
        curl -s -X $method \
            -H "X-Session-Id: $session_id" \
            -H "X-User-Id: $user_id" \
            -H "traceparent: 00-$trace_id-$(generate_span_id)-01" \
            "http://localhost:8080$endpoint" > /dev/null
    else
        curl -s -X $method \
            -H "Content-Type: application/json" \
            -H "X-Session-Id: $session_id" \
            -H "X-User-Id: $user_id" \
            -H "traceparent: 00-$trace_id-$(generate_span_id)-01" \
            -d "$data" \
            "http://localhost:8080$endpoint" > /dev/null
    fi
}

# Dashboard access pattern
dashboard_pattern() {
    echo "--- Dashboard Access Pattern ---"
    for i in {1..5}; do
        make_api_call GET /api/dashboard/stats
        sleep $((RANDOM % 3 + 1))
    done
}

# Room browsing pattern
room_browsing_pattern() {
    echo "--- Room Browsing Pattern ---"
    for i in {1..3}; do
        make_api_call GET /api/rooms
        sleep 1
        make_api_call GET "/api/rooms/available?check_in=2025-09-01&check_out=2025-09-05"
        sleep $((RANDOM % 3 + 2))
    done
}

# Reservation pattern
reservation_pattern() {
    echo "--- Reservation Creation Pattern ---"
    
    # Generate random guest data
    names=("John Smith" "Jane Doe" "Bob Johnson" "Alice Williams" "Charlie Brown")
    name=${names[$RANDOM % ${#names[@]}]}
    email=$(echo $name | tr '[:upper:]' '[:lower:]' | tr ' ' '.')@example.com
    room_id=$((RANDOM % 40 + 1))
    
    # Create reservation
    reservation_data=$(cat <<EOF
{
    "guest_name": "$name",
    "guest_email": "$email",
    "guest_phone": "555-0$(printf '%03d' $((RANDOM % 1000)))-$(printf '%04d' $((RANDOM % 10000)))",
    "room_id": $room_id,
    "check_in": "2025-09-0$((RANDOM % 5 + 1))",
    "check_out": "2025-09-0$((RANDOM % 5 + 6))",
    "total_amount": $((RANDOM % 300 + 200))
}
EOF
)
    
    make_api_call POST /api/reservations "$reservation_data"
    sleep 2
}

# Search pattern
search_pattern() {
    echo "--- Guest Search Pattern ---"
    searches=("John" "Smith" "Alice" "Bob" "Williams")
    for i in {1..3}; do
        query=${searches[$RANDOM % ${#searches[@]}]}
        make_api_call GET "/api/guests/search?q=$query"
        sleep $((RANDOM % 2 + 1))
    done
}

# Error pattern (for testing error handling)
error_pattern() {
    echo "--- Error Simulation Pattern ---"
    # Try to check in non-existent reservation
    make_api_call POST /api/checkin/99999
    sleep 1
    
    # Try to get non-existent room
    make_api_call GET /api/rooms/99999
    sleep 1
}

# Main traffic generation loop
duration=${1:-60}  # Default 60 seconds
end_time=$(($(date +%s) + duration))

echo "Running for $duration seconds..."
echo

while [ $(date +%s) -lt $end_time ]; do
    # Randomly select a pattern
    pattern=$((RANDOM % 5))
    
    case $pattern in
        0) dashboard_pattern ;;
        1) room_browsing_pattern ;;
        2) reservation_pattern ;;
        3) search_pattern ;;
        4) error_pattern ;;
    esac
    
    echo
    sleep $((RANDOM % 5 + 2))
done

echo "=== Traffic generation completed ==="