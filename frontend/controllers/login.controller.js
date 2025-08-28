angular.module('hotelPMSApp')
    .controller('LoginController', ['$scope', '$location', '$rootScope', '$http', 'ApiService',
        function($scope, $location, $rootScope, $http, ApiService) {
            
            $scope.loginData = {
                fullName: '',
                email: '',
                reservationNumber: ''
            };
            
            $scope.isLoading = false;
            $scope.searchQuery = '';
            $scope.searchResults = [];
            $scope.showSearchResults = false;
            $scope.isSearching = false;
            
            // Search for existing reservations/guests
            $scope.searchGuests = function() {
                if (!$scope.searchQuery || $scope.searchQuery.length < 2) {
                    $scope.searchResults = [];
                    $scope.showSearchResults = false;
                    return;
                }
                
                $scope.isSearching = true;
                $http.get('/api/login/search', { params: { q: $scope.searchQuery } })
                    .then(function(response) {
                        $scope.searchResults = response.data;
                        $scope.showSearchResults = response.data.length > 0;
                        $scope.isSearching = false;
                    })
                    .catch(function(error) {
                        console.error('Search error:', error);
                        $scope.isSearching = false;
                    });
            };
            
            // Select a search result to populate login form
            $scope.selectSearchResult = function(result) {
                $scope.loginData.fullName = result.guest_name;
                $scope.loginData.email = result.email;
                $scope.loginData.reservationNumber = result.reservation_number || '';
                
                // Hide search results
                $scope.showSearchResults = false;
                $scope.searchQuery = '';
                $scope.searchResults = [];
            };
            
            // Hide search results when clicking outside
            $scope.hideSearchResults = function() {
                setTimeout(function() {
                    $scope.$apply(function() {
                        $scope.showSearchResults = false;
                    });
                }, 200);
            };
            
            $scope.login = function() {
                $scope.isLoading = true;
                
                // Simulate checking reservation (optional)
                if ($scope.loginData.reservationNumber) {
                    // In a real app, you'd verify this reservation exists
                    console.log('Checking reservation:', $scope.loginData.reservationNumber);
                }
                
                // Create user session object
                const userSession = {
                    userId: 'user-' + Date.now(),
                    fullName: $scope.loginData.fullName,
                    email: $scope.loginData.email,
                    reservationNumber: $scope.loginData.reservationNumber || null,
                    loginTime: new Date().toISOString(),
                    sessionId: 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
                };
                
                // Store in sessionStorage (cleared when browser closes)
                sessionStorage.setItem('userSession', JSON.stringify(userSession));
                
                // Store in rootScope for app-wide access
                $rootScope.currentUser = userSession;
                
                // If Elastic APM is loaded, set user context
                if (window.apmAgent) {
                    window.apmAgent.setUserContext({
                        id: userSession.userId,
                        username: userSession.fullName,
                        email: userSession.email
                    });
                    
                    window.apmAgent.setCustomContext({
                        sessionId: userSession.sessionId,
                        reservationNumber: userSession.reservationNumber,
                        loginTime: userSession.loginTime
                    });
                    
                    console.log('APM User Context set:', userSession);
                }
                
                // Log the login event
                console.log('User logged in:', userSession);
                
                // Simulate API delay
                setTimeout(function() {
                    $scope.$apply(function() {
                        $scope.isLoading = false;
                        // Redirect to dashboard
                        $location.path('/dashboard');
                    });
                }, 500);
            };
            
            // Check if already logged in
            $scope.$on('$viewContentLoaded', function() {
                const existingSession = sessionStorage.getItem('userSession');
                if (existingSession) {
                    // Already logged in, redirect to dashboard
                    $location.path('/dashboard');
                }
            });
        }
    ]);