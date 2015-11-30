'use strict';

var angular = require('angular'),
	d3 = require('d3'),
	_ = require('lodash'),
	moment = require('moment');

var margin = { top: 6, right: 28, bottom: 30, left: 36 };

var polarToCartesian = function (cx, cy, radius, angleInDegrees) {
	var angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
	return [cx + radius * Math.cos(angleInRadians), cy + radius * Math.sin(angleInRadians)];
};

var describeArc = function (cx, cy, radius, startAngle, endAngle){

	var start = polarToCartesian(cx, cy, radius, endAngle),
		end = polarToCartesian(cx, cy, radius, startAngle);

	var arcSweep = endAngle - startAngle <= 180 ? 0 : 1;

	var d = [
		'M', start[0], start[1],
		'A', radius, radius, 0, arcSweep, 0, end[0], end[1]
	].join(' ');

	console.log('ggg', d)

	return d;
};

angular.module('traq').config(function (charts) {
	charts.push({
		id: 'pie',
		title: 'Pie chart',
		Chart: function (svg, rand) {
			var width, height,
				cht = svg.select('.cht')
					.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

			this.update = function (columns) {
				if (!columns || !width) { return; }

				var pies = cht.selectAll('.pie')
					.data(columns);

				var piesEnter = pies.enter().append('g');

				piesEnter.append('path')
					.attr('class', 'piebg')
					.attr('stroke', function (column) {
						return 'url(#grad' + column.safeName + rand + ')';
					});

				piesEnter.append('path')
					.attr('class', 'pievalue')
					.attr('stroke', function (column) {
						return 'url(#grad' + column.safeName + rand + ')';
					});

				piesEnter.append('text')
					.attr('class', 'pietext');

				pies.select('.piebg')
					.attr('stroke-width', Math.min(width / 33, height / 33))
					.attr('d', describeArc(width / 2, height / 2, width / 3, 0, 359.999));

				pies.select('.pievalue')
					.attr('stroke-width', Math.min(width / 33, height / 33))
					.attr('d', function (column) {
						var row = _.last(column.measurements),
							angle = row.value / column.goal * 359.999;
						return describeArc(width / 2, height / 2, width / 3, 0, angle);
					});

				pies.select('.pietext')
					.attr('x', width / 2)
					.attr('y', height / 2)
					.text(function (column) {
						var row = _.last(column.measurements);
						return row.value + ' ' + column.unit;
					});

				pies.exit().remove();

			};

			this.resize = function (_width, _height) {
				width = _width - margin.left - margin.right;
				height = _height - margin.top - margin.bottom - 10;
			};

			// FIXME: destroy event bindings
		}
	});
});
