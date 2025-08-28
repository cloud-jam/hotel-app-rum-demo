angular.module('hotelPMSApp')
    .factory('ApiService', ['$http', 'AuthService', function($http, AuthService) {
        var baseUrl = '/api';

        // Add interceptor for session headers
        $http.defaults.transformRequest.push(function(data, headersGetter) {
            const user = AuthService.getCurrentUser();
            if (user) {
                headersGetter()['X-Session-ID'] = user.sessionId;
                headersGetter()['X-User-ID'] = user.userId;
                headersGetter()['X-User-Email'] = user.email;
            }
            return data;
        });
        
        return {
            // Dashboard
            getDashboardStats: function() {
                return $http.get(baseUrl + '/dashboard/stats');
            },
            
            // Rooms
            getRooms: function() {
                return $http.get(baseUrl + '/rooms');
            },
            
            getAvailableRooms: function(checkIn, checkOut) {
                return $http.get(baseUrl + '/rooms/available', {
                    params: { check_in: checkIn, check_out: checkOut }
                });
            },
            
            updateRoomStatus: function(roomId, status) {
                return $http.put(baseUrl + '/rooms/' + roomId + '/status', { status: status });
            },
            
            // Reservations
            getReservations: function() {
                return $http.get(baseUrl + '/reservations');
            },
            
            createReservation: function(reservationData) {
                return $http.post(baseUrl + '/reservations', reservationData);
            },
            
            checkIn: function(reservationId) {
                return $http.post(baseUrl + '/checkin/' + reservationId);
            },
            
            checkOut: function(reservationId) {
                return $http.post(baseUrl + '/checkout/' + reservationId);
            },
            
            // Guests
            searchGuests: function(query) {
                return $http.get(baseUrl + '/guests/search', { params: { q: query } });
            },
            
            // Error simulation (for testing)
            simulateError: function() {
                return $http.get(baseUrl + '/simulate/error');
            }
        };
    }]);