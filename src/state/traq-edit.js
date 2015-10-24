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
			traq: function ($stateParams, dbTraq, presets) {
				if ($stateParams.tid === 'new') {
					var preset = _.findWhere(presets.presets, { id: $stateParams.preset }) || {},
						traq = _.extend({
							_id: 'tbl' + uuid.v4(),
							preset: $stateParams.preset,
							columns: []
						}, preset.defaults);
					return traq;
				} else {
					return dbTraq.get($stateParams.tid);
				}
			},
			charts: function (dbChart, traq) {
				return dbChart.getAll({
					startkey: traq._id + ':',
					endkey: traq._id + ':\uffff'
				});
			}
		},
		controller: function ($q, $scope, $state, dbTraq, dbChart, dbConfig, snack, presets, onboarded, traq, charts) {
			$scope.isNew = $state.params.tid === 'new';
			$scope.traq = traq;
			$scope.onboarded = onboarded;
			$scope.preset = _.findWhere(presets.presets, { id: traq.preset });
			$scope.charts = charts;

			$scope.save = function (attrs) {
				if ($scope.preset) {
					$scope.preset.reconstructTraq(traq); // create columns from options etc
				}
				dbTraq.put(_.extend(traq, attrs)).then(function (res) {
					traq = $scope.traq = _.extend(traq, { _rev: res.rev }); // HACK to prevent 409
					if ($scope.isNew) {
						return $q.all(_.map($scope.preset.charts, function (chart) {
							return dbChart.put(_.extend({}, chart, {
								_id: traq._id + ':cht' + uuid.v4()
							}));
						}));
					}
				}).then(function () {
					console.log('saved...', attrs, traq);
					if (!onboarded) {
						return dbConfig.put({ _id: 'onboard' }).then(function () {
							$state.go('home', { tid: traq._id });
						});
					}
				}).catch(function (err) {
					console.error('failed', err, traq); // TODO
				});
			};

			$scope.remove = function () {
				console.log('attempting to remove', traq)
				dbTraq.remove(traq).then(function () {
					// TODO: delete all rows and charts
					$state.go('home');
					snack('The traq has been deleted', 'Undo', function () {
						dbTraq.put(traq);
					});
				});
			};
		}
	});
});
