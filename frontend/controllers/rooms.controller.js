angular.module('hotelPMSApp')
    .controller('RoomsController', ['$scope', 'ApiService', 
        function($scope, ApiService) {
            $scope.rooms = [];
            $scope.showMaintenanceMode = false;
            $scope.selectedRoom = null;
            
            // Filters
            $scope.filters = {
                floor: '',
                type: '',
                status: '',
                search: ''
            };
            
            // Statistics
            $scope.roomStats = {
                total: 0,
                available: 0,
                occupied: 0,
                maintenance: 0,
                cleaning: 0,
                occupancyRate: 0
            };
            
            function loadRooms() {
                ApiService.getRooms()
                    .then(function(response) {
                        $scope.rooms = response.data;
                        calculateStats();
                    })
                    .catch(function(error) {
                        console.error('Error loading rooms:', error);
                        alert('Failed to load rooms');
                    });
            }
            
            function calculateStats() {
                $scope.roomStats = {
                    total: $scope.rooms.length,
                    available: 0,
                    occupied: 0,
                    maintenance: 0,
                    cleaning: 0,
                    occupancyRate: 0
                };
                
                $scope.rooms.forEach(function(room) {
                    switch(room.status) {
                        case 'vacant':
                            $scope.roomStats.available++;
                            break;
                        case 'occupied':
                            $scope.roomStats.occupied++;
                            break;
                        case 'maintenance':
                            $scope.roomStats.maintenance++;
                            break;
                        case 'cleaning':
                            $scope.roomStats.cleaning++;
                            break;
                    }
                });
                
                if ($scope.roomStats.total > 0) {
                    $scope.roomStats.occupancyRate = Math.round(
                        ($scope.roomStats.occupied / $scope.roomStats.total) * 100
                    );
                }
            }
            
            $scope.getRoomsByFloor = function(floor) {
                return $scope.rooms.filter(function(room) {
                    return room.floor === floor;
                });
            };
            
            $scope.filterRooms = function(room) {
                // Floor filter
                if ($scope.filters.floor && room.floor != $scope.filters.floor) {
                    return false;
                }
                
                // Type filter
                if ($scope.filters.type && room.room_type !== $scope.filters.type) {
                    return false;
                }
                
                // Status filter
                if ($scope.filters.status && room.status !== $scope.filters.status) {
                    return false;
                }
                
                // Search filter
                if ($scope.filters.search && 
                    room.room_number.indexOf($scope.filters.search) === -1) {
                    return false;
                }
                
                return true;
            };
            
            $scope.roomAction = function(room) {
                if ($scope.showMaintenanceMode) {
                    // In maintenance mode, toggle between maintenance and vacant
                    if (room.status === 'occupied') {
                        alert('Cannot modify occupied rooms');
                        return;
                    }
                    
                    var newStatus = room.status === 'maintenance' ? 'vacant' : 'maintenance';
                    $scope.changeStatus(room, newStatus);
                } else {
                    // Normal mode - show details
                    $scope.viewRoomDetails(room);
                }
            };
            
            $scope.changeStatus = function(room, newStatus) {
                if (room.status === 'occupied') {
                    alert('Cannot change status of occupied room');
                    return;
                }
                
                ApiService.updateRoomStatus(room.id, newStatus)
                    .then(function() {
                        room.status = newStatus;
                        calculateStats();
                        alert('Room ' + room.room_number + ' status updated to ' + newStatus);
                    })
                    .catch(function(error) {
                        alert('Failed to update room status');
                        console.error(error);
                    });
            };
            
            $scope.viewRoomDetails = function(room) {
                $scope.selectedRoom = room;
                var modal = new bootstrap.Modal(document.getElementById('roomModal'));
                modal.show();
            };
            
            $scope.changeStatusFromModal = function(newStatus) {
                if ($scope.selectedRoom) {
                    $scope.changeStatus($scope.selectedRoom, newStatus);
                    bootstrap.Modal.getInstance(document.getElementById('roomModal')).hide();
                }
            };
            
            $scope.refreshRooms = function() {
                loadRooms();
            };
            
            // Initial load
            loadRooms();
        }
    ]);