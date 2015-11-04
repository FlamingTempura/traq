'use strict';

var angular = require('angular');

angular.module('traq').config(function ($stateProvider) {
	$stateProvider.state('chart-view', {
		url: '/traq/:tid/chart/:chart',
		templateUrl: 'chart-view.html',
		resolve: {
			traq: function ($stateParams, dbTraq) { return dbTraq.get($stateParams.tid); },
			data: function (traq, getData) { return getData(traq); }
		},
		controller: function ($scope, $stateParams, traq, data) {
			$scope.traq = traq;
			$scope.data = data;
			$scope.span = '1m';
			$scope.chart = traq.charts[$stateParams.chart];
		}
	});
});
