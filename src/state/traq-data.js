'use strict';

var angular = require('angular'),
	_ = require('lodash');

angular.module('traq').config(function ($stateProvider) {
	$stateProvider.state('traq-data', {
		url: '/traq/:tid/data',
		templateUrl: 'traq-data.html',
		controller: function ($scope, $state, dbTraq, dbRow, rowsSelected) {
			dbTraq.get($state.params.tid).then(function (traq) {
				console.log('got traq', traq);
				$scope.traq = traq;
			}).catch(function (err) {
				console.error('failed', err);
			}).then(function () {
				dbRow.getAll({
					startkey: $scope.traq._id + ':',
					endkey: $scope.traq._id + ':\uffff'
				}).then(function (rows) {
					$scope.rows = _.sortBy(rows, 'date');
					console.log('got rows', $scope.rows);
				});
			});

			$scope.rowsSelected = rowsSelected;
			$scope.selectAll = false;
			$scope.start = 0;
			$scope.limit = 10;
			$scope.$watch('selectAll', function (selectAll) {
				if (selectAll) {
					_.each($scope.rows, function (row) {
						rowsSelected[row._id] = true;
					});
				} else {
					rowsSelected = [];
				}
			});

			$scope.dateFormat = 'dd MMM yyyy h:mma';

			$scope.$parent.$watch('traq', function (traq) {
				if (!traq) { return; }
				var precision = traq.precision || 'any';

				if (precision === 'month') {
					$scope.dateFormat = 'MMM yyyy';
				} else if (precision === 'week') {
					$scope.dateFormat = '"Week" w, yyyy';
				} else {
					$scope.dateFormat = 'dd MMM yyyy';
					if (precision === 'any' || precision === 'hour') {
						$scope.dateFormat += ' h:mma';
					}
				}
			});

			$scope.rowsSelected = rowsSelected;
			$scope.$watch('rowsSelected', function (rowsSelected) {
				$scope.showSelectedToolbar = _.keys(rowsSelected).length > 0 && _.reduce(rowsSelected, function (memo, rowSelected) {
					return memo && rowSelected;
				}, true);
			}, true);

		}
	});
});
