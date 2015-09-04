'use strict';

var _ = require('lodash'),
	angular = require('angular'),
	ngMaterial = require('angular-material'),
	uiRouter = require('ui-router'),
	PouchDB = require('pouchdb'),
	d3 = require('d3');

angular.module('traq', [ngMaterial, uiRouter])
	.controller('AppCtrl', function () { })
	.service('dbTable', function () {
		return new PouchDB('traq-table');
	})
	.service('dbRow', function () {
		var db = new PouchDB('traq-row');
		return _.extend({}, db, {
			put: function (obj) {
				obj = _.extend({}, obj, { date: obj.date.getTime() });
				return db.put.apply(db, arguments);
			},
			get: function () {
				return db.get.apply(db, arguments).then(function (row) {
					row.date = new Date(row.date);
					return row;
				});
			},
			allDocs: function () {
				return db.allDocs.apply(db, arguments).then(function (result) {
					_.forEach(result.rows, function (row) {
						if (row.doc) { row.doc.date = new Date(row.doc.date); }
					});
					return result;
				});
			}
		});
	})
	.service('dbChart', function () {
		return new PouchDB('traq-chart');
	})
	.config(function ($stateProvider, $urlRouterProvider) {
		$urlRouterProvider.otherwise('/');
		$stateProvider
			.state('main', {
				abstract: true,
				templateUrl: 'main.html',
				controller: function ($scope, $state, $mdSidenav, dbTable) {
					$scope.toggleSidenav = function (menuId) {
						$mdSidenav(menuId).toggle();
					};

					$scope.go = function (to, params) {
						$state.go(to, params);
						$mdSidenav('left').close();
					};

					dbTable.allDocs({ include_docs: true }).then(function (result) {
						$scope.tables = _.chain(result.rows).pluck('doc').reject(function (table) {
							return !table.title;
						}).value();
						$scope.$apply();
						console.log('got tables', $scope.tables);
					}).catch(function (err) {
						console.error('failed', err);
					});
				}
			})
			.state('home', {
				parent: 'main',
				url: '/',
				templateUrl: 'home.html',
				controller: function ($scope) {
					$scope.$root.title = 'Traq';
				}
			})
			.state('table', {
				parent: 'main',
				url: '/table/:tid',
				abstract: true,
				templateUrl: 'table.html',
				controller: function ($scope, $state, dbTable, dbRow, dbChart, rowsSelected) {
					$scope.rowsSelected = rowsSelected;
					$scope.$watch('rowsSelected', function (rowsSelected) {
						$scope.showSelectedToolbar = _.keys(rowsSelected).length > 0 && _.reduce(rowsSelected, function (memo, rowSelected) {
							return memo && rowSelected;
						}, true);
					}, true);
					dbTable.get($state.params.tid).then(function (table) {
						console.log('got table', table);
						$scope.table = table;
						$scope.$apply();
					}).catch(function (err) {
						console.error('failed', err);
					}).then(function () {
						dbRow.allDocs({ include_docs: true }).then(function (result) {
							$scope.rows = _.chain(result.rows).pluck('doc').where({ table: $scope.table._id }).sortBy('date').value();
							console.log('got rows', $scope.rows);
							$scope.$apply();
						});
						dbChart.allDocs({ include_docs: true }).then(function (result) {
							$scope.charts = _.chain(result.rows).pluck('doc').where({ table: $scope.table._id }).value();
							console.log('got charts', $scope.charts);

							if ($state.params.cid) {
								$scope.tabIndex = _.findIndex($scope.charts, function (chart) {
									return chart._id === $state.params.cid;
								}) + 1;
							} else {
								$scope.tabIndex = 0;
							}
							$scope.$apply();
						});
					});
				}
			})
			.state('table-view', {
				parent: 'table',
				url: '/',
				templateUrl: 'table-view.html',
				controller: function ($scope, rowsSelected) {
					$scope.rowsSelected = rowsSelected;
					$scope.selectAll = false;
					$scope.$watch('selectAll', function (selectAll) {
						if (selectAll) {
							_.each($scope.rows, function (row) {
								rowsSelected[row._id] = true;
							});
						} else {
							rowsSelected = [];
						}
					});
				}
			})
			.state('table-edit', {
				url: '/table/:tid/edit',
				templateUrl: 'table-edit.html',
				controller: function ($scope, $state, dbTable) {
					$scope.isNew = $state.params.tid === 'new';
					if ($scope.isNew) {
						$scope.table = {
							_id: String(Math.ceil(Math.random() * 1000000000000)),
							columns: []
						};
					} else {
						dbTable.get($state.params.tid).then(function (table) {
							console.log('get table', table);
							$scope.table = table;
							$scope.$apply();
						}).catch(function (err) {
							console.log('failed', err);
						});
					}

					$scope.save = function () {
						console.log('saving...', $scope.table);
						_.each($scope.table.columns, function (column) {
							if (!column.hasOwnProperty('id')) {
								column.id = String(Math.ceil(Math.random() * 1000000000000));
							}
						});
						dbTable.put($scope.table).then(function () {
							console.log('saved!');
							$state.go('table-view', { tid: $scope.table._id });
						}).catch(function (err) {
							console.error('failed', err);
						});
					};
				}
			})
			.state('table-row-edit', {
				url: '/table/:tid/row/:rid/edit',
				templateUrl: 'row-edit.html',
				controller: function ($scope, $state, dbTable, dbRow) {

					dbTable.get($state.params.tid).then(function (table) {
						console.log('get table', table);
						$scope.table = table;
						$scope.$apply();
					}).catch(function (err) {
						console.log('failed', err);
					}).then(function () {
						$scope.isNew = $state.params.rid === 'new';
						if ($scope.isNew) {
							$scope.row = {
								_id: String(Math.ceil(Math.random() * 1000000000000)),
								date: new Date(),
								table: $scope.table._id
							};
							$scope.row.date.setMilliseconds(0);
							$scope.$apply();
						} else {
							dbRow.get($state.params.rid).then(function (row) {
								console.log('got row', row);
								$scope.row = row;
								$scope.$apply();
							}).catch(function (err) {
								console.error('failed', err);
							});
						}
					});

					$scope.save = function () {
						dbRow.put($scope.row).then(function () {
							console.log('saved!', $scope.row);
							history.back();
						}).catch(function (err) {
							console.error('failed', err);
						});
					};
				}
			})
			.state('table-import', {
				url: '/table/:tid/import',
				templateUrl: 'import.html'
			})
			.state('table-chart-view', {
				parent: 'table',
				url: '/chart/:cid',
				templateUrl: 'chart-view.html',
				controller: function ($scope, $state, dbChart) {
					dbChart.get($state.params.cid).then(function (chart) {
						console.log('got chart', chart);
						$scope.chart = chart;
						$scope.$apply();
					}).catch(function (err) {
						console.error('failed', err);
					});
				}
			})
			.state('table-chart-edit', {
				url: '/table/:tid/chart/:cid/edit',
				templateUrl: 'chart-edit.html',
				controller: function ($scope, $state, dbTable, dbChart) {
					$scope.colors = [
						{ hex: '#663399', name: 'Rebecca' },
						{ hex: '#D91E18', name: 'Thunderbird' },
						{ hex: '#F9690E', name: 'Ecstasy' },
						{ hex: '#F89406', name: 'California' },
						{ hex: '#F9BF3B', name: 'Sandstorm' },
						{ hex: '#87D37C', name: 'Gossip' },
						{ hex: '#03C9A9', name: 'Caribbean Green' },
						{ hex: '#19B5FE', name: 'Dodger Blue' },
						{ hex: '#446CB3', name: 'San Marino' },
						{ hex: '#6C7A89', name: 'Lynch' }
					];
					var colorDefault = [2, 1, 7, 8, 5, 4, 3, 9, 0, 6];
					var defaults = function (table, chart) {
						chart = _.extend({
							_id: String(Math.ceil(Math.random() * 1000000000000)),
							table: table._id,
							columns: {}
						}, chart);
						_.each(table.columns, function (column, i) {
							if (!chart.columns[column.id]) {
								chart.columns[column.id] = {};
							}
							_.defaults(chart.columns[column.id], {
								color: $scope.colors[colorDefault[i]].hex,
								axis: i === 0 ? 'left' : 'right',
								show: i === 0
							});
						});
						return chart;
					};
					dbTable.get($state.params.tid).then(function (table) {
						console.log('get table', table);
						$scope.table = table;
						$scope.$apply();
					}).catch(function (err) {
						console.log('failed', err);
					}).then(function () {
						$scope.isNew = $state.params.cid === 'new';
						if ($scope.isNew) {
							$scope.chart = defaults($scope.table);
							$scope.$apply();
						} else {
							dbChart.get($state.params.cid).then(function (chart) {
								console.log('got chart', chart);
								$scope.chart = defaults($scope.table, chart);
								$scope.$apply();
							}).catch(function (err) {
								console.error('failed', err);
							});
						}
					});

					$scope.save = function () {
						dbChart.put($scope.chart).then(function () {
							console.log('saved!', $scope.chart);
							$state.go('table-chart-view', { tid: $scope.chart.table, cid: $scope.chart._id });
						}).catch(function (err) {
							console.error('failed', err);
						});
					};
				}
			})
			.state('settings', {
				url: '/settings',
				templateUrl: 'settings.html'
			})
			.state('settings-dropbox', {
				url: '/settings/dropbox',
				templateUrl: 'settings-dropbox.html'
			})
			.state('feedback', {
				url: '/feedback',
				templateUrl: 'feedback.html'
			})
			.state('export', {
				url: '/export',
				templateUrl: 'export.html'
			});
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

						cht.selectAll('.point.p' + column.id)
							.attr('cx', function (d) { return x(d.date); })
							.attr('cy', function (d) { return y(d[column.id]); });

						var line = d3.svg.line()
							.interpolate('monotone')
							.x(function (d) { return x(d.date); })
							.y(function (d) { return y(d[column.id]); });

						cht.append('path')
							.datum(rows)
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
						cht.selectAll('.point.p' + column.id)
							.data(rows)
							.enter()
							.append('svg:circle')
							.attr('class', 'point p' + column.id)
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

						cht.selectAll('.bar.r' + column.id)
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
				scope.$watch('table + chart + rows', plot);

			}
		};
	});
