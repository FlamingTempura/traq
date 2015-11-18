'use strict';

var angular = require('angular'),
	uuid = require('node-uuid'),
	_ = require('lodash');

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
		controller: function ($q, $scope, $state, dbTraq, dbColumn, dbConfig, dbMeasurement, presetColumns, createPreset, snack, onboarded, traq) {
			$scope.isNew = $state.params.tid === 'new';
			$scope.onboarded = onboarded;
			$scope.traq = traq;

			$scope.save = function (attrs) {
				if (traq.preset) {
					createPreset(traq._id).then(function () {
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
