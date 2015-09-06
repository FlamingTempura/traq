'use strict';

var angular = require('angular'),
	_ = require('lodash');

angular.module('traq').config(function ($stateProvider) {
	$stateProvider.state('table-view', {
		parent: 'table',
		url: '/',
		templateUrl: 'table-view.html',
		controller: function ($scope, rowsSelected) {
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

			$scope.$parent.$watch('table', function (table) {
				if (!table) { return; }
				var precision = table.precision || 'any';

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
		}
	});
});
