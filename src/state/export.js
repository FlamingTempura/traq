'use strict';

var angular = require('angular'),
	_ = require('lodash'),
	d3 = require('d3');

angular.module('traq').config(function ($stateProvider) {
	$stateProvider.state('export', {
		url: '/export',
		templateUrl: 'export.html',
		controller: function ($scope, $timeout, dbTraq, dbRow, download) {
			dbTraq.getAll().then(function (traqs) {
				$scope.traqs = traqs;
			});
			$scope.options = {
				format: 'csv',
				method: 'file',
				selectedTraqs: []
			};
			$scope.toggleTraq = function (id) {
				var i = $scope.options.selectedTraqs.indexOf(id);
				if (i > -1) {
					$scope.options.selectedTraqs.splice(i, 1);
				} else {
					$scope.options.selectedTraqs.push(id);
				}
			};
			$scope.export = function () {
				exporters['csv']();
			};

			var exporters = {
				csv: function () {
					var options = $scope.options,
						traq = _.findWhere($scope.traqs, { _id: options.selectedTraqs[0] });
					dbRow.getAll({
						startkey: traq._id + ':',
						endkey: traq._id + ':\uffff'
					}).then(function (_rows) {
						var rows = _.map(_rows, function (_row) {
							var row = { date: _row.date.toISOString() };
							_.each(traq.columns, function (column) {
								row[column.name + (column.unit ? ' (' + column.unit + ')' : '')] = _row[column.id];
							});
							return row;
						});

						download(traq.title + '.csv', d3.csv.format(rows));
					});
				}
			};
		}
	});
});
