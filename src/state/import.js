'use strict';

var angular = require('angular'),
	_ = require('lodash');

angular.module('traq').config(function ($stateProvider) {
	$stateProvider.state('import', {
		url: '/import',
		templateUrl: 'import.html',
		/*controller: function ($injector, $scope, transports) {
			$scope.imports = _.map(transports, function (transport) {
				if (typeof transport.import !== 'string') { return transport; }
				return _.extend(transport, {
					import: $injector.get(transport.import)
				});
			});
			console.log($scope.imports)
		}*/
		controller: function ($scope, $state) {
			console.log($state.get())
			$scope.imports = _.chain($state.get()).select(function (state) {
				return state.import;
			}).map(function (state) {
				return _.extend({}, state, state.import);
			}).value();
		}
	});
});
