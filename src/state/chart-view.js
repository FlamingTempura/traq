'use strict';

var angular = require('angular');

angular.module('traq').config(function ($stateProvider) {
	$stateProvider.state('chart-view', {
		parent: 'traq',
		url: '/chart/:cid',
		templateUrl: 'chart-view.html',
		controller: function ($scope, $state, dbChart) {
			dbChart.get($state.params.cid).then(function (chart) {
				console.log('got chart', chart);
				$scope.chart = chart;
			}).catch(function (err) {
				console.error('failed', err);
			});
		}
	});
});
