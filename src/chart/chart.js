'use strict';

var angular = require('angular'),
	_ = require('lodash'),
	d3 = require('d3');

angular.module('traq')
	.constant('chartTypes', [])
	.constant('spans', {
		'1d': { duration: 24 * 60 * 60 * 1000, ticks: undefined, tickFormat: d3.time.format('%H:%M') },
		'1w': { duration: 7 * 24 * 60 * 60 * 1000, ticks: d3.time.day, tickFormat: d3.time.format('%a') },
		'1m': { duration: 30 * 24 * 60 * 60 * 1000, ticks: d3.time.monday, tickFormat: d3.time.format('%b %d') },
		'3m': { duration: 3 * 30 * 24 * 60 * 60 * 1000, ticks: undefined, tickFormat: d3.time.format('%b %d') },
		'1y': { duration: 365 * 24 * 60 * 60 * 1000, ticks: undefined, tickFormat: d3.time.format('%b %d') }
	})
	.directive('chart', function (chartTypes, spans) {
		return {
			restrict: 'E',
			replace: true,
			scope: {
				traq: '=',
				chart: '=',
				data: '=',
				span: '='
			},
			template: '<div flex layout="row"><div flex></div></div>',
			link: function (scope, element) {
				var chart;
				element = element.children()[0];

				scope.$watch('chart', function () {
					console.log('CHART', scope.chart, element)
					if (!scope.chart) { return; }
					var chartType = _.findWhere(chartTypes, { id: scope.chart.type });
					// TODO: chart.destroy()
					chart = new chartType.Chart(element);
					var fixSize = function () {
						chart.resize(element.offsetWidth, element.offsetHeight);
					};
					fixSize();
					setTimeout(fixSize, 400); // FIXME
					setTimeout(fixSize, 1000); // FIXME
					setTimeout(fixSize, 2000); // FIXME
					setTimeout(fixSize, 4000); // FIXME
				});

				scope.$watch('data + span', function () {
					if (!chart || !scope.data) { return; }
					var columns = _.map(scope.chart.columns, function (column) {
							return _.extend({}, column, _.findWhere(scope.data, { name: column.name }));
						}),
						rows = _.chain(columns).map(function (column) {
							return column.measurements.concat([
								_.extend({ last: true }, _.last(column.measurements)),
								{
									uuid: _.last(column.measurements).columnId + ':forecast',
									columnId: _.last(column.measurements).columnId,
									forecast: true,
									timestamp: new Date(),
									value: _.last(column.measurements).value
								}
							]);
						}).flatten().map(function (measurement) {
							var obj = _.clone(measurement);
							obj[measurement.columnId] = measurement.value;
							return obj;
						}).value();
					//console.log(chart, columns, rows);
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
