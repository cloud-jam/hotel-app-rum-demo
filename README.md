# Hotel PMS Demo Application

A demonstration hotel property management system built with AngularJS frontend and Ruby (Sinatra) backend, designed to showcase Elastic observability capabilities including APM, RUM, and centralized logging. Fully instrumented with OpenTelemetry for comprehensive distributed tracing.

## Features

- **Single Page Application** with AngularJS routing
- **RESTful API** with Ruby/Sinatra backend
- **SQLite database** with rooms, guests, and reservations
- **Docker containerization** for easy deployment
- **Elastic observability ready** with structured logging and APM hooks
- **OpenTelemetry instrumentation** for both frontend and backend
- **Traffic generation tools** for realistic load simulation
- **Performance variations** and error simulation for testing monitoring tools

## Architecture

- **Frontend**: AngularJS SPA served by Nginx
- **Backend**: Ruby Sinatra API with ActiveRecord ORM
- **Database**: SQLite (persisted in Docker volume)
- **Monitoring**: Elastic Agent (Fleet-managed) for log collection
- **Container Runtime**: Docker with Docker Compose orchestration

## Project Structure

```
hotel-pms-demo/
├── docker-compose.yml           # Container orchestration
├── .env                         # Environment variables (create from .env.example)
├── .env.example                 # Template for environment variables
├── backend/
│   ├── Dockerfile               # Backend container definition
│   ├── Gemfile                  # Ruby dependencies
│   ├── Gemfile.lock             # Locked dependency versions
│   ├── config.ru                # Rack configuration
│   ├── app.rb                   # Main application with API routes
│   ├── db/
│   │   └── seeds.rb             # Database initialization script
│   └── logs/                    # Application logs (created at runtime)
├── frontend/
│   ├── Dockerfile               # Frontend container definition
│   ├── nginx.conf               # Nginx web server configuration
│   ├── index.html               # Main HTML with AngularJS app bootstrap
│   ├── app.js                   # AngularJS app configuration and routing
│   ├── controllers/
│   │   ├── dashboard.controller.js
│   │   ├── reservations.controller.js
│   │   ├── checkin.controller.js
│   │   └── rooms.controller.js
│   ├── services/
│   │   └── api.service.js       # API communication service
│   ├── views/
│   │   ├── dashboard.html
│   │   ├── reservations.html
│   │   ├── checkin.html
│   │   └── rooms.html
│   └── css/
│       └── styles.css           # Custom styles
└── elastic-agent/               # Optional: for standalone agent mode
    └── elastic-agent.yml        # Standalone configuration (if not using Fleet)
```

## Prerequisites

- **Docker Desktop** installed and running
- **Docker Compose** v2.0+ (included with Docker Desktop)
- **Elastic Cloud account** with:
  - APM server configured
  - Fleet server enabled (for agent management)
  - Kibana access
- **Git** (optional, for version control)

## Quick Start

### 1. Clone or Create Project Structure

```bash
# If using git
git clone <repository-url> hotel-pms-demo
cd hotel-pms-demo

# Or create directory manually
mkdir hotel-pms-demo
cd hotel-pms-demo
```

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your Elastic Cloud credentials
# You'll need:
# - ELASTIC_APM_SERVER_URL (from APM setup)
# - ELASTIC_APM_SECRET_TOKEN (from APM setup)
# - FLEET_URL (from Fleet → Add Agent)
# - FLEET_ENROLLMENT_TOKEN (from Fleet → Add Agent)
```

### 3. Build and Launch

```bash
# Build containers and start services
docker-compose up --build -d

# Or run in foreground to see logs
docker-compose up --build
```

### 4. Verify Services

```bash
# Check all containers are running
docker-compose ps

# Expected output should show 3 healthy containers:
# - hotel-pms-demo-backend-1
# - hotel-pms-demo-frontend-1  
# - elastic-agent
```

### 5. Access the Application

- **Frontend Application**: http://localhost:8080
- **Backend API Health Check**: http://localhost:4567/api/dashboard/stats

## Elastic Agent Setup (Fleet-Managed)

### Step 1: Get Fleet Credentials

1. Log into **Elastic Cloud Kibana**
2. Navigate to **Fleet** (Menu → Management → Fleet)
3. Click **Add agent**
4. Select or create an agent policy (e.g., "Docker Monitoring")
5. Copy the **Fleet Server URL** and **Enrollment Token**

### Step 2: Add Credentials to .env

```bash
FLEET_URL=https://xxxxx.fleet.us-west2.gcp.elastic-cloud.com:443
FLEET_ENROLLMENT_TOKEN=AAEAAWVsYXN0aWM...your-token-here
```

### Step 3: Start Agent Container

The agent will auto-enroll when you run `docker-compose up`. Verify enrollment:

```bash
# Check agent logs
docker-compose logs elastic-agent

# Look for: "Successfully enrolled agent"
```

### Step 4: Configure Integrations in Fleet

1. In Kibana → **Fleet** → **Agent policies**
2. Click on your policy
3. **Add integrations**:
   - **Docker**: For container logs and metrics
   - **Custom Logs**: For Ruby application logs
     - Path: `/logs/application.log*`
     - Dataset: `ruby.application`
     - Enable: Parse as JSON

### Step 5: Verify in Kibana

1. Navigate to **Discover**
2. Select data view: `logs-*`
3. Filter by `service.name: hotel-pms-backend`

## Generating Synthetic Traffic

The application includes multiple traffic generation tools to simulate realistic user behavior:

### Quick Start - Generate Traffic

```bash
# Run the interactive traffic generator
./generate-traffic.sh

