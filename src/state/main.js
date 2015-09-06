'use strict';

var angular = require('angular');

angular.module('traq').config(function ($stateProvider) {
	$stateProvider.state('main', {
		abstract: true,
		templateUrl: 'main.html',
		controller: function ($scope, $state, $mdSidenav, dbTable) {
			$scope.toggleSidenav = function (menuId) {
				$mdSidenav(menuId).toggle();
			};

			$scope.go = function (to, params) {
				$state.go(to, params);
				$mdSidenav('left').close();
			};

			dbTable.getAll().then(function (tables) {
				$scope.tables = tables;
				console.log('got tables', $scope.tables);
			}).catch(function (err) {
				console.error('failed', err);
			});
		}
	});
});
