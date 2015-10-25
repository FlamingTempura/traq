'use strict';

var angular = require('angular'),
	d3 = require('d3'),
	_ = require('lodash');

var spans = {
	day: { ticks: d3.time.hour, tickFormat: d3.time.format('%H:%M') },
	week: { ticks: d3.time.day, tickFormat: d3.time.format('%a') },
	month: { ticks: d3.time.week, tickFormat: d3.time.format('%a') },
	year: { ticks: d3.time.month, tickFormat: d3.time.format('%b') }
};

var margin = { top: 10, right: 28, bottom: 30, left: 36 };

angular.module('traq')
	.config(function (chartTypes) {
		chartTypes.push({
			id: 'line',
			title: 'Line chart',
			options: {
				smooth: { label: 'Smooth line', type: Boolean },
				points: { label: 'Draw points', type: Boolean }
			},
			create: function (element) {
				var plotZeros, columns, rows, span, width, height,

					x = d3.time.scale(),
					yLeft = d3.scale.linear(),
					yRight = d3.scale.linear(),

					xAxis = d3.svg.axis()
						.scale(x)
						.orient('bottom'),

					yAxisLeft = d3.svg.axis()
						.scale(yLeft)
						.orient('left')
						.ticks(6),

					yAxisRight = d3.svg.axis()
						.scale(yRight)
						.orient('right')
						.ticks(6),

					svg = d3.select(element).append('svg'),
					cht = svg.append('g');

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

				var update = function () {
					if (!rows) { return; }

					var leftColumns = _.where(columns, { axis: 'left' }),
						rightColumns = _.where(columns, { axis: 'right' }),
						leftLabel = leftColumns[0] || {},
						rightLabel = rightColumns[0] || {},
						allYLeft = _.chain(leftColumns).map(function (column) {
							return _.pluck(rows, column.id);
						}).reject(function (val) {
							return !plotZeros && val === 0;
						}).flatten().value(),
						allYRight = _.chain(rightColumns).map(function (column) {
							return _.pluck(rows, column.id);
						}).reject(function (val) {
							return !plotZeros && val === 0;
						}).flatten().value();

					x.domain(d3.extent(rows, function (d) { return d.date; }));
					yLeft.domain(d3.extent(allYLeft, function (d) { return d; }));
					yRight.domain(d3.extent(allYRight, function (d) { return d; }));

					if (span) {
						xAxis.ticks(spans[span].ticks)
							.tickFormat(spans[span].tickFormat);
					} else {
						xAxis.ticks(7)
							.tickFormat(d3.time.format('%a'));
					}

					cht.selectAll('.x.axis')
						.call(xAxis);

					cht.selectAll('.y.axis.left')
						.style('visibility', leftColumns.length > 0)
						.text(leftLabel.name + ' (' + leftLabel.unit + ')')
						.call(yAxisLeft);

					cht.selectAll('.y.axis.right')
						.style('visibility', rightColumns.length > 0)
						.text(rightLabel.name + ' (' + rightLabel.unit + ')')
						.call(yAxisRight);

					cht.selectAll('.x.gridline').data(yLeft.ticks(6)).enter()
						.append('line')
						.attr('class', 'x gridline')
						.attr('x1', 0)
						.attr('x2', width)
						.attr('y1', function (d) { return yLeft(d); })
						.attr('y2', function (d) { return yLeft(d); });

					cht.selectAll('.line')
						.remove();

					_.each(columns, function (column) {
						var y = column.axis === 'left' ? yLeft : yRight,
							line = d3.svg.line()
								.interpolate('monotone')
								.x(function (d) { return x(d.date); })
								.y(function (d) { return y(d[column.id]); });

						cht.append('path')
							.datum(_.reject(rows, function (row) {
								return isNaN(row[column.id]) || !plotZeros && row[column.id] === 0;
							}))
							.attr('class', 'line')
							.attr('stroke', column.color)
							.attr('d', line);

						cht.selectAll('.point.p' + column.id)
							.data(_.reject(rows, function (row) {
								return isNaN(row[column.id]) || !plotZeros && row[column.id] === 0;
							}))
							.enter()
							.append('svg:circle')
							.attr('class', 'point p' + column.id)
							.attr('stroke', column.color)
							.attr('r', 4)
							.attr('cx', function (d) { return x(d.date); })
							.attr('cy', function (d) { return y(d[column.id]); });
					});
				};

				this.on('data', function (_columns, _rows, _span) {
					columns = _columns;
					rows = _rows;
					span = _span;
					update();
				});

				this.on('plotZeros', function (_plotZeros) {
					plotZeros = _plotZeros;
					update();
				});

				this.on('resize', function (_width, _height) {
					width = _width - margin.left - margin.right;
					height = _height - margin.top - margin.bottom - 10;

					x.range([0, width]);
					yLeft.range([height, 0]);
					yRight.range([height, 0]);

					svg.attr('width', width + margin.left + margin.right)
						.attr('height', height + margin.top + margin.bottom);

					cht.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

					cht.selectAll('.x.axis')
						.attr('transform', 'translate(0,' + height + ')');

					cht.selectAll('.y.axis.right')
						.attr('transform', 'translate(' + width + ' ,0)');

					cht.selectAll('.y.axis.left');

					update();
				});

				// FIXME: destroy event bindings
			}
		});
	});
