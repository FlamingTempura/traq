'use strict';

var angular = require('angular');

angular.module('traq').config(function ($stateProvider) {
	$stateProvider.state('home', {
		parent: 'main',
		url: '/',
		templateUrl: 'home.html',
		controller: function ($scope, dbChart) {
			$scope.$root.title = 'Traq';
			dbChart.getAll().then(function (charts) {

			});
		}
	});
});
