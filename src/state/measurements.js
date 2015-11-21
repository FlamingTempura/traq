'use strict';

var angular = require('angular'),
	_ = require('lodash');

angular.module('traq').config(function ($stateProvider) {
	$stateProvider.state('measurements', {
		url: '/measurements',
		templateUrl: 'measurements.html',
		resolve: {
			columns: function (dbColumn) { return dbColumn.getAll(); },
			measurementCount: function (dbMeasurement) { return dbMeasurement.count(); }
		},
		controller: function ($q, $scope, $state, snack, dbMeasurement, columns, measurementCount) {
			console.log('COUNT', measurementCount);
			var oldestTimestamp,
				chunkSize = 100,
				chunks = {},
				fetchChunk = function (chunkNumber) {
					chunks[chunkNumber] = null;

					// get 20 rows for each column (bit silly, but avoid need for confusing pouchdb view)
					$q.all(_.map(columns, function (column) {
						return dbMeasurement.allDocs({
							startkey: column._id + ':' + (oldestTimestamp || '\uffff'), // FIXME: this doesn't work if user scroll straight down!
							endkey: column._id + ':',
							limit: chunkSize,
							descending: true
						});
					})).then(function (columnResults) {
						var ids = _.chain(columnResults).pluck('rows').flatten().map(function (measurement) {
							return {
								id: measurement.id,
								timestamp: Number(measurement.id.split(':')[1])
							};
						}).sortByOrder('timestamp', 'desc').slice(0, chunkSize).pluck('id').value();
						return dbMeasurement.getAll({ keys: ids });
					}).then(function (measurements) {
						oldestTimestamp = _.last(measurements)._id.split(':')[1];
						return _.map(measurements, function (measurement) {
							return _.extend({}, measurement, {
								column: _.findWhere(columns, { _id: measurement._id.split(':')[0] })
							});
						});
					}).then(function (measurements) {
						chunks[chunkNumber] = measurements;
					}).catch(function (err) {
						console.error(err);
					});
				};

			$scope.measurements = {
				getLength: function () { return measurementCount; },
				getItemAtIndex: function (index) {
					var chunkNumber = Math.floor(index / chunkSize),
						chunk = chunks[chunkNumber];
					if (chunk) {
						return chunk[index % chunkSize];
					} else if (chunk !== null) {
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
				var docs = _.chain($scope.data.selected).map(function (selected, key) {
					var parts = key.split(':::');
					return { id: parts[0], rev: parts[1], selected: selected };
				}).select(function (o) {
					return o.selected;
				}).map(function (o) {
					return { _id: o.id, _rev: o.rev, _deleted: true };
				}).value();
				dbMeasurement.bulkDocs(docs).then(function (result) {
					if (result.length === 0) { return; }
					var undoId = result[0].undoId;
					snack('The measurement has been deleted', 'Undo', function () {
						dbMeasurement.undo(undoId).then(function () {
							$state.go($state.current, {}, { reload: true });
						});
					});
					$state.go($state.current, {}, { reload: true });
				}).catch(function (err) {
					// TODO
					console.error(err);
				});
			};
		}
	});
});
