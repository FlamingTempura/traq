'use strict';

var angular = require('angular'),
	_ = require('lodash'),
	d3 = require('d3');

angular.module('traq').config(function ($stateProvider) {
	$stateProvider.state('export', {
		url: '/export',
		templateUrl: 'export.html',
		controller: function ($scope, $timeout, dbTable, dbRow, download) {
			dbTable.getAll().then(function (tables) {
				$scope.tables = tables;
			});
			$scope.options = {
				format: 'csv',
				method: 'file',
				selectedTables: []
			};
			$scope.toggleTable = function (id) {
				var i = $scope.options.selectedTables.indexOf(id);
				if (i > -1) {
					$scope.options.selectedTables.splice(i, 1);
				} else {
					$scope.options.selectedTables.push(id);
				}
			};
			$scope.export = function () {
				exporters['csv']();
			};

			var exporters = {
				csv: function () {
					var options = $scope.options,
						table = _.findWhere($scope.tables, { _id: options.selectedTables[0] });
					dbRow.getAll({
						startkey: table._id + ':',
						endkey: table._id + ':\uffff'
					}).then(function (_rows) {
						var rows = _.map(_rows, function (_row) {
							var row = { date: _row.date.toISOString() };
							_.each(table.columns, function (column) {
								row[column.name + ' (' + column.unit + ')'] = _row[column.id];
							});
							return row;
						});

						download(table.title + '.csv', d3.csv.format(rows));
					});
				}
			};
		}
	});
});
