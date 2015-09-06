'use strict';

var angular = require('angular'),
	_ = require('lodash');

angular.module('traq').config(function ($stateProvider) {
	$stateProvider.state('table', {
		parent: 'main',
		url: '/table/:tid',
		abstract: true,
		templateUrl: 'table.html',
		controller: function ($scope, $state, dbTable, dbRow, dbChart, rowsSelected) {
			$scope.rowsSelected = rowsSelected;
			$scope.$watch('rowsSelected', function (rowsSelected) {
				$scope.showSelectedToolbar = _.keys(rowsSelected).length > 0 && _.reduce(rowsSelected, function (memo, rowSelected) {
					return memo && rowSelected;
				}, true);
			}, true);

			dbTable.get($state.params.tid).then(function (table) {
				console.log('got table', table);
				$scope.table = table;
			}).catch(function (err) {
				console.error('failed', err);
			}).then(function () {
				dbRow.getAll({
					startkey: $scope.table._id + ':',
					endkey: $scope.table._id + ':\uffff'
				}).then(function (rows) {
					$scope.rows = _.sortBy(rows, 'date');
					console.log('got rows', $scope.rows);
				});
				dbChart.getAll({
					startkey: $scope.table._id + ':',
					endkey: $scope.table._id + ':\uffff'
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
