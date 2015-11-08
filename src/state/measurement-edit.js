'use strict';

var angular = require('angular'),
	uuid = require('node-uuid'),
	_ = require('lodash'),
	moment = require('moment');

angular.module('traq').config(function ($stateProvider) {
	$stateProvider.state('measurement-edit', {
		url: '/measurement/:mid/edit?column',
		templateUrl: 'measurement-edit.html',
		resolve: {
			columns: function (dbColumn) { return dbColumn.getAll(); },
			measurement: function ($stateParams, dbMeasurement) {
				if ($stateParams.mid === 'new') {
					return { timestamp: moment().millisecond(0).toDate() };
				} else {
					return dbMeasurement.get($stateParams.mid);
				}
			}
		},
		controller: function ($scope, $state, dbMeasurement, snack, columns, measurement) {
			$scope.isNew = $state.params.mid === 'new';
			$scope.groupedColumns = _.groupBy(columns, function (column) {
				return column.name.replace(/^[^(]+(?:\(([^)]+)\))?$/, '$1') || 'Other'; // extract category from brackets e.g. Food (Expense)
			});
			$scope.measurement = measurement;

			if ($scope.isNew) {
				$scope.column = _.findWhere(columns, { _id: $state.params.column }) || columns[0];
			} else {
				$scope.column = _.findWhere(columns, { _id: measurement.columnId });
			}

			$scope.save = function () {
				if (!measurement._id) {
					measurement._id = $scope.column._id + ':' + moment(measurement.timestamp).format('YYYYMMDD[-]HHmmss') + ':' + uuid.v4().slice(0, 4);
				}
				dbMeasurement.put(measurement).then(function () {
					console.log('saved!', measurement);
					history.back();
				}).catch(function (err) {
					console.error('failed', err); // TODO
				});
			};
		}
	});
});
