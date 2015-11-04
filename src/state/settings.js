'use strict';

var angular = require('angular'),
	_ = require('lodash');

angular.module('traq').config(function ($stateProvider) {
	$stateProvider.state('settings', {
		url: '/settings',
		templateUrl: 'settings.html',
		resolve: {
			columns: function (dbColumn) { return dbColumn.getAll(); }
		},
		controller: function ($scope, dbColumn, columns) {
			$scope.columns = columns;
			_.each(columns, function (column, i) {
				var oldUnit = column.oldUnit;
				$scope.$watch('columns[' + i + ']', function (column) {
					if (!column || column.unit === oldUnit) { return; }
					console.log('change column', column)
					dbColumn.put(column).then(function (res) {
						console.log(res);
						column._rev = res.rev;
						oldUnit = column.unit;
					});
				}, true);
			});
		}
	});
});
