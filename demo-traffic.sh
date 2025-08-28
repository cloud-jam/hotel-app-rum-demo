#!/bin/bash

echo "=== Hotel PMS Demo - Quick Traffic Test ==="
echo
echo "This will generate some test traffic to demonstrate the observability features."
echo "You should see traces appearing in Elastic APM within a few seconds."
echo
echo "Press Enter to start..."
read

echo "Generating traffic for 60 seconds..."
echo

# Run simple traffic in background
cd traffic-generator
./simple-traffic.sh 60 &
TRAFFIC_PID=$!

echo "Traffic is being generated. You can now:"
echo "1. Open Elastic APM to see traces"
echo "2. View backend logs: docker logs -f hotel-pms-demo-backend-1"
echo "3. Access the app: http://localhost:8080"
echo
echo "Waiting for traffic generation to complete..."

wait $TRAFFIC_PID

echo
echo "Demo completed! Check your Elastic APM for:"
echo "- Service: hotel-pms-frontend (browser traces)"
echo "- Service: hotel-pms-backend (API traces)"
echo "- Distributed traces showing full request flow"