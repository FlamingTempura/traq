'use strict';

var angular = require('angular'),
	_ = require('lodash'),
	uuid = require('node-uuid');

var colors = [
		{ hex: '#BB0AFA', name: 'Neon purple' },
		{ hex: '#ED009A', name: 'Brilliant Pink' },
		{ hex: '#F22613', name: 'Pomegranate' },
		{ hex: '#F9690E', name: 'Ecstasy' },
		{ hex: '#F89406', name: 'California' },
		{ hex: '#F4D03F', name: 'Safron' },
		{ hex: '#87D37C', name: 'Gossip' },
		{ hex: '#03C9A9', name: 'Caribbean Green' },
		{ hex: '#19B5FE', name: 'Dodger Blue' },
		{ hex: '#81CFE0', name: 'Spray' },
		{ hex: '#ECF0F1', name: 'Porcelain' }
	],
	colorDefault = [3, 1, 8, 9, 6, 5, 4, 2, 0, 7, 10],
	chartDefaults = function (traq, chart) {
		chart = _.extend({
			plotZeros: true,
			columns: {}
		}, chart);
		_.each(traq.columns, function (column, i) {
			if (!chart.columns[column.id]) {
				chart.columns[column.id] = {};
			}
			_.defaults(chart.columns[column.id], {
				color: colors[colorDefault[i % colorDefault.length]].hex,
				axis: i === 0 ? 'left' : 'right',
				show: i === 0
			});
		});
		return chart;
	};

angular.module('traq').config(function ($stateProvider) {
	$stateProvider.state('chart-edit', {
		url: '/traq/:tid/chart/:cid/edit',
		templateUrl: 'chart-edit.html',
		resolve: {
			traq: function ($stateParams, dbTraq) { return dbTraq.get($stateParams.tid); },
			chart: function ($stateParams, dbChart, traq) {
				if ($stateParams.cid === 'new') {
					return chartDefaults(traq, { _id: traq._id + ':cht' + uuid.v4() });
				} else {
					return dbChart.get($stateParams.cid);
				}
			}
		},
		controller: function ($scope, $state, dbChart, traq, chart) {
			$scope.traq = traq;
			$scope.chart = chart;
			$scope.colors = colors;
			$scope.isNew = $state.params.cid === 'new';

			$scope.save = function () {
				dbChart.put($scope.chart).then(function () {
					console.log('saved!', $scope.chart);
					window.history.back();
				}).catch(function (err) {
					console.error('failed', err);
				});
			};
		}
	});
});
