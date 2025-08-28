#!/usr/bin/env node

const http = require('http');
const https = require('https');

// Configuration
const BASE_URL = 'http://localhost:8080';
const API_BASE = `${BASE_URL}/api`;

// Sample data
const GUEST_NAMES = [
    'John Smith', 'Jane Doe', 'Michael Johnson', 'Emily Williams', 'David Brown',
    'Sarah Davis', 'Robert Miller', 'Lisa Wilson', 'James Moore', 'Mary Taylor',
    'William Anderson', 'Jennifer Thomas', 'Richard Jackson', 'Patricia White',
    'Charles Harris', 'Linda Martin', 'Joseph Thompson', 'Barbara Garcia'
];

const ROOM_TYPES = ['standard', 'deluxe', 'suite', 'presidential'];

// Utility functions
function randomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function generateSessionId() {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateUserId() {
    return `user-${Math.random().toString(36).substr(2, 9)}`;
}

function generateTraceId() {
    return Array.from({length: 32}, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function generateSpanId() {
    return Array.from({length: 16}, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

// HTTP request helper
function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const result = body ? JSON.parse(body) : {};
                    resolve({ status: res.statusCode, data: result });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

// Traffic scenarios
async function browseDashboard(sessionId, userId) {
    console.log(`[${new Date().toISOString()}] User ${userId} viewing dashboard`);
    
    const traceId = generateTraceId();
    const headers = {
        'X-Session-Id': sessionId,
        'X-User-Id': userId,
        'traceparent': `00-${traceId}-${generateSpanId()}-01`
    };

    // Load dashboard
    await makeRequest({
        hostname: 'localhost',
        port: 8080,
        path: '/api/dashboard/stats',
        method: 'GET',
        headers: headers
    });

    // Random delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
}

async function browseRooms(sessionId, userId) {
    console.log(`[${new Date().toISOString()}] User ${userId} browsing rooms`);
    
    const traceId = generateTraceId();
    const headers = {
        'X-Session-Id': sessionId,
        'X-User-Id': userId,
        'traceparent': `00-${traceId}-${generateSpanId()}-01`
    };

    // Get all rooms
    await makeRequest({
        hostname: 'localhost',
        port: 8080,
        path: '/api/rooms',
        method: 'GET',
        headers: headers
    });

    // Check available rooms for dates
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + Math.floor(Math.random() * 30));
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + Math.floor(Math.random() * 7) + 1);

    await makeRequest({
        hostname: 'localhost',
        port: 8080,
        path: `/api/rooms/available?check_in=${formatDate(checkIn)}&check_out=${formatDate(checkOut)}`,
        method: 'GET',
        headers: headers
    });

    await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 2000));
}

async function createReservation(sessionId, userId) {
    console.log(`[${new Date().toISOString()}] User ${userId} creating reservation`);
    
    const traceId = generateTraceId();
    const headers = {
        'Content-Type': 'application/json',
        'X-Session-Id': sessionId,
        'X-User-Id': userId,
        'traceparent': `00-${traceId}-${generateSpanId()}-01`
    };

    const guestName = randomElement(GUEST_NAMES);
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + Math.floor(Math.random() * 60) + 1);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + Math.floor(Math.random() * 14) + 1);

    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    const roomRate = Math.floor(Math.random() * 200) + 100;
    const totalAmount = nights * roomRate;

    const reservationData = {
        guest_name: guestName,
        guest_email: `${guestName.toLowerCase().replace(' ', '.')}@example.com`,
        guest_phone: `555-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        room_id: Math.floor(Math.random() * 40) + 1,
        check_in: formatDate(checkIn),
        check_out: formatDate(checkOut),
        total_amount: totalAmount
    };

    try {
        const response = await makeRequest({
            hostname: 'localhost',
            port: 8080,
            path: '/api/reservations',
            method: 'POST',
            headers: headers
        }, reservationData);

        if (response.status === 200) {
            console.log(`[${new Date().toISOString()}] Reservation created: ${response.data.confirmation_number}`);
            
            // Sometimes do immediate check-in
            if (Math.random() < 0.3 && formatDate(checkIn) === formatDate(new Date())) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                await checkIn(sessionId, userId, response.data.id);
            }
        }
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Reservation failed:`, error.message);
    }
}

async function checkIn(sessionId, userId, reservationId) {
    console.log(`[${new Date().toISOString()}] User ${userId} checking in reservation ${reservationId}`);
    
    const headers = {
        'X-Session-Id': sessionId,
        'X-User-Id': userId,
        'traceparent': `00-${generateTraceId()}-${generateSpanId()}-01`
    };

    await makeRequest({
        hostname: 'localhost',
        port: 8080,
        path: `/api/checkin/${reservationId}`,
        method: 'POST',
        headers: headers
    });
}

