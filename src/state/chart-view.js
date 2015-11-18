'use strict';

var angular = require('angular');

angular.module('traq').config(function ($stateProvider) {
	$stateProvider.state('chart-view', {
		url: '/traq/:tid',
		templateUrl: 'chart-view.html',
		resolve: {
			traq: function ($stateParams, dbTraq) { return dbTraq.get($stateParams.tid); }
		},
		controller: function ($scope, $stateParams, spans, traq) {
			$scope.traq = traq;
			$scope.spans = spans;
			$scope.o = { span: '1m' };
		}
	});
});
