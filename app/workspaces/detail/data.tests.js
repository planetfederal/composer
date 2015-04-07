describe('gsApp.workspaces.data', function() {

    beforeEach(function() {
        angular.module('ngGrid', []);
        angular.module('angularFileUpload', []);
        angular.module('ui.bootstrap', []);

        module(function($provide) {
            $provide.provider('$stateProvider', function() {
                return {
                    $get: function() {
                        return {state: new Function()};
                    }
                };
            });
        });

        module('gsApp.workspaces.data');
    });

    describe('storesListModel', function() {

        beforeEach(inject(function($injector) {
            storesListModel = $injector.get('storesListModel');
            console.log(storesListModel);
        }));

        it('Should exist', function() {
            console.log(storesListModel + " exists!");
        });
    });



});