# Options available:
# 1. Quick test (1 minute of light traffic)
# 2. Normal traffic simulation (5 minutes)
# 3. Load test (high traffic for 2 minutes)
# 4. Continuous traffic (runs until stopped)
# 5. Custom configuration
```

### Traffic Generation Tools

1. **Node.js Traffic Generator** (`traffic-generator/generate-traffic.js`)
   - Simulates complete user journeys
   - Configurable session rates
   - Includes error scenarios

2. **Python Load Tester** (`traffic-generator/load-test.py`)
   - Concurrent user simulation
   - Performance metrics collection
   - Stress testing capabilities

3. **Simple Bash Script** (`traffic-generator/simple-traffic.sh`)
   - No dependencies required
   - Basic traffic patterns
   - Easy to customize

For detailed information, see `traffic-generator/README.md`.

## Application Features for Testing

### API Endpoints

- `GET /api/dashboard/stats` - Dashboard metrics with random latency
- `GET /api/rooms` - List all rooms
- `GET /api/reservations` - List reservations (slow endpoint)
- `POST /api/checkin/:id` - Check in a guest
- `POST /api/checkout/:id` - Check out (payment processing delay)
- `GET /api/simulate/error` - Trigger random errors for testing

### Frontend Routes

- `#/dashboard` - Hotel statistics and metrics
- `#/reservations` - Manage bookings
- `#/checkin` - Process arrivals/departures
- `#/rooms` - Room management

### Built-in Test Scenarios

1. **Performance variations**: Some endpoints have intentional random delays (100-500ms)
2. **Error simulation**: Use the "Test Error Simulation" button on dashboard
3. **Heavy operations**: Check-out process includes payment delay (0.5-1.5s)
4. **Auto-refresh**: Dashboard updates every 30 seconds

## Operations Guide

### Container Management

```bash
# View logs
docker-compose logs -f          # All services
docker-compose logs -f backend  # Backend only
docker-compose logs -f elastic-agent  # Agent only

# Restart services
docker-compose restart backend   # Restart backend only
docker-compose restart          # Restart all

# Stop services
docker-compose stop             # Stop containers
docker-compose down            # Stop and remove containers
docker-compose down -v         # Also remove volumes (full reset)
```

### Database Operations

```bash
# Reset database with fresh seed data
docker-compose exec backend ruby db/seeds.rb

# Access database directly
docker-compose exec backend sqlite3 /app/data/hotel_pms.db

# Common SQLite commands:
# .tables                    - List all tables
# SELECT * FROM rooms;       - Query data
# .exit                      - Exit SQLite
```

### Debugging

```bash
# Access backend shell
docker-compose exec backend bash

# Access frontend shell
docker-compose exec frontend sh

# Check agent status
docker exec elastic-agent elastic-agent status

# View application logs
docker-compose exec backend tail -f /app/logs/application.log

# Test API directly
curl http://localhost:4567/api/dashboard/stats | jq
```

## Adding Elastic RUM (Frontend Monitoring)

To add Real User Monitoring to the frontend:

1. Edit `frontend/index.html`
2. Add Elastic RUM script before closing `</head>`:

```html
<script src="https://unpkg.com/@elastic/apm-rum@5/dist/bundles/elastic-apm-rum.umd.min.js"></script>
<script>
  elasticApm.init({
    serviceName: 'hotel-pms-frontend',
    serverUrl: 'YOUR_APM_SERVER_URL',
    secretToken: 'YOUR_APM_SECRET_TOKEN',
    environment: 'development'
  });
</script>
```

3. No rebuild needed - changes take effect on browser refresh

## Troubleshooting

### Containers won't start

```bash
# Check for port conflicts
lsof -i :8080  # Frontend port
lsof -i :4567  # Backend port

# Check Docker daemon
docker version
docker-compose version
```

### Elastic Agent not enrolling

```bash
# Check enrollment token is valid
docker-compose logs elastic-agent | grep -i error

# Verify Fleet URL is accessible
curl -I $FLEET_URL

# Get fresh enrollment token from Kibana Fleet UI
```

### No logs in Kibana

```bash
# Verify agent is running and enrolled
docker exec elastic-agent elastic-agent status

# Check log files exist
docker exec elastic-agent ls -la /logs/

# Restart agent to pickup configuration changes
docker-compose restart elastic-agent
```

### Application errors

```bash
# Check backend logs
docker-compose logs backend

# Reinitialize database
docker-compose exec backend ruby db/seeds.rb

# Full reset
docker-compose down -v
docker-compose up --build
```

## Performance Considerations

- **Database**: SQLite is used for simplicity; not suitable for production
- **Random delays**: Intentionally added to simulate real-world latency
- **Error rate**: ~5% of reservation creations will fail (by design)
- **CDN resources**: Bootstrap and Font Awesome loaded from CDN

## Security Notes

⚠️ **This is a demo application** with intentionally relaxed security:
- CORS allows all origins (`*`)
- No authentication or authorization
- SQLite database with no encryption
- Secrets in `.env` file (use proper secret management in production)

**Never use this configuration in production!**

## License

This is a demonstration application for testing observability tools.

## Support

For issues related to:
- **Application code**: Check the error logs in Docker
- **Elastic Agent**: Consult Elastic documentation
- **Docker**: Verify Docker Desktop is running properly