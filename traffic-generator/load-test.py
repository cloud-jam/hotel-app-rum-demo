#!/usr/bin/env python3

import asyncio
import aiohttp
import random
import json
import time
from datetime import datetime, timedelta
import argparse
import sys

# Configuration
BASE_URL = 'http://localhost:8080'
API_BASE = f'{BASE_URL}/api'

# Sample data
GUEST_NAMES = [
    'Alice Johnson', 'Bob Smith', 'Carol Davis', 'David Wilson',
    'Emma Brown', 'Frank Miller', 'Grace Taylor', 'Henry Anderson',
    'Isabella Thomas', 'Jack Jackson', 'Karen White', 'Liam Harris',
    'Mia Martin', 'Noah Thompson', 'Olivia Garcia', 'Peter Martinez'
]

CITIES = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
          'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'Boston']

class TrafficGenerator:
    def __init__(self, concurrent_users=10, duration_seconds=60):
        self.concurrent_users = concurrent_users
        self.duration_seconds = duration_seconds
        self.stats = {
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'response_times': [],
            'errors': []
        }
        self.start_time = time.time()
    
    def generate_trace_id(self):
        return ''.join(random.choices('0123456789abcdef', k=32))
    
    def generate_span_id(self):
        return ''.join(random.choices('0123456789abcdef', k=16))
    
    def generate_session_id(self):
        return f"session-{int(time.time())}-{''.join(random.choices('abcdefghijklmnopqrstuvwxyz0123456789', k=9))}"
    
    def generate_user_id(self):
        return f"user-{''.join(random.choices('abcdefghijklmnopqrstuvwxyz0123456789', k=9))}"
    
    async def make_request(self, session, method, url, headers=None, json_data=None):
        start_time = time.time()
        self.stats['total_requests'] += 1
        
        try:
            async with session.request(method, url, headers=headers, json=json_data) as response:
                response_time = time.time() - start_time
                self.stats['response_times'].append(response_time)
                
                if response.status < 400:
                    self.stats['successful_requests'] += 1
                else:
                    self.stats['failed_requests'] += 1
                    self.stats['errors'].append({
                        'url': url,
                        'status': response.status,
                        'time': datetime.now().isoformat()
                    })
                
                return await response.json() if response.status == 200 else None
        except Exception as e:
            self.stats['failed_requests'] += 1
            self.stats['errors'].append({
                'url': url,
                'error': str(e),
                'time': datetime.now().isoformat()
            })
            return None
    
    async def browse_dashboard(self, session, session_id, user_id):
        trace_id = self.generate_trace_id()
        headers = {
            'X-Session-Id': session_id,
            'X-User-Id': user_id,
            'traceparent': f'00-{trace_id}-{self.generate_span_id()}-01'
        }
        
        print(f"[{datetime.now().isoformat()}] {user_id}: Viewing dashboard")
        await self.make_request(session, 'GET', f'{API_BASE}/dashboard/stats', headers)
        await asyncio.sleep(random.uniform(0.5, 2))
    
    async def browse_rooms(self, session, session_id, user_id):
        trace_id = self.generate_trace_id()
        headers = {
            'X-Session-Id': session_id,
            'X-User-Id': user_id,
            'traceparent': f'00-{trace_id}-{self.generate_span_id()}-01'
        }
        
        print(f"[{datetime.now().isoformat()}] {user_id}: Browsing rooms")
        await self.make_request(session, 'GET', f'{API_BASE}/rooms', headers)
        
        # Check availability
        check_in = datetime.now() + timedelta(days=random.randint(1, 60))
        check_out = check_in + timedelta(days=random.randint(1, 14))
        
        await self.make_request(
            session, 'GET',
            f'{API_BASE}/rooms/available?check_in={check_in.date()}&check_out={check_out.date()}',
            headers
        )
        await asyncio.sleep(random.uniform(1, 3))
    
    async def create_reservation(self, session, session_id, user_id):
        trace_id = self.generate_trace_id()
        headers = {
            'X-Session-Id': session_id,
            'X-User-Id': user_id,
            'traceparent': f'00-{trace_id}-{self.generate_span_id()}-01',
            'Content-Type': 'application/json'
        }
        
        guest_name = random.choice(GUEST_NAMES)
        check_in = datetime.now() + timedelta(days=random.randint(1, 90))
        check_out = check_in + timedelta(days=random.randint(1, 14))
        nights = (check_out - check_in).days
        room_rate = random.randint(100, 500)
        
        reservation_data = {
            'guest_name': guest_name,
            'guest_email': f"{guest_name.lower().replace(' ', '.')}@example.com",
            'guest_phone': f"555-{random.randint(100, 999)}-{random.randint(1000, 9999)}",
            'room_id': random.randint(1, 40),
            'check_in': str(check_in.date()),
            'check_out': str(check_out.date()),
            'total_amount': nights * room_rate
        }
        
        print(f"[{datetime.now().isoformat()}] {user_id}: Creating reservation for {guest_name}")
        result = await self.make_request(
            session, 'POST', f'{API_BASE}/reservations',
            headers, reservation_data
        )
        
        if result and 'id' in result:
            print(f"[{datetime.now().isoformat()}] {user_id}: Reservation created - {result['confirmation_number']}")
            
            # Sometimes do immediate check-in
            if random.random() < 0.2 and str(check_in.date()) == str(datetime.now().date()):
                await asyncio.sleep(1)
                await self.check_in(session, session_id, user_id, result['id'])
    
    async def check_in(self, session, session_id, user_id, reservation_id):
        headers = {
            'X-Session-Id': session_id,
            'X-User-Id': user_id,
            'traceparent': f'00-{self.generate_trace_id()}-{self.generate_span_id()}-01'
        }
        
        print(f"[{datetime.now().isoformat()}] {user_id}: Checking in reservation {reservation_id}")
        await self.make_request(
            session, 'POST', f'{API_BASE}/checkin/{reservation_id}',
            headers
        )
    
    async def search_guests(self, session, session_id, user_id):
        search_term = random.choice(GUEST_NAMES).split()[0]
        headers = {
            'X-Session-Id': session_id,
            'X-User-Id': user_id,
            'traceparent': f'00-{self.generate_trace_id()}-{self.generate_span_id()}-01'
        }
        
        print(f"[{datetime.now().isoformat()}] {user_id}: Searching for guests with '{search_term}'")
        await self.make_request(
            session, 'GET', f'{API_BASE}/guests/search?q={search_term}',
            headers
        )
        await asyncio.sleep(random.uniform(0.5, 1.5))
    
    async def simulate_user_session(self, session):
        session_id = self.generate_session_id()
        user_id = self.generate_user_id()
        
        print(f"\n[{datetime.now().isoformat()}] Starting session {session_id}")
        
        # Define user journey scenarios with weights
        scenarios = [
            (0.3, [self.browse_dashboard, self.browse_rooms]),  # Just browsing
            (0.2, [self.browse_dashboard, self.search_guests, self.browse_rooms]),  # Search and browse
            (0.3, [self.browse_dashboard, self.browse_rooms, self.create_reservation]),  # Make reservation
            (0.1, [self.create_reservation]),  # Quick reservation
            (0.1, [self.browse_dashboard, self.browse_rooms, self.search_guests, self.create_reservation])  # Full flow
        ]
        
        # Select scenario based on weights
        rand = random.random()
        cumulative = 0
        selected_scenario = None
        
        for weight, scenario in scenarios:
            cumulative += weight
            if rand <= cumulative:
                selected_scenario = scenario
                break
        
        # Execute scenario
        for action in selected_scenario:
            if time.time() - self.start_time > self.duration_seconds:
                break
            await action(session, session_id, user_id)
        
        print(f"[{datetime.now().isoformat()}] Session {session_id} completed")
    
    async def simulate_errors(self, session):
        # 404 error
        await self.make_request(
            session, 'POST', f'{API_BASE}/checkin/99999',
            {'X-Session-Id': 'error-test', 'X-User-Id': 'error-user'}
        )
        
        # Invalid data
        await self.make_request(
            session, 'POST', f'{API_BASE}/reservations',
            {'Content-Type': 'application/json'},
            {'invalid': 'data'}
        )
    
    async def run_user(self, session):
        while time.time() - self.start_time < self.duration_seconds:
            await self.simulate_user_session(session)
            await asyncio.sleep(random.uniform(1, 5))
    
    async def run(self):
        print(f"=== Hotel PMS Load Test ===")
        print(f"Concurrent users: {self.concurrent_users}")
        print(f"Duration: {self.duration_seconds} seconds")
        print(f"Starting load test...\n")
        
        async with aiohttp.ClientSession() as session:
            # Create user tasks
            tasks = []
            for i in range(self.concurrent_users):
                tasks.append(asyncio.create_task(self.run_user(session)))
            
            # Add periodic error simulation
            async def error_loop():
                while time.time() - self.start_time < self.duration_seconds:
                    await self.simulate_errors(session)
                    await asyncio.sleep(30)
            
            tasks.append(asyncio.create_task(error_loop()))
            
            # Wait for all tasks to complete
            await asyncio.gather(*tasks, return_exceptions=True)
        
        self.print_stats()
    
    def print_stats(self):
        print("\n=== Load Test Results ===")
        print(f"Total requests: {self.stats['total_requests']}")
        print(f"Successful requests: {self.stats['successful_requests']}")
        print(f"Failed requests: {self.stats['failed_requests']}")
        
        if self.stats['response_times']:
            avg_response_time = sum(self.stats['response_times']) / len(self.stats['response_times'])
            min_response_time = min(self.stats['response_times'])
            max_response_time = max(self.stats['response_times'])
            
            print(f"\nResponse times:")
            print(f"  Average: {avg_response_time:.3f}s")
            print(f"  Min: {min_response_time:.3f}s")
            print(f"  Max: {max_response_time:.3f}s")
        
        if self.stats['errors']:
            print(f"\nErrors encountered: {len(self.stats['errors'])}")
            for error in self.stats['errors'][:5]:  # Show first 5 errors
                print(f"  - {error}")

def main():
    parser = argparse.ArgumentParser(description='Hotel PMS Load Testing Tool')
    parser.add_argument('--users', type=int, default=10, help='Number of concurrent users')
    parser.add_argument('--duration', type=int, default=60, help='Test duration in seconds')
    
    args = parser.parse_args()
    
    generator = TrafficGenerator(
        concurrent_users=args.users,
        duration_seconds=args.duration
    )
    
    try:
        asyncio.run(generator.run())
    except KeyboardInterrupt:
        print("\n\nLoad test interrupted by user")
        generator.print_stats()

if __name__ == "__main__":
    main()