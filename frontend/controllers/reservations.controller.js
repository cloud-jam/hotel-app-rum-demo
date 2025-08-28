angular.module('hotelPMSApp')
    .controller('ReservationsController', ['$scope', 'ApiService', 
        function($scope, ApiService) {
            $scope.reservations = [];
            $scope.showNewReservation = false;
            $scope.newReservation = {};
            $scope.statusFilter = '';
            $scope.searchText = '';
            $scope.availableRooms = [];
            $scope.checkingAvailability = false;
            $scope.creatingReservation = false;
            $scope.selectedReservation = null;
            
            // Statistics
            $scope.stats = {
                total: 0,
                confirmed: 0,
                checkedIn: 0,
                checkedOut: 0,
                totalRevenue: 0
            };
            
            function loadReservations() {
                ApiService.getReservations()
                    .then(function(response) {
                        $scope.reservations = response.data;
                        calculateStats();
                    })
                    .catch(function(error) {
                        console.error('Error loading reservations:', error);
                    });
            }
            
            function calculateStats() {
                $scope.stats = {
                    total: $scope.reservations.length,
                    confirmed: 0,
                    checkedIn: 0,
                    checkedOut: 0,
                    totalRevenue: 0
                };
                
                $scope.reservations.forEach(function(reservation) {
                    switch(reservation.status) {
                        case 'confirmed':
                            $scope.stats.confirmed++;
                            break;
                        case 'checked_in':
                            $scope.stats.checkedIn++;
                            break;
                        case 'checked_out':
                            $scope.stats.checkedOut++;
                            break;
                    }
                    $scope.stats.totalRevenue += parseFloat(reservation.total_amount);
                });
            }
            
            $scope.filterReservations = function(status) {
                $scope.statusFilter = status;
            };
            
            $scope.checkAvailability = function() {
                if (!$scope.newReservation.check_in || !$scope.newReservation.check_out) {
                    $scope.availableRooms = [];
                    return;
                }
                
                $scope.checkingAvailability = true;
                ApiService.getAvailableRooms($scope.newReservation.check_in, $scope.newReservation.check_out)
                    .then(function(response) {
                        $scope.availableRooms = response.data;
                        $scope.checkingAvailability = false;
                        calculateAmount();
                    })
                    .catch(function(error) {
                        console.error('Error checking availability:', error);
                        $scope.checkingAvailability = false;
                    });
            };
            
            function calculateAmount() {
                if (!$scope.newReservation.room_id || !$scope.newReservation.check_in || !$scope.newReservation.check_out) {
                    $scope.calculatedAmount = 0;
                    return;
                }
                
                $scope.selectedRoom = $scope.availableRooms.find(function(room) {
                    return room.id == $scope.newReservation.room_id;
                });
                
                if ($scope.selectedRoom) {
                    var checkIn = new Date($scope.newReservation.check_in);
                    var checkOut = new Date($scope.newReservation.check_out);
                    $scope.nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
                    $scope.calculatedAmount = $scope.nights * parseFloat($scope.selectedRoom.rate);
                }
            }
            
            $scope.$watch('newReservation.room_id', calculateAmount);
            
            $scope.createReservation = function() {
                if (!$scope.calculatedAmount) return;
                
                $scope.creatingReservation = true;
                var reservationData = {
                    room_id: $scope.newReservation.room_id,
                    guest_name: $scope.newReservation.guest_name,
                    guest_email: $scope.newReservation.guest_email,
                    guest_phone: $scope.newReservation.guest_phone,
                    check_in: $scope.newReservation.check_in,
                    check_out: $scope.newReservation.check_out,
                    total_amount: $scope.calculatedAmount
                };
                
                ApiService.createReservation(reservationData)
                    .then(function(response) {
                        alert('Reservation created successfully!\nConfirmation: ' + response.data.confirmation_number);
                        $scope.cancelNewReservation();
                        loadReservations();
                    })
                    .catch(function(error) {
                        alert('Error creating reservation: ' + (error.data.error || 'Unknown error'));
                        $scope.creatingReservation = false;
                    });
            };
            
            $scope.cancelNewReservation = function() {
                $scope.newReservation = {};
                $scope.showNewReservation = false;
                $scope.availableRooms = [];
                $scope.calculatedAmount = 0;
                $scope.creatingReservation = false;
            };
            
            $scope.viewReservationDetails = function(reservation) {
                $scope.selectedReservation = reservation;
                var modal = new bootstrap.Modal(document.getElementById('reservationModal'));
                modal.show();
            };
            
            $scope.quickCheckIn = function(reservation) {
                if (confirm('Check in ' + reservation.guest_name + ' to room ' + reservation.room_number + '?')) {
                    ApiService.checkIn(reservation.id)
                        .then(function() {
                            alert('Check-in successful!');
                            loadReservations();
                        })
                        .catch(function(error) {
                            alert('Check-in failed: ' + (error.data.error || 'Unknown error'));
                        });
                }
            };
            
            $scope.cancelReservation = function(reservation) {
                if (confirm('Are you sure you want to cancel this reservation for ' + reservation.guest_name + '?')) {
                    // Since there's no cancel API, we'll just update the status to checked_out
                    alert('Cancellation feature coming soon!');
                }
            };
            
            // Initial load
            loadReservations();
        }
    ]);