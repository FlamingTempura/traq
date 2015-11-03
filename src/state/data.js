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
		controller: function ($scope, $state, columns, measurements) {
			$scope.measurements = _.map(measurements, function (measurement) {
				return _.extend({}, measurement, {
					date: moment(measurement.timestamp).calendar(null, { sameElse: 'ddd D MMM YYYY [at] H:mm A' }),
					column: _.findWhere(columns, { _id: measurement._id.split(':')[0] })
				});
			});
		}
	});
});
