'use strict';

var angular = require('angular'),
	d3 = require('d3'),
	_ = require('lodash'),
	moment = require('moment');

var margin = { top: 6, right: 28, bottom: 30, left: 36 },
	tipClickSize = 30,
	tipWidth = 130,
	tipHeight = 60,
	tipPointerSize = 10;

angular.module('traq').config(function (charts, colors, spans) {
	charts.push({
		id: 'line',
		title: 'Line chart',
		options: {
			smooth: { label: 'Smooth line', type: Boolean },
			points: { label: 'Draw points', type: Boolean }
		},
		Chart: function (element) {
			var rand = Math.round(Math.random() * 1000000000), // random number to prevent conflicting id's when multiple charts (e.g. when switching state)
				columns, rows, span, width, height,

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
					.attr('id', 'clip' + rand)
					.append('rect'),
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
					.attr('transform', 'translate(' + (margin.left + x - tipWidth / 2) + ',' +
						(margin.top + y - tipHeight - tipPointerSize) + ')');
			};

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
				leftExtent[0] -= (leftExtent[1] - leftExtent[0]) / 5 + leftExtent[0] / 20;
				leftExtent[1] += (leftExtent[1] - leftExtent[0]) / 5 + leftExtent[0] / 20;
				yLeft.domain(leftExtent).nice();
				yRight.domain(d3.extent(allYRight, function (d) { return d; }));

				if (span) {
					xAxis.ticks(spans[span].ticks || 7)
						.tickFormat(spans[span].tickFormat);
				} else {
					xAxis.ticks(7)
						.tickFormat(d3.time.format('%a'));
				}

				tipG.attr('visibility', 'hidden');
				cht.selectAll('.line,.area').remove();
				defs.selectAll('.grad').remove();
				cht.selectAll('.point').remove();
				cht.selectAll('.clickpoint').remove();
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
							return !row.forecast && !isNaN(row[column.name]);
						}))
						.attr('class', 'line')
						.attr('stroke', 'url(#grad' + column.safeName + rand + ')')
						.attr('d', line)
						.attr('clip-path', 'url(#clip' + rand + ')');

					cht.append('path')
						.datum(_.select(rows, function (row) {
							return !isNaN(row[column.name]);
						}))
						.attr('class', 'area')
						.attr('fill', 'url(#grad' + column.safeName + rand + ')')
						.attr('d', area)
						.attr('clip-path', 'url(#clip' + rand + ')');

					if (column.forecast && column.forecast.before) {
						cht.append('path')
							.datum(_.select(rows, function (row) {
								return (row.first || row.forecast === 'before') && !isNaN(row[column.name]);
							}))
							.attr('class', 'line forecast')
							.attr('stroke', 'url(#grad' + column.safeName + rand + ')')
							.attr('d', line)
							.attr('clip-path', 'url(#clip' + rand + ')');
					}
					if (column.forecast && column.forecast.after) {
						cht.append('path')
							.datum(_.select(rows, function (row) {
								return (row.last || row.forecast === 'after') && !isNaN(row[column.name]);
							}))
							.attr('class', 'line forecast')
							.attr('stroke', 'url(#grad' + column.safeName + rand + ')')
							.attr('d', line)
							.attr('clip-path', 'url(#clip' + rand + ')');
					}

					cht.selectAll('.point.p' + column.safeName)
						.data(_.select(rows, function (row) {
							return !row.forecast && !isNaN(row[column.name]);
						}))
						.enter()
						.append('svg:circle')
						.attr('class', 'point p' + column.safeName)
						.attr('stroke', 'url(#grad' + column.safeName + rand + ')')
						.attr('r', 3)
						.attr('cx', function (d) { return x(d.timestamp); })
						.attr('cy', function (d) { return y(d[column.name]); })
						.attr('clip-path', 'url(#clip' + rand + ')');

					
					cht.selectAll('.clickpoint.p' + column.safeName)
						.data(_.select(rows, function (row) {
							return !row.forecast && !isNaN(row[column.name]);
						}))
						.enter()
						.append('svg:rect')
						.attr('class', 'clickpoint p' + column.safeName)
						.attr('width', tipClickSize)
						.attr('height', tipClickSize)
						.attr('x', function (d) { return x(d.timestamp) - tipClickSize / 2; })
						.attr('y', function (d) { return y(d[column.name]) - tipClickSize / 2; })
						.attr('clip-path', 'url(#clip' + rand + ')')
						.on('click', function (d) {
							tip(x(d.timestamp), y(d[column.name]), moment(d.timestamp).format('DD MMM YYYY [at] hh:mm'), d.value + column.unit);
						});
				});
			};

			this.data = function (_columns, _rows, _span) {
				columns = _columns;
				rows = _rows;
				span = _span;
				update();
			};

			this.resize = function (_width, _height) {
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
