angular.module('hotelPMSApp')
    .factory('AuthService', ['$rootScope', '$location', function($rootScope, $location) {
        
        return {
            // Check if user is logged in
            isLoggedIn: function() {
                return sessionStorage.getItem('userSession') !== null;
            },
            
            // Get current user session
            getCurrentUser: function() {
                const sessionStr = sessionStorage.getItem('userSession');
                return sessionStr ? JSON.parse(sessionStr) : null;
            },
            
            // Logout function
            logout: function() {
                sessionStorage.removeItem('userSession');
                delete $rootScope.currentUser;
                
                // Clear APM user context
                if (window.apmAgent) {
                    window.apmAgent.setUserContext({});
                    window.apmAgent.setCustomContext({});
                }
                
                $location.path('/login');
            },
            
            // Initialize session on app load
            initializeSession: function() {
                const user = this.getCurrentUser();
                if (user) {
                    $rootScope.currentUser = user;
                    
                    // Restore APM context
                    if (window.apmAgent) {
                        window.apmAgent.setUserContext({
                            id: user.userId,
                            username: user.fullName,
                            email: user.email
                        });
                        
                        window.apmAgent.setCustomContext({
                            sessionId: user.sessionId,
                            reservationNumber: user.reservationNumber,
                            loginTime: user.loginTime
                        });
                    }
                }
                return user;
            }
        };
    }]);