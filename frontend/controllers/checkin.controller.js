angular.module('hotelPMSApp')
    .controller('CheckInController', ['$scope', 'ApiService', 
        function($scope, ApiService) {
            $scope.todayArrivals = [];
            $scope.todayDepartures = [];
            $scope.searchQuery = '';
            $scope.searchResults = [];
            
            // Manual check-in form data
            $scope.manualCheckInForm = {
                searchTerm: '',
                searchResults: [],
                selectedReservation: null,
                processing: false
            };
            
            function loadTodayActivity() {
                ApiService.getReservations()
                    .then(function(response) {
                        var today = new Date().toISOString().split('T')[0];
                        $scope.todayArrivals = response.data.filter(function(res) {
                            return res.check_in === today && res.status === 'confirmed';
                        });
                        $scope.todayDepartures = response.data.filter(function(res) {
                            return res.check_out === today && res.status === 'checked_in';
                        });
                    })
                    .catch(function(error) {
                        console.error('Error loading activity:', error);
                    });
            }
            
            $scope.searchGuest = function() {
                if ($scope.searchQuery.length < 2) return;
                
                ApiService.searchGuests($scope.searchQuery)
                    .then(function(response) {
                        $scope.searchResults = response.data;
                    })
                    .catch(function(error) {
                        console.error('Search error:', error);
                    });
            };
            
            $scope.checkIn = function(reservation) {
                if (confirm('Check in ' + reservation.guest_name + '?')) {
                    ApiService.checkIn(reservation.id)
                        .then(function(response) {
                            alert('Check-in successful!');
                            loadTodayActivity();
                        })
                        .catch(function(error) {
                            alert('Check-in failed: ' + error.data.error);
                        });
                }
            };
            
            $scope.checkOut = function(reservation) {
                if (confirm('Check out ' + reservation.guest_name + '?')) {
                    $scope.processingCheckout = true;
                    ApiService.checkOut(reservation.id)
                        .then(function(response) {
                            alert('Check-out successful! Amount: $' + response.data.final_amount);
                            loadTodayActivity();
                            $scope.processingCheckout = false;
                        })
                        .catch(function(error) {
                            alert('Check-out failed: ' + error.data.error);
                            $scope.processingCheckout = false;
                        });
                }
            };
            
            // Search reservations for manual check-in
            $scope.searchReservations = function() {
                if ($scope.manualCheckInForm.searchTerm.length < 2) {
                    $scope.manualCheckInForm.searchResults = [];
                    return;
                }
                
                ApiService.getReservations()
                    .then(function(response) {
                        var searchTerm = $scope.manualCheckInForm.searchTerm.toLowerCase();
                        $scope.manualCheckInForm.searchResults = response.data.filter(function(reservation) {
                            return reservation.confirmation_number.toLowerCase().indexOf(searchTerm) !== -1 ||
                                   reservation.guest_name.toLowerCase().indexOf(searchTerm) !== -1;
                        });
                    })
                    .catch(function(error) {
                        console.error('Error searching reservations:', error);
                    });
            };
            
            // Select a reservation for check-in
            $scope.selectReservation = function(reservation) {
                $scope.manualCheckInForm.selectedReservation = reservation;
            };
            
            // Manual check-in function
            $scope.manualCheckIn = function() {
                if (!$scope.manualCheckInForm.selectedReservation) {
                    alert('Please select a reservation');
                    return;
                }
                
                var reservation = $scope.manualCheckInForm.selectedReservation;
                
                if (reservation.status !== 'confirmed') {
                    alert('Only confirmed reservations can be checked in');
                    return;
                }
                
                $scope.manualCheckInForm.processing = true;
                
                ApiService.checkIn(reservation.id)
                    .then(function(response) {
                        alert('Check-in successful for ' + reservation.guest_name + '!');
                        
                        // Clear form and reload data
                        $scope.manualCheckInForm = {
                            searchTerm: '',
                            searchResults: [],
                            selectedReservation: null,
                            processing: false
                        };
                        
                        loadTodayActivity();
                    })
                    .catch(function(error) {
                        alert('Check-in failed: ' + (error.data.error || 'Unknown error'));
                        $scope.manualCheckInForm.processing = false;
                    });
            };
            
            // Simulate a random check-in for testing
            $scope.simulateCheckIn = function() {
                ApiService.getReservations()
                    .then(function(response) {
                        var confirmedReservations = response.data.filter(function(res) {
                            return res.status === 'confirmed';
                        });
                        
                        if (confirmedReservations.length === 0) {
                            alert('No confirmed reservations available for check-in');
                            return;
                        }
                        
                        var randomReservation = confirmedReservations[Math.floor(Math.random() * confirmedReservations.length)];
                        
                        ApiService.checkIn(randomReservation.id)
                            .then(function() {
                                alert('Successfully checked in: ' + randomReservation.guest_name + 
                                      ' (Room ' + randomReservation.room_number + ')');
                                loadTodayActivity();
                            })
                            .catch(function(error) {
                                alert('Check-in failed: ' + (error.data.error || 'Unknown error'));
                            });
                    });
            };
            
            // Create a test reservation for today
            $scope.createTestReservation = function() {
                var today = new Date();
                var tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                
                var testReservation = {
                    room_id: Math.floor(Math.random() * 40) + 1,
                    guest_name: 'Test Guest ' + Math.floor(Math.random() * 1000),
                    guest_email: 'test' + Math.floor(Math.random() * 1000) + '@hotel.com',
                    guest_phone: '555-' + Math.floor(Math.random() * 9000 + 1000),
                    check_in: today.toISOString().split('T')[0],
                    check_out: tomorrow.toISOString().split('T')[0],
                    total_amount: Math.floor(Math.random() * 200 + 100)
                };
                
                ApiService.createReservation(testReservation)
                    .then(function(response) {
                        alert('Test reservation created successfully!\nConfirmation: ' + response.data.confirmation_number);
                        loadTodayActivity();
                        $scope.searchReservations(); // Refresh search if active
                    })
                    .catch(function(error) {
                        alert('Failed to create reservation: ' + (error.data.error || 'Unknown error'));
                    });
            };
            
            // Refresh all data
            $scope.refreshData = function() {
                loadTodayActivity();
                $scope.searchGuest();
                $scope.searchReservations();
                alert('All data refreshed!');
            };
            
            // Initial load
            loadTodayActivity();
        }
    ]);