async function searchGuests(sessionId, userId) {
    console.log(`[${new Date().toISOString()}] User ${userId} searching guests`);
    
    const searchTerm = randomElement(GUEST_NAMES).split(' ')[0];
    const headers = {
        'X-Session-Id': sessionId,
        'X-User-Id': userId,
        'traceparent': `00-${generateTraceId()}-${generateSpanId()}-01`
    };

    await makeRequest({
        hostname: 'localhost',
        port: 8080,
        path: `/api/guests/search?q=${searchTerm}`,
        method: 'GET',
        headers: headers
    });

    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));
}

// User session simulation
async function simulateUserSession() {
    const sessionId = generateSessionId();
    const userId = generateUserId();
    
    console.log(`\n[${new Date().toISOString()}] Starting session ${sessionId} for user ${userId}`);

    // User journey scenarios
    const scenarios = [
        // Scenario 1: Just browsing
        async () => {
            await browseDashboard(sessionId, userId);
            await browseRooms(sessionId, userId);
        },
        
        // Scenario 2: Search and browse
        async () => {
            await browseDashboard(sessionId, userId);
            await searchGuests(sessionId, userId);
            await browseRooms(sessionId, userId);
        },
        
        // Scenario 3: Make a reservation
        async () => {
            await browseDashboard(sessionId, userId);
            await browseRooms(sessionId, userId);
            await createReservation(sessionId, userId);
        },
        
        // Scenario 4: Quick reservation
        async () => {
            await createReservation(sessionId, userId);
        },
        
        // Scenario 5: Extended browsing
        async () => {
            await browseDashboard(sessionId, userId);
            await browseRooms(sessionId, userId);
            await searchGuests(sessionId, userId);
            await browseRooms(sessionId, userId);
            await createReservation(sessionId, userId);
        }
    ];

    const scenario = randomElement(scenarios);
    await scenario();
    
    console.log(`[${new Date().toISOString()}] Session ${sessionId} completed\n`);
}

// Error scenario
async function simulateErrors() {
    const sessionId = generateSessionId();
    const userId = 'error-test-user';
    
    console.log(`[${new Date().toISOString()}] Simulating error scenarios`);

    // 404 error
    await makeRequest({
        hostname: 'localhost',
        port: 8080,
        path: '/api/checkin/99999',
        method: 'POST',
        headers: {
            'X-Session-Id': sessionId,
            'X-User-Id': userId
        }
    });

    // Invalid reservation data
    await makeRequest({
        hostname: 'localhost',
        port: 8080,
        path: '/api/reservations',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Session-Id': sessionId,
            'X-User-Id': userId
        }
    }, { invalid: 'data' });
}

// Main traffic generator
async function generateTraffic(options = {}) {
    const {
        duration = 60000, // Run for 1 minute by default
        sessionsPerMinute = 10,
        includeErrors = true
    } = options;

    console.log('=== Hotel PMS Traffic Generator ===');
    console.log(`Duration: ${duration / 1000} seconds`);
    console.log(`Sessions per minute: ${sessionsPerMinute}`);
    console.log(`Include errors: ${includeErrors}`);
    console.log('Starting traffic generation...\n');

    const startTime = Date.now();
    const sessionInterval = 60000 / sessionsPerMinute;

    const sessionTimer = setInterval(() => {
        if (Date.now() - startTime > duration) {
            clearInterval(sessionTimer);
            console.log('\n=== Traffic generation completed ===');
            process.exit(0);
        }

        simulateUserSession();
    }, sessionInterval);

    // Simulate some errors periodically
    if (includeErrors) {
        const errorTimer = setInterval(() => {
            if (Date.now() - startTime > duration) {
                clearInterval(errorTimer);
                return;
            }
            simulateErrors();
        }, 30000); // Every 30 seconds
    }

    // Initial sessions
    for (let i = 0; i < 3; i++) {
        setTimeout(() => simulateUserSession(), i * 1000);
    }
}

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {};

    for (let i = 0; i < args.length; i += 2) {
        switch (args[i]) {
            case '--duration':
                options.duration = parseInt(args[i + 1]) * 1000;
                break;
            case '--rate':
                options.sessionsPerMinute = parseInt(args[i + 1]);
                break;
            case '--no-errors':
                options.includeErrors = false;
                break;
        }
    }

    generateTraffic(options);
}

module.exports = { generateTraffic, simulateUserSession };