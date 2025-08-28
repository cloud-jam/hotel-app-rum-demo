# Traffic Generator for Hotel PMS Demo

This directory contains multiple traffic generation tools to simulate realistic user behavior and load test the Hotel PMS application.

## Available Tools

### 1. Node.js Traffic Generator (`generate-traffic.js`)

A comprehensive traffic generator that simulates realistic user sessions with proper trace context propagation.

**Features:**
- Simulates complete user journeys (browsing, searching, booking)
- Generates proper OpenTelemetry trace headers
- Includes error scenarios
- Configurable session rate

**Usage:**
```bash
# Install Node.js if not already installed
# Run with default settings (10 sessions/min for 60 seconds)
node generate-traffic.js

# Custom duration (120 seconds)
node generate-traffic.js --duration 120

# Higher traffic rate (20 sessions per minute)
node generate-traffic.js --rate 20

# Without error simulation
node generate-traffic.js --no-errors
```

### 2. Python Load Tester (`load-test.py`)

An async Python-based load testing tool for stress testing and performance measurement.

**Features:**
- Concurrent user simulation
- Performance metrics collection
- Response time analysis
- Error tracking

**Usage:**
```bash
# Install dependencies
pip3 install aiohttp

# Run with default settings (10 concurrent users for 60 seconds)
python3 load-test.py

# Custom settings
python3 load-test.py --users 50 --duration 300
```

### 3. Simple Bash Traffic Generator (`simple-traffic.sh`)

A lightweight bash script using curl for basic traffic generation.

**Features:**
- No dependencies except curl and openssl
- Simple traffic patterns
- Easy to modify
- Good for quick testing

**Usage:**
```bash
# Make executable
chmod +x simple-traffic.sh

# Run for 60 seconds (default)
./simple-traffic.sh

# Run for 5 minutes
./simple-traffic.sh 300
```

## Traffic Patterns Simulated

1. **Dashboard Browsing**
   - View dashboard statistics
   - Typical monitoring behavior

2. **Room Management**
   - List all rooms
   - Check room availability
   - Update room status

3. **Reservation Flow**
   - Search for available rooms
   - Create new reservations
   - Guest registration
   - Confirmation

4. **Check-in/Check-out**
   - Process guest check-ins
   - Handle check-outs
   - Payment simulation

5. **Guest Search**
   - Search by name
   - View guest history

6. **Error Scenarios**
   - 404 errors (non-existent resources)
   - Invalid data submissions
   - Timeout simulations

## Monitoring the Traffic

While running traffic generators, you can monitor:

1. **Application Logs**
   ```bash
   docker logs -f hotel-pms-demo-backend-1
   ```

2. **Frontend Activity**
   ```bash
   docker logs -f hotel-pms-demo-frontend-1
   ```

3. **Elastic APM**
   - View real-time transactions
   - Monitor error rates
   - Analyze performance metrics

## Best Practices

1. **Start Small**: Begin with low traffic rates and increase gradually
2. **Monitor Resources**: Watch CPU and memory usage during load tests
3. **Vary Patterns**: Use different generators to simulate diverse traffic
4. **Check Errors**: Monitor error logs to ensure the application handles load gracefully

## Example Test Scenarios

### Scenario 1: Normal Daily Traffic
```bash
# Simulate typical daily usage
node generate-traffic.js --rate 5 --duration 3600
```

### Scenario 2: Peak Hour Load
```bash
# Simulate busy check-in time
python3 load-test.py --users 50 --duration 1800
```

### Scenario 3: Continuous Monitoring
```bash
# Long-running traffic for monitoring
./simple-traffic.sh 86400  # 24 hours
```

## Integration with Observability

All traffic generators include:
- Session ID tracking
- User ID generation
- W3C Trace Context headers
- Realistic user journeys

This ensures that generated traffic appears in:
- Elastic APM traces
- Distributed tracing views
- User session analysis
- Error tracking systems