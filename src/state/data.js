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
			measurementIds: function (dbMeasurement) {
				return dbMeasurement.allDocs().then(function (response) {
					return _.chain(response.rows).pluck('id').sortBy(function (id) {
						return id.split(':')[1];
					}).value().reverse();
				});
			}
		},
		controller: function ($q, $scope, $state, snack, dbMeasurement, columns, measurementIds) {
			var measurementsCount = measurementIds.length,
				chunkSize = 20,
				chunks = {},
				fetchChunk = function (chunkNumber) {
					if (chunks[chunkNumber] === null) { return; }
					chunks[chunkNumber] = null;

					$q.all(_.map(measurementIds.slice(chunkNumber * chunkSize, (chunkNumber + 1) * chunkSize), function (id) {
						return dbMeasurement.get(id).then(function (measurement) {
							return _.extend({}, measurement, {
								date: moment(measurement.timestamp).calendar(null, { sameElse: 'ddd D MMM YYYY [at] H:mm A' }),
								column: _.findWhere(columns, { _id: measurement._id.split(':')[0] })
							});
						});
					})).then(function (measurements) {
						chunks[chunkNumber] = measurements;
					});
				};

			$scope.measurements = {
				getLength: function () { return measurementsCount; },
				getItemAtIndex: function (index) {
					var chunkNumber = Math.floor(index / chunkSize),
						chunk = chunks[chunkNumber];
					if (chunk) {
						console.log('getting', chunk, index % chunkSize, chunk[index % chunkSize])
						return chunk[index % chunkSize];
					} else {
						fetchChunk(chunkNumber);
					}
				}
			};

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
