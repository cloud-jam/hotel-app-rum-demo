angular.module('hotelPMSApp')
    .controller('DashboardController', ['$scope', '$interval', 'ApiService', 
        function($scope, $interval, ApiService) {
            $scope.stats = {};
            $scope.loading = true;
            $scope.lastUpdated = new Date();
            
            function loadDashboardStats() {
                ApiService.getDashboardStats()
                    .then(function(response) {
                        $scope.stats = response.data;
                        $scope.loading = false;
                        $scope.lastUpdated = new Date();
                    })
                    .catch(function(error) {
                        console.error('Error loading dashboard stats:', error);
                        $scope.error = 'Failed to load dashboard statistics';
                        $scope.loading = false;
                    });
            }
            
            // Initial load
            loadDashboardStats();
            
            // Refresh every 30 seconds
            var refreshInterval = $interval(loadDashboardStats, 30000);
            
            // Cleanup on destroy
            $scope.$on('$destroy', function() {
                if (refreshInterval) {
                    $interval.cancel(refreshInterval);
                }
            });
            
            // Test error handling
            $scope.testError = function() {
                ApiService.simulateError()
                    .then(function(response) {
                        console.log('Success (unexpected):', response);
                    })
                    .catch(function(error) {
                        console.error('Simulated error:', error);
                        alert('Error simulation triggered: ' + (error.data && error.data.error ? error.data.error : 'Unknown error'));
                    });
            };
        }
    ]);