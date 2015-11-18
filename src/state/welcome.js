'use strict';

var angular = require('angular');

angular.module('traq').config(function ($stateProvider) {
	$stateProvider.state('welcome', {
		url: '/welcome',
		templateUrl: 'welcome.html',
		resolve: { onboarded: function (dbConfig) { return dbConfig.exists('onboard'); } },
		controller: function ($q, $scope, $state, dbConfig, onboarded) {
			$scope.skip = function () {
				$q.resolve(onboarded || dbConfig.put({ _id: 'onboard' })).then(function () {
					$state.go('home');
				});
			};
		}
	});
});
