'use strict';

// CSV and TSV

var angular = require('angular'),
	_ = require('lodash'),
	moment = require('moment'),
	uuid = require('node-uuid');

angular.module('traq').service('fakeTransport', function (dbMeasurement) {
	var rand1 = function (numberOfMeasurements, timespan, min, minVariance, variance, decimals) {
		return function () {
			var init = min - minVariance + Math.round(Math.random() * minVariance * 2),
				daysApart = timespan / numberOfMeasurements,
				day = 0;
			return _.times(numberOfMeasurements, function (i) {
				day += Math.round(Math.random() * daysApart);
				return {
					timestamp: moment()
						.subtract(day, 'days')
						.hour(Math.round(Math.random() * 24))
						.minute(Math.round(Math.random() * 60))
						.second(Math.round(Math.random() * 60))
						.toDate(),
					value: init - variance + Math.round(Math.random() * Math.pow(10, decimals) * variance * 2) / Math.pow(10, decimals)
				};
			});
		};
	};

	var generators = {
		'COLUMN_WEIGHT': rand1(28, 365, 70, 30, 10, 1),
		'Heart rate': rand1(250, 365, 60, 20, 30, 0),
		'Hours slept': rand1(280, 365, 6.5, 2, 3, 1),
		'Height': function () {
			return [{
				timestamp: new Date(),
				value: 1 + Math.round(Math.random() * 100) / 100
			}];
		}
	};

	var generate = function (columnName) {
		var measurements = generators[columnName]();
		console.log('importing', columnName, measurements);
		return dbMeasurement.bulkDocs(_.map(measurements, function (measurement) {
			return _.extend({
				_id: columnName + ':' + moment(measurement.timestamp).format('YYYYMMDD[-]HHmmss') + ':' + uuid.v4().slice(0, 4)
			}, measurement);
		}));
	};

	return {
		generators: generators,
		generate: generate
	};
}).config(function ($stateProvider) {
	$stateProvider.state('import-fake', {
		url: '/import/fake',
		templateUrl: 'import-fake.html',
		import: {
			title: 'Fake data',
			icon: 'img/icons/moves.svg'
		},
		controller: function ($scope, $state, fakeTransport, snack, dbMeasurement) {
			$scope.importColumns = _.map(fakeTransport.generators, function (generator, key) {
				return { key: key, selected: false };
			});
			$scope.import = function () {
				_.each($scope.importColumns, function (importColumn) {
					if (importColumn.selected) {
						fakeTransport.generate(importColumn.key).then(function (result) {
							var undoId = result[0].undoId;
							snack('Fake data has been imported', 'Undo', function () {
								dbMeasurement.undo(undoId);
								$state.go($state.current, {}, { reload: true }); // HACK: home page will need reloading to refresh data
							});
						});
					}
				});
			};
		}
	});
});


