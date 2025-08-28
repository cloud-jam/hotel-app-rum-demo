angular.module('hotelPMSApp', ['ngRoute'])
    .config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
        $routeProvider
            .when('/login', {
                templateUrl: 'views/login.html',
                controller: 'LoginController',
                public: true  // Mark as public route
            })
            .when('/dashboard', {
                templateUrl: 'views/dashboard.html',
                controller: 'DashboardController'
            })
            .when('/reservations', {
                templateUrl: 'views/reservations.html',
                controller: 'ReservationsController'
            })
            .when('/checkin', {
                templateUrl: 'views/checkin.html',
                controller: 'CheckInController'
            })
            .when('/rooms', {
                templateUrl: 'views/rooms.html',
                controller: 'RoomsController'
            })
            .otherwise({
                redirectTo: '/login'  // Changed from /dashboard to /login
            });
    }])
    .run(['$rootScope', '$location', 'AuthService', function($rootScope, $location, AuthService) {
        // Initialize session on app start
        AuthService.initializeSession();
        
        // Check authentication on route change
        $rootScope.$on('$routeChangeStart', function(event, next, current) {
            // Skip auth check for public routes
            if (next.$$route && next.$$route.public) {
                return;
            }
            
            // Check if user is logged in
            if (!AuthService.isLoggedIn()) {
                event.preventDefault();
                $location.path('/login');
            }
        });
        
        // Global error handler
        $rootScope.$on('$routeChangeError', function(event, current, previous, rejection) {
            console.error('Route change error:', rejection);
        });
    }]);