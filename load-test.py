#!/usr/bin/env python3

import asyncio
import aiohttp
import random
import time
import json
import argparse
from datetime import datetime, timedelta
from collections import defaultdict

class LoadTester:
    def __init__(self, base_url, num_users, duration, ramp_up):
        self.base_url = base_url
        self.num_users = num_users
        self.duration = duration
        self.ramp_up = ramp_up
        self.stats = defaultdict(lambda: {'count': 0, 'errors': 0, 'total_time': 0})
        self.running = True
        self.start_time = time.time()
        
    async def make_request(self, session, method, path, description, **kwargs):
        """Make an HTTP request and record statistics"""
        url = f"{self.base_url}{path}"
        start = time.time()
        
        try:
            async with session.request(method, url, **kwargs) as response:
                duration = (time.time() - start) * 1000  # Convert to ms
                
                self.stats[description]['count'] += 1
                self.stats[description]['total_time'] += duration
                
                if response.status >= 400:
                    self.stats[description]['errors'] += 1
                    
                return response.status, await response.text()
                
        except Exception as e:
            duration = (time.time() - start) * 1000
            self.stats[description]['count'] += 1
            self.stats[description]['errors'] += 1
            self.stats[description]['total_time'] += duration
            return None, str(e)
    
    async def scenario_browse_and_book(self, session, user_id):
        """Simulate a user browsing rooms and making a reservation"""
        # View dashboard
        await self.make_request(session, 'GET', '/api/dashboard/stats', 'Dashboard')
        await asyncio.sleep(random.uniform(0.5, 2))
        
        # Browse all rooms
        await self.make_request(session, 'GET', '/api/rooms', 'Browse Rooms')
        await asyncio.sleep(random.uniform(1, 3))
        
        # Check availability
        check_in = datetime.now() + timedelta(days=random.randint(1, 30))
        check_out = check_in + timedelta(days=random.randint(1, 7))
        
        await self.make_request(
            session, 'GET', 
            f'/api/rooms/available?check_in={check_in.date()}&check_out={check_out.date()}',
            'Check Availability'
        )
        await asyncio.sleep(random.uniform(0.5, 2))
        
        # Sometimes make a reservation (30% chance)
        if random.random() < 0.3:
            reservation_data = {
                'room_id': random.randint(1, 40),
                'guest_name': f'Test User {user_id}',
                'guest_email': f'user{user_id}@loadtest.com',
                'guest_phone': f'555-{random.randint(1000, 9999)}',
                'check_in': str(check_in.date()),
                'check_out': str(check_out.date())
            }
            
            await self.make_request(
                session, 'POST', '/api/reservations',
                'Create Reservation',
                json=reservation_data
            )
    
    async def scenario_check_reservations(self, session, user_id):
        """Simulate staff checking reservations"""
        # View all reservations
        await self.make_request(session, 'GET', '/api/reservations', 'View Reservations')
        await asyncio.sleep(random.uniform(0.5, 1.5))
        
        # Search for a guest
        search_terms = ['John', 'Jane', 'Smith', 'Brown', 'user']
        query = random.choice(search_terms)
        await self.make_request(
            session, 'GET', f'/api/guests/search?q={query}',
            'Search Guests'
        )
    
    async def scenario_monitor_dashboard(self, session, user_id):
        """Simulate monitoring dashboard"""
        # Repeatedly check dashboard
        for _ in range(3):
            await self.make_request(session, 'GET', '/api/dashboard/stats', 'Monitor Dashboard')
            await asyncio.sleep(random.uniform(2, 5))
    
    async def scenario_error_test(self, session, user_id):
        """Occasionally trigger error simulation"""
        if random.random() < 0.1:  # 10% chance
            await self.make_request(session, 'GET', '/api/simulate/error', 'Error Simulation')
    
    async def simulate_user(self, user_id):
        """Simulate a single user session"""
        # Wait for ramp-up
        if self.ramp_up > 0:
            delay = (user_id / self.num_users) * self.ramp_up
            await asyncio.sleep(delay)
        
        scenarios = [
            self.scenario_browse_and_book,
            self.scenario_check_reservations,
            self.scenario_monitor_dashboard,
            self.scenario_error_test
        ]
        
        async with aiohttp.ClientSession() as session:
            while self.running and (time.time() - self.start_time) < self.duration:
                scenario = random.choice(scenarios)
                try:
                    await scenario(session, user_id)
                except Exception as e:
                    print(f"User {user_id} error: {e}")
                
                # Wait between actions
                await asyncio.sleep(random.uniform(1, 3))
    
    def print_stats(self):
        """Print current statistics"""
        print("\n" + "="*60)
        print(f"Load Test Statistics - Elapsed: {int(time.time() - self.start_time)}s")
        print("="*60)
        print(f"{'Endpoint':<30} {'Requests':<10} {'Errors':<10} {'Avg RT (ms)':<15}")
        print("-"*60)
        
        for endpoint, stats in sorted(self.stats.items()):
            avg_time = stats['total_time'] / stats['count'] if stats['count'] > 0 else 0
            print(f"{endpoint:<30} {stats['count']:<10} {stats['errors']:<10} {avg_time:<15.2f}")
        
        total_requests = sum(s['count'] for s in self.stats.values())
        total_errors = sum(s['errors'] for s in self.stats.values())
        print("-"*60)
        print(f"{'TOTAL':<30} {total_requests:<10} {total_errors:<10}")
        print(f"Requests/sec: {total_requests / (time.time() - self.start_time):.2f}")
        print("="*60)
    
    async def run(self):
        """Run the load test"""
        print(f"Starting load test:")
        print(f"- Target: {self.base_url}")
        print(f"- Users: {self.num_users}")
        print(f"- Duration: {self.duration}s")
        print(f"- Ramp-up: {self.ramp_up}s")
        print("\nPress Ctrl+C to stop early\n")
        
        # Create user tasks
        tasks = [self.simulate_user(i) for i in range(1, self.num_users + 1)]
        
        # Print stats periodically
        async def stats_printer():
            while self.running and (time.time() - self.start_time) < self.duration:
                await asyncio.sleep(10)
                self.print_stats()
        
        # Run everything
        try:
            await asyncio.gather(stats_printer(), *tasks)
        except KeyboardInterrupt:
            print("\nStopping load test...")
            self.running = False
        
        # Final stats
        self.print_stats()

def main():
    parser = argparse.ArgumentParser(description='Load test the Hotel PMS application')
    parser.add_argument('--url', default='http://localhost:8080', help='Base URL of the application')
    parser.add_argument('--users', type=int, default=10, help='Number of concurrent users')
    parser.add_argument('--duration', type=int, default=60, help='Test duration in seconds')
    parser.add_argument('--ramp-up', type=int, default=10, help='Ramp-up period in seconds')
    
    args = parser.parse_args()
    
    tester = LoadTester(args.url, args.users, args.duration, args.ramp_up)
    asyncio.run(tester.run())

if __name__ == '__main__':
    main()