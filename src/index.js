'use strict';

var _ = require('lodash'),
	angular = require('angular'),
	ngMaterial = require('angular-material'),
	uiRouter = require('angular-ui-router'),
	PouchDB = require('pouchdb'),
	d3 = require('d3'),
	uuid = require('node-uuid');

PouchDB.plugin(require('transform-pouch'));
PouchDB.plugin({
	getAll: function (options) {
		return this.allDocs(_.extend({ include_docs: true }, options)).then(function (result) {
			return _.pluck(result.rows, 'doc');
		});
	},
	// use angular promises ($q) to avoid need for $scope.$apply
	observe: function ($q) {
		var that = this,
			methods = ['destroy', 'put', 'post', 'get', 'remove', 'bulkDocs', 'allDocs',
				'changes', 'putAttachment', 'getAttachment', 'removeAttachment',
				'query', 'viewCleanup', 'info', 'compact', 'revsDiff'];
		methods.forEach(function (method) {
			that[method] = function () {
				return $q.resolve(PouchDB.prototype[method].apply(that, arguments));
			};
		});
	}
});

var classSafe = function (str) {
	// made id's safe for use in classnames
	return str.replace(/\W/g, '');
};

angular.module('traq', [ngMaterial, uiRouter])
	.controller('AppCtrl', function ($scope, snack) {
		$scope.snack = snack;
	})
	.service('dbTable', function ($q) {
		var db = new PouchDB('traq-table');
		db.observe($q);
		db.transform({
			incoming: function (doc) {
				return _.extend({}, doc, {
					columns: _.map(doc.columns, function (column) {
						return {
							id: column.id || 'col[' + uuid.v4() + ']',
							name: column.name,
							unit: column.unit
						};
					})
				});
			}
		});
		return db;
	})
	.service('dbRow', function ($q) {
		var db = new PouchDB('traq-row');
		db.observe($q);
		db.transform({
			incoming: function (doc) {
				return _.extend({}, doc, {
					date: new Date(doc.date).getTime()
				});
			},
			outgoing: function (doc) {
				return _.extend({}, doc, { date: new Date(doc.date) });
			}
		});
		return db;
	})
	.service('dbChart', function ($q) {
		var db = new PouchDB('traq-chart');
		db.observe($q);
		return db;
	})
	.config(function ($stateProvider, $urlRouterProvider) {
		$urlRouterProvider.otherwise('/');
	})
	.directive('fileReader', function () {
		return {
			restrict: 'E',
			replace: true,
			template: '<input type="file">',
			scope: {
				contents: '=',
				name: '=',
				format: '='
			},
			link: function (scope, element) {
				var permittedFormats = {
					csv: ['.csv', 'text/csv'],
					tsv: ['.tsv'],
					tcx: ['.tcx']
				};

				element.on('change', function () {
					var reader = new FileReader(),
						file = element[0].files[0],
						extension = file.name.indexOf('.') > -1 ? file.name.match(/\.[^.\/]+$/)[0] : '',
						name = file.name.slice(0, -extension.length),
						format = _.chain(permittedFormats).keys().find(function (format) {
							return permittedFormats[format].indexOf(extension) > -1 ||
								permittedFormats[format].indexOf(file.type) > -1;
						});

					if (!format) {
						console.error('File format not supported');
						return;
					}

					reader.onload = function () {
						scope.name = name;
						scope.format = format;
						scope.contents = reader.result;
						scope.$apply();
					};
					reader.readAsText(file);
				});
			}
		};
	})
	.service('download', function () {
		// http://stackoverflow.com/questions/3665115/create-a-file-in-memory-for-user-to-download-not-through-server
		return function (filename, text) {
			var element = document.createElement('a');
			element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
			element.setAttribute('download', filename);

			element.style.display = 'none';
			document.body.appendChild(element);

			element.click();

			document.body.removeChild(element);
		};
	})
	.service('rowsSelected', function () { return {}; })
	.directive('uiBack', function () {
		return {
			restrict: 'A',
			link: function (scope, element) {
				element.on('click', function () {
					window.history.back();
				});
			}
		};
	})
	.constant('charts', [
		{
			id: 'line',
			name: 'Line'
		}
	])
	.directive('lineChartOptions', function () {
		return {
			restrict: 'E',
			replace: true,
			scope: {
				table: '=',
				chart: '=',
				rows: '='
			},
			link: function (scope, element) {
				// smooth
				// points
				// 
			}
		};
	})
	.directive('lineChart', function () {
		return {
			restrict: 'E',
			replace: true,
			scope: {
				table: '=',
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

						cht.selectAll('.point.p' + classSafe(column.id))
							.attr('cx', function (d) { return x(d.date); })
							.attr('cy', function (d) { return y(d[column.id]); });

						var line = d3.svg.line()
							.interpolate('monotone')
							.x(function (d) { return x(d.date); })
							.y(function (d) { return y(d[column.id]); });

						cht.append('path')
							.datum(_.reject(rows, function (row) {
								return !chart.plotZeros && row[column.id] === 0;
							}))
							.attr('class', 'line')
							.attr('stroke', column.color)
							.attr('d', line);
					});
				};

				var plot = function () {
					if (!scope.chart || !scope.table || !scope.rows) { return; }
					rows = _.sortBy(scope.rows, 'date');
					chart = scope.chart;
					columns = _.chain(scope.table.columns).map(function (column) {
						return _.extend({}, column, chart.columns[column.id]);
					}).where({ show: true }).value();

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
						cht.selectAll('.point.p' + classSafe(column.id))
							.data(_.reject(rows, function (row) {
								return !chart.plotZeros && row[column.id] === 0;
							}))
							.enter()
							.append('svg:circle')
							.attr('class', 'point p' + classSafe(column.id))
							.attr('fill', column.color)
							.attr('r', 4);

						// TODO label lines
					});

					resize();
				};

				angular.element(window).on('resize', resize);
				scope.$watch('table + chart + rows', plot);

			}
		};
	})
	.directive('barChart', function () {
		return {
			restrict: 'E',
			replace: true,
			scope: {
				table: '=',
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

						cht.selectAll('.bar.r' + classSafe(column.id))
							.attr('x', function (d) { return barPad + x(d.date) - barWidth / 2; })
							.attr('width', barWidth)
							.attr('y', function (d) { return y(d[column.id]); })
							.attr('height', function (d) { return height - y(d[column.id]); });
					});
				};

				var plot = function () {
					if (!scope.chart || !scope.table || !scope.rows) { return; }
					rows = _.sortBy(scope.rows, 'date');
					chart = scope.chart;
					columns = _.chain(scope.table.columns).map(function (column) {
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
						cht.selectAll('.bar.r' + classSafe(column.id))
							.data(rows)
							.enter()
							.append('svg:rect')
							.attr('class', 'bar r' + classSafe(column.id))
							.attr('fill', column.color);

					});

					resize();
				};

				angular.element(window).on('resize', resize);
				scope.$watch('table + chart + rows', plot);
			}
		};
	}).filter('startFrom', function () {
		return function (input, start) {
			return input.slice(start);
		};
	}).service('snack', function ($timeout) {
		var snack = function (message, buttonText, buttonFn) {
			snack.message = message;
			snack.buttonText = buttonText;
			snack.buttonFn = buttonFn;
			$timeout(function () {
				delete snack.message;
			}, 2000);
		};
		return snack;
	});

require('./state/chart-edit.js');
require('./state/chart-view.js');
require('./state/export.js');
require('./state/feedback.js');
require('./state/home.js');
require('./state/import.js');
require('./state/main.js');
require('./state/row-edit.js');
require('./state/settings-dropbox.js');
require('./state/settings.js');
require('./state/table-edit.js');
require('./state/table-view.js');
require('./state/table.js');
