'use strict';

var angular = require('angular'),
	_ = require('lodash');

angular.module('traq').config(function ($stateProvider) {
	$stateProvider.state('traq-charts', {
		url: '/traq/:tid/chart',
		templateUrl: 'traq-charts.html',
		controller: function ($scope, $state, dbTraq, dbChart) {
			dbTraq.get($state.params.tid).then(function (traq) {
				console.log('got traq', traq);
				$scope.traq = traq;
			}).catch(function (err) {
				console.error('failed', err);
			}).then(function () {
				dbChart.getAll({
					startkey: $scope.traq._id + ':',
					endkey: $scope.traq._id + ':\uffff'
				}).then(function (charts) {
					$scope.charts = charts;
					console.log('got charts', $scope.charts);
					if ($state.params.cid) {
						$scope.tabIndex = _.findIndex($scope.charts, function (chart) {
							return chart._id === $state.params.cid;
						}) + 1;
					} else {
						$scope.tabIndex = 0;
					}
				});
			});
		}
	});
});
