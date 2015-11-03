'use strict';

var angular = require('angular'),
	_ = require('lodash'),
	moment = require('moment');

angular.module('traq').config(function ($stateProvider) {
	$stateProvider.state('data', {
		url: '/data',
		templateUrl: 'data.html',
		resolve: {
			columns: function (dbColumn) { return dbColumn.getAll(); },
			measurements: function (dbMeasurement) {
				return dbMeasurement.getAll().then(function (measurements) {
					return _.sortBy(measurements, 'timestamp').reverse();
				});
			}
		},
		controller: function ($q, $scope, $state, snack, dbMeasurement, columns, measurements) {
			$scope.measurements = _.map(measurements, function (measurement) {
				return _.extend({}, measurement, {
					date: moment(measurement.timestamp).calendar(null, { sameElse: 'ddd D MMM YYYY [at] H:mm A' }),
					column: _.findWhere(columns, { _id: measurement._id.split(':')[0] })
				});
			});
			$scope.data = {
				selectMode: false,
				selected: {}
			};
			$scope.$watch('data.selected', function (selected) {
				$scope.data.selectMode = !!_.find(selected, function (selected) { return selected; });
			}, true);
			$scope.delete = function () {
				var selected = _.chain($scope.data.selected).map(function (selected, measurementId) {
					return { measurementId: measurementId, selected: selected };
				}).select(function (o) {
					console.log('o', o)
					return o.selected;
				}).pluck('measurementId').map(function (id) {
					return _.findWhere(measurements, { _id: id });
				}).value();
				console.log('attempting to remove', selected);
				$q.all(_.map(selected, function (measurement) {
					return dbMeasurement.remove(measurement);
				})).then(function () {
					history.back();
					snack('The measurement has been deleted', 'Undo', function () {
						console.log('reviving', selected);
						dbMeasurement.bulkDocs(_.map(selected, function (measurement) {
							return _.omit(measurement, '_rev');
						}));
						$state.go($state.current, {}, { reload: true });
					});
				}).catch(function (err) {
					// TODO
					console.error(err);
				});
			};
		}
	});
});
