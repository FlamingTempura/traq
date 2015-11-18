'use strict';

var angular = require('angular'),
	_ = require('lodash'),
	d3 = require('d3');

angular.module('traq')
	.constant('charts', [])
	.constant('spans', {
		'1d': { duration: 24 * 60 * 60 * 1000, ticks: undefined, tickFormat: d3.time.format('%H:%M') },
		'1w': { duration: 7 * 24 * 60 * 60 * 1000, ticks: d3.time.day, tickFormat: d3.time.format('%a') },
		'1m': { duration: 30 * 24 * 60 * 60 * 1000, ticks: d3.time.monday, tickFormat: d3.time.format('%b %d') },
		'3m': { duration: 3 * 30 * 24 * 60 * 60 * 1000, ticks: undefined, tickFormat: d3.time.format('%b %d') },
		'1y': { duration: 365 * 24 * 60 * 60 * 1000, ticks: undefined, tickFormat: d3.time.format('%b %d') }
	})
	.directive('chart', function ($log, charts) {
		$log = $log.instance('chart', 'orange');
		return {
			restrict: 'E',
			replace: true,
			scope: {
				traq: '=',
				chart: '=',
				data: '=',
				span: '='
			},
			template: '<div flex></div>',
			link: function (scope, element) {
				var chart;
				element = element[0];

				scope.$watch('chart', function () {
					$log.log('$watch chart', scope.chart);
					if (!scope.chart) { return; }
					var chartType = _.findWhere(charts, { id: scope.chart.type });
					// TODO: chart.destroy()
					chart = new chartType.Chart(element);
					var fixSize = function () {
						requestAnimationFrame(function () {
							if (element.offsetWidth === 0) { return; }
							chart.resize(element.offsetWidth, element.offsetHeight);
						});
					};
					fixSize();
				});

				scope.$watch('data', function () {
					$log.log('$watch data', scope.data)
					if (!chart || !scope.data) { return; }
					var columns = _.map(scope.chart.columns, function (column) {
							return _.extend({}, column, _.findWhere(scope.data, { name: column.name }));
						}),
						rows = _.chain(columns).map(function (column) {
							if (column.measurements.length === 0) { return; }
							var measurements = _.clone(column.measurements);
							measurements.unshift(_.extend({ first: true }, measurements.shift()));
							measurements.push(_.extend({ last: true }, measurements.pop()));
							
							if (column.forecast && column.forecast.before) {
								measurements.unshift({
									uuid: column.name + ':before',
									columnId: column.name,
									forecast: 'before',
									timestamp: new Date(0),
									value: _.first(measurements).value
								});
							}
							if (column.forecast && column.forecast.after) {
								measurements.push({
									uuid: column.name + ':after',
									columnId: column.name,
									forecast: 'after',
									timestamp: new Date(),
									value: _.last(measurements).value
								});
							}
							return measurements;
						}).flatten().map(function (measurement) {
							var obj = _.clone(measurement);
							obj[measurement.columnId] = measurement.value;
							return obj;
						}).value();
					$log.log(chart, columns, rows);
					chart.data(columns, rows, scope.span);
				});
				angular.element(window).on('resize', function () {
					chart.resize(element.offsetWidth, element.offsetHeight);
				});
				scope.$on('$destroy', function () {
					// TODO chart.destroy();
				});
			}
		};
	});
