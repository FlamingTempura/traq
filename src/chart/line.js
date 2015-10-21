'use strict';

var angular = require('angular'),
	d3 = require('d3'),
	_ = require('lodash');

angular.module('traq')
	.config(function (chartTypes) {
		var margin = { top: 20, right: 50, bottom: 30, left: 50 };

		chartTypes.push({
			id: 'line',
			name: 'Line chart',
			options: {
				smooth: { label: 'Smooth line', type: Boolean },
				points: { label: 'Draw points', type: Boolean }
			},
			init: function () {
				this.container = this.element.children()[0];

				this.x = d3.time.scale();
				this.yLeft = d3.scale.linear();
				this.yRight = d3.scale.linear();

				this.xAxis = d3.svg.axis()
					.scale(this.x)
					.ticks(d3.time.day)
					.tickFormat(d3.time.format('%a'))
					.orient('bottom');

				this.yAxisLeft = d3.svg.axis()
					.scale(this.yLeft)
					.orient('left');

				this.yAxisRight = d3.svg.axis()
					.scale(this.yRight)
					.orient('right');

				this.svg = d3.select(this.container).append('svg');
				this.cht = this.svg.append('g');

				this.cht.append('g')
					.attr('class', 'x axis');

				this.cht.append('g')
					.attr('class', 'y axis left')
					.append('text')
					.attr('transform', 'rotate(-90)')
					.attr('y', 6)
					.attr('dy', '.71em')
					.style('text-anchor', 'end');

				this.cht.append('g')
					.attr('class', 'y axis right')
					.append('text')
					.attr('transform', 'rotate(-90)')
					.attr('y', 6)
					.attr('dy', '-.71em')
					.style('text-anchor', 'end');
			},
			update: function (chart, table, rows) {
				var that = this;

				this.chart = chart;
				rows = _.sortBy(rows, 'date');

				var start = this.options.span === 'day' ? Date.now() - 24 * 60 * 60 * 1000 :
							this.options.span === 'week' ? Date.now() - 7 * 24 * 60 * 60 * 1000 :
							null;
				if (start) {
					rows = _.select(rows, function (row) {
						return row.date.getTime() > start;
					});
				}

				this.rows = rows;

				var columns = this.columns = _.chain(table.columns).map(function (column) {
					return _.extend({}, column, chart.columns[column.id]);
				}).where({ show: true }).value();

				console.log('oboo', rows);

				var leftColumns = _.where(columns, { axis: 'left' }),
					rightColumns = _.where(columns, { axis: 'right' }),
					leftLabel = leftColumns[0] || {},
					rightLabel = rightColumns[0] || {},
					allYLeft = _.chain(leftColumns).map(function (column) {
						return _.pluck(rows, column.id);
					}).reject(function (val) {
						return !chart.plotZeros && val === 0;
					}).flatten().value(),
					allYRight = _.chain(rightColumns).map(function (column) {
						return _.pluck(rows, column.id);
					}).reject(function (val) {
						return !chart.plotZeros && val === 0;
					}).flatten().value();

				that.x.domain(d3.extent(rows, function (d) { return d.date; }));
				that.yLeft.domain(d3.extent(allYLeft, function (d) { return d; }));
				that.yRight.domain(d3.extent(allYRight, function (d) { return d; }));

				that.cht.selectAll('.y.axis.left')
					.style('visibility', leftColumns.length > 0)
					.text(leftLabel.name + ' (' + leftLabel.unit + ')');

				that.cht.selectAll('.y.axis.right')
					.style('visibility', rightColumns.length > 0)
					.text(rightLabel.name + ' (' + rightLabel.unit + ')');

				_.each(columns, function (column) {
					that.cht.selectAll('.point.p' + column.id)
						.data(_.reject(rows, function (row) {
							return isNaN(row[column.id]) || !chart.plotZeros && row[column.id] === 0;
						}))
						.enter()
						.append('svg:circle')
						.attr('class', 'point p' + column.id)
						.attr('fill', column.color)
						.attr('r', 4);

					// TODO label lines
				});
			},
			resize: function () {
				var that = this;

				var width = this.container.offsetWidth - margin.left - margin.right,
					height = this.container.offsetHeight - margin.top - margin.bottom - 10;

				console.log('w', width, 'h', height);

				this.x.range([0, width]);
				this.yLeft.range([height, 0]);
				this.yRight.range([height, 0]);

				this.svg.attr('width', width + margin.left + margin.right)
					.attr('height', height + margin.top + margin.bottom);

				this.cht.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

				this.cht.selectAll('.x.axis')
					.attr('transform', 'translate(0,' + height + ')')
					.call(this.xAxis);

				this.cht.selectAll('.y.axis.right')
					.attr('transform', 'translate(' + width + ' ,0)')
					.call(this.yAxisRight);

				this.cht.selectAll('.y.axis.left')
					.call(this.yAxisLeft);

				this.cht.selectAll('.line')
					.remove();

				_.each(this.columns, function (column) {
					var y = column.axis === 'left' ? that.yLeft : that.yRight,
						x = that.x;

					that.cht.selectAll('.point.p' + column.id)
						.attr('cx', function (d) { return x(d.date); })
						.attr('cy', function (d) { return y(d[column.id]); });

					var line = d3.svg.line()
						.interpolate('monotone')
						.x(function (d) { return x(d.date); })
						.y(function (d) { return y(d[column.id]); });

					that.cht.append('path')
						.datum(_.reject(that.rows, function (row) {
							return isNaN(row[column.id]) || !that.chart.plotZeros && row[column.id] === 0;
						}))
						.attr('class', 'line')
						.attr('stroke', column.color)
						.attr('d', line);
				});
			}

		});
	});
