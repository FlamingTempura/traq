'use strict';

var angular = require('angular'),
	d3 = require('d3'),
	_ = require('lodash');

var margin = { top: 6, right: 28, bottom: 30, left: 36 };

angular.module('traq').config(function (charts, colors, spans) {
	
	charts.push({
		id: 'line',
		title: 'Line chart',
		options: {
			smooth: { label: 'Smooth line', type: Boolean },
			points: { label: 'Draw points', type: Boolean }
		},
		Chart: function (element) {
			var columns, rows, span, width, height,

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
				defs = svg.append('svg:defs'),
				cht = svg.append('g'),
				clip = defs.append('clipPath')
					.attr('id', 'clip')
					.append('rect');

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
				if (!rows || !width) { return; }

				var leftColumns = _.where(columns, { axis: 'left' }),
					rightColumns = _.where(columns, { axis: 'right' }),
					leftLabel = leftColumns[0] || {},
					rightLabel = rightColumns[0] || {},
					allYLeft = _.chain(leftColumns).map(function (column) {
						return _.pluck(rows, column.name);
					}).flatten().value(),
					allYRight = _.chain(rightColumns).map(function (column) {
						return _.pluck(rows, column.name);
					}).flatten().value();

				x.domain([new Date(Date.now() - spans[span].duration), new Date()]);

				var leftExtent = d3.extent(allYLeft, function (d) { return d; });
				leftExtent[0] -= (leftExtent[1] - leftExtent[0]) / 5;
				leftExtent[1] += (leftExtent[1] - leftExtent[0]) / 5;
				yLeft.domain(leftExtent).nice();
				yRight.domain(d3.extent(allYRight, function (d) { return d; }));

				if (span) {
					xAxis.ticks(spans[span].ticks || 7)
						.tickFormat(spans[span].tickFormat);
				} else {
					xAxis.ticks(7)
						.tickFormat(d3.time.format('%a'));
				}

				cht.selectAll('.line,.area').remove();
				defs.selectAll('.grad').remove();
				cht.selectAll('.point').remove();
				cht.selectAll('.gridline').remove();

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

				_.each(columns, function (column) {

					var gradient = defs.append('svg:linearGradient')
						.attr('id', 'grad' + column.safeName)
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

					var y = column.axis === 'left' ? yLeft : yRight,
						area = d3.svg.area()
							.x(function (d) { return x(d.timestamp); })
							.y0(height)
							.y1(function (d) { return y(d[column.name]); }),
						line = d3.svg.line()
							//.interpolate('monotone')
							.x(function (d) { return x(d.timestamp); })
							.y(function (d) { return y(d[column.name]); });

					cht.append('path')
						.datum(_.select(rows, function (row) {
							return !row.forecast;
						}))
						.attr('class', 'line')
						.attr('stroke', 'url(#grad' + column.safeName + ')')
						.attr('d', line)
						.attr('clip-path', 'url(#clip)');

					cht.append('path')
						.datum(_.select(rows, function (row) {
							return row.last || row.forecast;
						}))
						.attr('class', 'line forecast')
						.attr('stroke', 'url(#grad' + column.safeName + ')')
						.attr('d', line)
						.attr('clip-path', 'url(#clip)');

					cht.append('path')
						.datum(rows)
						.attr('class', 'area')
						.attr('fill', 'url(#grad' + column.safeName + ')')
						.attr('d', area)
						.attr('clip-path', 'url(#clip)');

					cht.selectAll('.point.p' + column.safeName)
						.data(_.select(rows, function (row) {
							return !row.forecast;
						}))
						.enter()
						.append('svg:circle')
						.attr('class', 'point p' + column.safeName)
						.attr('stroke', 'url(#grad' + column.safeName + ')')
						.attr('r', 3)
						.attr('cx', function (d) { return x(d.timestamp); })
						.attr('cy', function (d) { return y(d[column.name]); })
						.attr('clip-path', 'url(#clip)');
				});
			};

			this.data = function (_columns, _rows, _span) {
				columns = _columns;
				rows = _rows;
				span = _span;
				update();
			};

			this.resize = function (_width, _height) {
				console.log('size', _width, _height)
				width = _width - margin.left - margin.right;
				height = _height - margin.top - margin.bottom - 10;

				x.range([0, width]);
				yLeft.range([height, 0]);
				yRight.range([height, 0]);

				svg.attr('width', width + margin.left + margin.right)
					.attr('height', height + margin.top + margin.bottom);

				clip.attr('width', width + 5) // 5 pixels to show any points on the end
					.attr('height', height);

				cht.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

				cht.selectAll('.x.axis')
					.attr('transform', 'translate(0,' + height + ')');

				cht.selectAll('.y.axis.right')
					.attr('transform', 'translate(' + width + ' ,0)');

				cht.selectAll('.y.axis.left');

				update();
			};

			// FIXME: destroy event bindings
		}
	});
});
