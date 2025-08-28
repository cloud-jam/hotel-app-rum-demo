#!/bin/bash

# Main traffic generation script
echo "=== Hotel PMS Traffic Generator ==="
echo
echo "Choose a traffic generation method:"
echo "1) Quick test (1 minute of light traffic)"
echo "2) Normal traffic simulation (5 minutes)"
echo "3) Load test (high traffic for 2 minutes)"
echo "4) Continuous traffic (runs until stopped)"
echo "5) Custom configuration"
echo

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo "Starting quick test..."
        cd traffic-generator
        if command -v node &> /dev/null; then
            node generate-traffic.js --duration 60 --rate 5
        else
            ./simple-traffic.sh 60
        fi
        ;;
    
    2)
        echo "Starting normal traffic simulation..."
        cd traffic-generator
        if command -v node &> /dev/null; then
            node generate-traffic.js --duration 300 --rate 10
        else
            ./simple-traffic.sh 300
        fi
        ;;
    
    3)
        echo "Starting load test..."
        cd traffic-generator
        if command -v python3 &> /dev/null; then
            python3 load-test.py --users 25 --duration 120
        else
            echo "Python 3 not found. Using bash script instead..."
            # Run multiple instances of simple traffic in background
            for i in {1..5}; do
                ./simple-traffic.sh 120 &
            done
            wait
        fi
        ;;
    
    4)
        echo "Starting continuous traffic (press Ctrl+C to stop)..."
        cd traffic-generator
        if command -v node &> /dev/null; then
            node generate-traffic.js --duration 86400 --rate 8
        else
            ./simple-traffic.sh 86400
        fi
        ;;
    
    5)
        echo "Custom configuration"
        echo "Select tool:"
        echo "1) Node.js generator"
        echo "2) Python load tester"
        echo "3) Bash script"
        read -p "Choice: " tool
        
        case $tool in
            1)
                read -p "Duration in seconds: " duration
                read -p "Sessions per minute: " rate
                read -p "Include errors? (y/n): " errors
                
                cd traffic-generator
                if [ "$errors" = "n" ]; then
                    node generate-traffic.js --duration $duration --rate $rate --no-errors
                else
                    node generate-traffic.js --duration $duration --rate $rate
                fi
                ;;
            
            2)
                read -p "Concurrent users: " users
                read -p "Duration in seconds: " duration
                
                cd traffic-generator
                python3 load-test.py --users $users --duration $duration
                ;;
            
            3)
                read -p "Duration in seconds: " duration
                
                cd traffic-generator
                ./simple-traffic.sh $duration
                ;;
        esac
        ;;
    
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

echo
echo "Traffic generation completed!"
echo
echo "View results in:"
echo "- Elastic APM: Check your Elastic Cloud deployment"
echo "- Backend logs: docker logs hotel-pms-demo-backend-1"
echo "- Frontend activity: Check browser developer tools"