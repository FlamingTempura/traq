'use strict';

var angular = require('angular'),
	d3 = require('d3'),
	_ = require('lodash'),
	moment = require('moment');

var margin = { top: 6, right: 28, bottom: 30, left: 36 },
	barMargin = 4;

angular.module('traq').config(function (charts, spans) {
	charts.push({
		id: 'bar',
		title: 'Bar chart',
		Chart: function (svg, rand, tip) {
			var width, height,
				defs = svg.select('defs'),
				cht = svg.select('.cht'),
				clip = defs.append('clipPath')
					.attr('id', 'clip' + rand)
					.append('rect');

			var x = d3.time.scale(),
				xAxis = d3.svg.axis()
					.scale(x)
					.orient('bottom');

			cht.append('g')
				.attr('class', 'x axis');

			var ys = {},
				yAxes = {};

			_.each(['left', 'right'], function (direction) {
				ys[direction] = d3.scale.linear();

				yAxes[direction] = d3.svg.axis()
					.scale(ys[direction])
					.orient(direction)
					.ticks(6);

				cht.append('g')
					.attr('class', 'y axis ' + direction)
					.append('text')
					.attr('transform', 'rotate(-90)')
					.attr('y', 6)
					.attr('dy', (direction === 'right' ? '-' : '') + '.71em')
					.style('text-anchor', 'end');
			});

			this.update = function (columns, rows, span) {
				if (!rows || !width) { return; }

				cht.selectAll('.line, .area').remove();

				if (span) {
					xAxis.ticks(spans[span].ticks || 7).tickFormat(spans[span].tickFormat);
				} else {
					xAxis.ticks(7).tickFormat(d3.time.format('%a'));
				}

				x.domain([new Date(Date.now() - spans[span].duration), new Date()]);


				_.map(['left', 'right'], function (direction) {
					var y = ys[direction],
						directionColumns = _.where(columns, { axis: direction }),
						label = directionColumns[0] || {},
						directionRows = _.chain(directionColumns).map(function (column) {
							return _.pluck(rows, column.name);
						}).flatten().value(),
						extent = d3.extent(directionRows, function (d) { return d; });

					extent[0] -= (extent[1] - extent[0]) / 5 + extent[0] / 20;
					extent[1] += (extent[1] - extent[0]) / 5 + extent[0] / 20;

					y.domain(extent).nice();

					cht.selectAll('.y.axis.' + direction)
						.style('visibility', directionColumns.length > 0)
						.text(label.name + ' (' + label.unit + ')')
						.call(yAxes[direction]);

					_.each(directionColumns, function (column) {

						var bars = cht.selectAll('.bar.b' + column.safeName)
							.data(_.select(rows, function (row) {
								return !isNaN(row[column.name]);
							}));

						bars.enter().append('rect')
							.attr('class', 'bar b' + column.safeName)
							.attr('fill', 'url(#grad' + column.safeName + rand + ')')
							.attr('clip-path', 'url(#clip' + rand + ')')
							.on('click', function (d) {
								tip(margin.left + x(d.timestamp), margin.top + y(d[column.name]), moment(d.timestamp).format('DD MMM YYYY [at] hh:mm'), d.value + column.unit);
							});

						bars.attr('x', function (d) { return x(d.timestamp) + barMargin; })
							.attr('y', function (d) { return height - y(d[column.name]); })
							.attr('width', function (d) {
								var t1 = d.timestamp,
									t2 = new Date(t1.getTime() + 24 * 60 * 60 * 1000).getTime();
								return x(t2) - x(t1) - barMargin * 2;
							})
							.attr('height', function (d) { return y(d[column.name]); });

						bars.exit().remove();

					});
				});

				cht.selectAll('.x.axis')
					.call(xAxis);

				var grid = cht.selectAll('.x.gridline')
					.data(ys.left.ticks(6));

				grid.enter()
					.append('line')
					.attr('class', 'x gridline')
					.attr('x1', 0);
				grid.attr('x2', width)
					.attr('y1', function (d) { return ys.left(d); })
					.attr('y2', function (d) { return ys.left(d); });

				grid.exit().remove();
			};

			this.resize = function (_width, _height) {
				console.log('resize', _width, _height);
				width = _width - margin.left - margin.right;
				height = _height - margin.top - margin.bottom - 10;

				x.range([0, width]);
				ys.left.range([height, 0]);
				ys.right.range([height, 0]);

				clip.attr('width', width)
					.attr('height', height);

				cht.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

				cht.selectAll('.x.axis')
					.attr('transform', 'translate(0,' + height + ')');

				cht.selectAll('.y.axis.right')
					.attr('transform', 'translate(' + width + ' ,0)');
			};

			// FIXME: destroy event bindings
		}
	});
});
