'use strict';

var angular = require('angular'),
	_ = require('lodash'),
	d3 = require('d3'),
	moment = require('moment');

var tipWidth = 130,
	tipHeight = 60,
	tipPointerSize = 10;

angular.module('traq')
	.constant('charts', [])
	.constant('spans', {
		'1d': { duration: 24 * 60 * 60 * 1000, ticks: undefined, tickFormat: d3.time.format('%H:%M') },
		'1w': { duration: 7 * 24 * 60 * 60 * 1000, ticks: d3.time.day, tickFormat: d3.time.format('%a') },
		'1m': { duration: 30 * 24 * 60 * 60 * 1000, ticks: d3.time.monday, tickFormat: d3.time.format('%b %d') },
		'3m': { duration: 3 * 30 * 24 * 60 * 60 * 1000, ticks: undefined, tickFormat: d3.time.format('%b %d') },
		'1y': { duration: 365 * 24 * 60 * 60 * 1000, ticks: undefined, tickFormat: d3.time.format('%b %d') }
	})
	.directive('chart', function ($log, charts, colors) {
		$log = $log.instance('chart', 'orange');
		return {
			restrict: 'E',
			replace: true,
			scope: { traq: '=', chart: '=', data: '=', span: '=' },
			template: '<div flex></div>',
			link: function (scope, element) {
				element = element[0];
				var chart, columns,
					rand = Math.round(Math.random() * 1000000000), // random number to prevent conflicting id's when multiple charts (e.g. when switching state)
					svg = d3.select(element).append('svg'),
					defs = svg.append('defs'),
					cht = svg.append('g').attr('class', 'cht'),
					tipG = svg.append('g')
						.attr('class', 'tip');

				tipG.append('rect')
					.attr('class', 'bg')
					.attr('width', tipWidth)
					.attr('height', tipHeight);

				var tipY = tipHeight - Math.sqrt(2 * Math.pow(tipPointerSize / 2, 2));
				tipG.append('rect')
					.attr('class', 'pointer')
					.attr('width', tipPointerSize)
					.attr('height', tipPointerSize)
					.attr('transform', 'translate(' + tipWidth / 2 + ',' + tipY + ') rotate(45)');

				var tipTextValue = tipG.append('text')
						.attr('class', 'tip-value')
						.attr('x', tipWidth / 2)
						.attr('y', 28),
					tipTextDate = tipG.append('text')
						.attr('class', 'tip-date')
						.attr('x', tipWidth / 2)
						.attr('y', 47);

				var tip = function (x, y, date, value) {
					tipTextDate.text(date);
					tipTextValue.text(value);
					tipG.attr('visibility', 'visible')
						.attr('transform', 'translate(' + (x - tipWidth / 2) + ',' +
							(y - tipHeight - tipPointerSize) + ')');
				};

				var resize = function () {
					svg.attr('width', element.offsetWidth)
						.attr('height', element.offsetHeight);

					chart.resize(element.offsetWidth, element.offsetHeight);
					update(columns, scope.span);
					chart.update(columns, scope.span);
				};

				var update = function () {
					tipG.attr('visibility', 'hidden');

					defs.selectAll('.grad').remove();

					_.each(columns, function (column) {

						var gradient = defs.append('svg:linearGradient')
							.attr('id', 'grad' + column.safeName + rand)
							.attr('class', 'grad')
							.attr('x1', '0%')
							.attr('y1', '0%')
							.attr('x2', '0%')
							.attr('y2', '100%')
							.attr('spreadMethod', 'pad')
							.attr('gradientUnits', 'userSpaceOnUse');
						gradient.append('svg:stop')
							.attr('offset', '0%')
							.attr('stop-color', column.color)
							.attr('stop-opacity', 1);
						gradient.append('svg:stop')
							.attr('offset', '100%')
							.attr('stop-color', colors.next(column.color, 2))
							.attr('stop-opacity', 1);
					});
				};

				scope.$watch('chart', function () {
					$log.log('$watch chart', scope.chart);
					if (!scope.chart) { return; }
					var chartType = _.findWhere(charts, { id: scope.chart.type });
					// TODO: chart.destroy()
					chart = new chartType.Chart(svg, rand, tip);
					requestAnimationFrame(function () {
						if (element.offsetWidth === 0) { return; }
						resize();
					});
				});

				scope.$watch('data', function () {
					if (!chart || !scope.data) { return; }

					columns = _.map(scope.chart.columns, function (column) {
						column = _.extend({}, column, _.findWhere(scope.data, { name: column.name }));
						
						if (column.measurements.length === 0) { return column; }

						if (column.interval && column.interval.duration === 'day') {
							column.measurements = _.chain(column.measurements).groupBy(function (measurement) {
								return measurement._id.split(':')[1].slice(0, 8); // group by day
							}).map(function (group, date) {
								return {
									timestamp: moment(date, 'YYYYMMDD').toDate(),
									value: _.reduce(group, column.interval.aggregate, 0)
								};
							}).value();
						}

						column.measurements.unshift(_.extend({ first: true }, column.measurements.shift()));
						column.measurements.push(_.extend({ last: true }, column.measurements.pop()));

						if (column.forecast && column.forecast.before) {
							column.measurements.unshift({
								forecast: 'before',
								timestamp: new Date(0),
								value: _.first(column.measurements).value
							});
						}

						if (column.forecast && column.forecast.after) {
							column.measurements.push({
								forecast: 'after',
								timestamp: new Date(),
								value: _.last(column.measurements).value
							});
						}

						return column;
					});

					update(columns, scope.span);
					chart.update(columns, scope.span);
				});

				angular.element(window).on('resize', function () {
					resize();
				});

				scope.$on('$destroy', function () {
					// TODO chart.destroy();
				});
			}
		};
	});
