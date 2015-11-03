'use strict';

var angular = require('angular'),
	uuid = require('node-uuid'),
	_ = require('lodash'),
	moment = require('moment');

angular.module('traq').config(function ($stateProvider) {
	$stateProvider.state('traq-edit', {
		url: '/traq/:tid/edit?preset',
		templateUrl: 'traq-edit.html',
		resolve: {
			onboarded: function (dbConfig) { return dbConfig.exists('onboard'); },
			traq: function ($stateParams, dbTraq, presetTraqs) {
				if ($stateParams.tid === 'new') {
					var preset = _.findWhere(presetTraqs, { id: $stateParams.preset });
					return _.extend({
						_id: preset ? $stateParams.preset : uuid.v4(),
						preset: !!preset
					}, _.pick(preset, 'title', 'insights', 'charts'));
				} else {
					return dbTraq.get($stateParams.tid);
				}
			}
		},
		controller: function ($q, $scope, $state, dbTraq, dbColumn, dbConfig, dbMeasurement, presetColumns, snack, onboarded, traq) {
			$scope.isNew = $state.params.tid === 'new';
			$scope.onboarded = onboarded;
			$scope.traq = traq;

			$scope.save = function (attrs) {
				if (traq.preset) {
					var requireColumns = _.union(_.flattenDeep([
						_.pluck(traq.charts, 'requireColumns'),
						_.pluck(traq.insights, 'requireColumns')
					]));
					$q.all(_.map(requireColumns, function (columnName) {
						var presetColumn = _.findWhere(presetColumns, { name: columnName });
						return dbColumn.exists(presetColumn.name).then(function (exists) {
							if (exists) { return; }
							return dbColumn.put({
								_id: presetColumn.name,
								unit: _.findWhere(presetColumn.units, { default: true }).value // TODO: incorporate unit options
							}).then(function () {
								// TODO: only import fake data when debug mode is on
								if (presetColumn.fakeData) {
									return dbMeasurement.bulkDocs(_.map(presetColumn.fakeData(), function (measurement) {
										return _.extend({
											_id: columnName + ':' + moment(measurement.timestamp).format('YYYYMMDD[-]HHmmss') + ':' + uuid.v4().slice(0, 4)
										}, measurement);
									}));
								}
							});
						});
					})).then(function () {
						return dbTraq.put(traq);
					}).then(function () {
						console.log('saved...', attrs, traq);
						if (!onboarded) { return dbConfig.put({ _id: 'onboard' }); }
					}).then(function () {
						$state.go('home', { tid: traq._id });
					}).catch(function (err) {
						console.error('failed', err, traq); // TODO
					});
				}
			};

			$scope.remove = function () {
				console.log('attempting to remove', traq);
				dbTraq.remove(traq).then(function () {
					$state.go('home');
					snack('The traq has been deleted', 'Undo', function () {
						dbTraq.put(traq);
					});
				});
			};
		}
	});
});
