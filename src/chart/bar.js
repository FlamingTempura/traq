'use strict';

var angular = require('angular'),
	d3 = require('d3'),
	_ = require('lodash');

angular.module('traq')
	.directive('barChart', function () {
		return {
			restrict: 'E',
			replace: true,
			scope: {
				traq: '=',
				chart: '=',
				rows: '='
			},
			template: '<div flex layout="row"><div flex></div></div>',
			link: function (scope, element) {
				var chart, columns, rows;

				var container = element.children()[0];

				var margin = { top: 20, right: 50, bottom: 30, left: 50 };

				var x = d3.time.scale();
				var yLeft = d3.scale.linear();
				var yRight = d3.scale.linear();

				var xAxis = d3.svg.axis()
					.scale(x)
					.ticks(d3.time.day)
					.tickFormat(d3.time.format('%a'))
					.orient('bottom');

				var yAxisLeft = d3.svg.axis()
					.scale(yLeft)
					.orient('left');

				var yAxisRight = d3.svg.axis()
					.scale(yRight)
					.orient('right');

				var svg = d3.select(container).append('svg');
				var cht = svg.append('g');

				cht.append('g')
					.attr('class', 'x axis');

				cht.append('g')
					.attr('class', 'y axis left')
					.append('text')
					.attr('transform', 'rotate(-90)')
					.attr('y', 6)
					.attr('dy', '.71em')
					.style('text-anchor', 'end');

				cht.append('g')
					.attr('class', 'y axis right')
					.append('text')
					.attr('transform', 'rotate(-90)')
					.attr('y', 6)
					.attr('dy', '-.71em')
					.style('text-anchor', 'end');

				var resize = function () {
					var width = container.offsetWidth - margin.left - margin.right,
						height = container.offsetHeight - margin.top - margin.bottom - 10;

					console.log('w', width, 'h', height);

					x.range([0, width]);
					yLeft.range([height, 0]);
					yRight.range([height, 0]);

					var barPad = 1,
						barWidth = width / rows.length - barPad;

					svg.attr('width', width + margin.left + margin.right)
						.attr('height', height + margin.top + margin.bottom);

					cht.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

					cht.selectAll('.x.axis')
						.attr('transform', 'translate(0,' + height + ')')
						.call(xAxis);

					cht.selectAll('.y.axis.right')
						.attr('transform', 'translate(' + width + ' ,0)')
						.call(yAxisRight);

					cht.selectAll('.y.axis.left')
						.call(yAxisLeft);

					cht.selectAll('.line')
						.remove();

					_.each(columns, function (column) {
						var y = column.axis === 'left' ? yLeft : yRight;

						cht.selectAll('.bar.r' + column.id)
							.attr('x', function (d) { return barPad + x(d.date) - barWidth / 2; })
							.attr('width', barWidth)
							.attr('y', function (d) { return y(d[column.id]); })
							.attr('height', function (d) { return height - y(d[column.id]); });
					});
				};

				var plot = function () {
					if (!scope.chart || !scope.traq || !scope.rows) { return; }
					rows = _.sortBy(scope.rows, 'date');
					chart = scope.chart;
					columns = _.chain(scope.traq.columns).map(function (column) {
						return _.extend({}, column, chart.columns[column.id]);
					}).where({ show: true }).value();

					var leftColumns = _.where(columns, { axis: 'left' }),
						rightColumns = _.where(columns, { axis: 'right' }),
						leftLabel = leftColumns[0] || {},
						rightLabel = rightColumns[0] || {},
						allYLeft = _.chain(leftColumns).map(function (column) {
							return _.pluck(rows, column.id);
						}).flatten().value(),
						allYRight = _.chain(rightColumns).map(function (column) {
							return _.pluck(rows, column.id);
						}).flatten().value();

					x.domain(d3.extent(rows, function (d) { return d.date; }));
					yLeft.domain(d3.extent(allYLeft, function (d) { return d; }));
					yRight.domain(d3.extent(allYRight, function (d) { return d; }));

					cht.selectAll('.y.axis.left')
						.style('visibility', leftColumns.length > 0)
						.text(leftLabel.name + ' (' + leftLabel.unit + ')');

					cht.selectAll('.y.axis.right')
						.style('visibility', rightColumns.length > 0)
						.text(rightLabel.name + ' (' + rightLabel.unit + ')');

					_.each(columns, function (column) {
						cht.selectAll('.bar.r' + column.id)
							.data(rows)
							.enter()
							.append('svg:rect')
							.attr('class', 'bar r' + column.id)
							.attr('fill', column.color);

					});

					resize();
				};

				angular.element(window).on('resize', resize);
				scope.$watch('traq + chart + rows', plot);
			}
		};
	});
