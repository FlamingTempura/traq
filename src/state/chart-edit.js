'use strict';

var angular = require('angular'),
	_ = require('lodash'),
	uuid = require('node-uuid');

angular.module('traq').config(function ($stateProvider) {
	$stateProvider.state('chart-edit', {
		url: '/traq/:tid/chart/:cid/edit',
		templateUrl: 'chart-edit.html',
		controller: function ($scope, $state, dbTraq, dbChart) {
			$scope.colors = [
				{ hex: '#663399', name: 'Rebecca' },
				{ hex: '#D91E18', name: 'Thunderbird' },
				{ hex: '#F9690E', name: 'Ecstasy' },
				{ hex: '#F89406', name: 'California' },
				{ hex: '#F9BF3B', name: 'Sandstorm' },
				{ hex: '#87D37C', name: 'Gossip' },
				{ hex: '#03C9A9', name: 'Caribbean Green' },
				{ hex: '#19B5FE', name: 'Dodger Blue' },
				{ hex: '#446CB3', name: 'San Marino' },
				{ hex: '#6C7A89', name: 'Lynch' }
			];
			var colorDefault = [2, 1, 7, 8, 5, 4, 3, 9, 0, 6];
			var defaults = function (traq, chart) {
				chart = _.extend({
					plotZeros: true,
					columns: {}
				}, chart);
				_.each(traq.columns, function (column, i) {
					if (!chart.columns[column.id]) {
						chart.columns[column.id] = {};
					}
					_.defaults(chart.columns[column.id], {
						color: $scope.colors[colorDefault[i % colorDefault.length]].hex,
						axis: i === 0 ? 'left' : 'right',
						show: i === 0
					});
				});
				return chart;
			};
			dbTraq.get($state.params.tid).then(function (traq) {
				console.log('get traq', traq);
				$scope.traq = traq;
			}).catch(function (err) {
				console.log('failed', err);
			}).then(function () {
				$scope.isNew = $state.params.cid === 'new';
				if ($scope.isNew) {
					$scope.chart = defaults($scope.traq, {
						_id: $scope.traq._id + ':cht' + uuid.v4()
					});
				} else {
					dbChart.get($state.params.cid).then(function (chart) {
						console.log('got chart', chart);
						$scope.chart = defaults($scope.traq, chart);
					}).catch(function (err) {
						console.error('failed', err);
					});
				}
			});

			$scope.save = function () {
				dbChart.put($scope.chart).then(function () {
					console.log('saved!', $scope.chart);
					$state.go('chart-view', { tid: $scope.traq._id, cid: $scope.chart._id });
				}).catch(function (err) {
					console.error('failed', err);
				});
			};
		}
	});
});
