'use strict';

var angular = require('angular');

angular.module('traq').config(function ($stateProvider) {
	$stateProvider.state('traq-charts', {
		url: '/traq/:tid/chart',
		templateUrl: 'traq-charts.html',
		resolve: {
			traq: function ($stateParams, dbTraq) { return dbTraq.get($stateParams.tid); },
			charts: function ($stateParams, dbChart, traq) {
				return dbChart.getAll({
					startkey: traq._id + ':',
					endkey: traq._id + ':\uffff'
				});
			}
		},
		controller: function ($scope, $state, traq, charts) {
			$scope.traq = traq;
			$scope.charts = charts;
		}
	});
});
