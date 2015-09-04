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
				obj.date = obj.date.getTime();
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
						if (row.doc) { row.date = new Date(row.date); }
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
				controller: function ($scope, $state, dbTable, dbRow, dbChart) {
					dbTable.get($state.params.tid).then(function (table) {
						console.log('got table', table);
						$scope.table = table;
						$scope.$apply();
					}).catch(function (err) {
						console.error('failed', err);
					}).then(function () {
						dbRow.allDocs({ include_docs: true }).then(function (result) {
							$scope.rows = _.chain(result.rows).pluck('doc').where({ table: $scope.table._id }).value();
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
				controller: function ($scope) {
					$scope.selected = [];
					$scope.$watch('selectAll', function (selectAll) {
						if (selectAll) {
							_.each($scope.$parent.rows, function (row) {
								$scope.selected[row._id] = true;
							});
						} else {
							$scope.selected = [];
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
					dbTable.get($state.params.tid).then(function (table) {
						console.log('get table', table);
						$scope.table = table;
						$scope.$apply();
					}).catch(function (err) {
						console.log('failed', err);
					}).then(function () {
						$scope.isNew = $state.params.cid === 'new';
						if ($scope.isNew) {
							$scope.chart = {
								_id: String(Math.ceil(Math.random() * 1000000000000)),
								table: $scope.table._id
							};
							$scope.$apply();
						} else {
							dbChart.get($state.params.cid).then(function (chart) {
								console.log('got chart', chart);
								$scope.chart = chart;
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
	.directive('lineChart', function () {
		return {
			restrict: 'E',
			replace: true,
			scope: {
				table: '=',
				chart: '=',
				rows: '='
			},
			link: function (scope, element) {
				setTimeout(function () {
					var columns = scope.table.columns,
						rows = _.sortBy(scope.rows, 'date'),
						chart = scope.chart;

					var margin = { top: 20, right: 50, bottom: 30, left: 50 },
						width = 400 - margin.left - margin.right,
						height = 300 - margin.top - margin.bottom;

					var x = d3.time.scale()
						.range([0, width]);

					var xAxis = d3.svg.axis()
						.scale(x)
						.orient('bottom');

					var ys = [];

					ys.push(d3.scale.linear()
						.range([height, 0]));
					// todo if chart option
					ys.push(d3.scale.linear()
						.range([height, 0]));

					var yAxes = [];

					yAxes.push(d3.svg.axis()
						.scale(ys[0])
						.orient('left'));

					yAxes.push(d3.svg.axis()
						.scale(ys[1])
						.orient('right'));

					var lines = _.map(columns, function (column, i) {
						return d3.svg.line()
							.x(function (d) { return x(d.date); })
							.y(function (d) { return ys[i](d[column.id]); });
					});

					var svg = d3.select(element[0]).append('svg')
						.attr('width', width + margin.left + margin.right)
						.attr('height', height + margin.top + margin.bottom)
						.append('g')
						.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

					x.domain(d3.extent(rows, function (d) { return d.date; }));
					ys[0].domain(d3.extent(rows, function (d) { return d[columns[0].id]; }));
					ys[1].domain(d3.extent(rows, function (d) { return d[columns[1].id]; }));

					svg.append('g')
						.attr('class', 'x axis')
						.attr('transform', 'translate(0,' + height + ')')
						.call(xAxis);

					svg.append('g')
						.attr('class', 'y axis')
						.call(yAxes[0])
						.append('text')
						.attr('transform', 'rotate(-90)')
						.attr('y', 6)
						.attr('dy', '.71em')
						.style('text-anchor', 'end')
						.text(columns[0].name);

					svg.append('g')
						.attr('class', 'y axis')
						.attr('transform', 'translate(' + width + ' ,0)')
						.call(yAxes[1])
						.append('text')
						.attr('transform', 'rotate(-90)')
						.attr('y', 6)
						.attr('dy', '.71em')
						.style('text-anchor', 'end')
						.text(columns[1].name);

					svg.append('path')
						.datum(rows)
						.attr('class', 'line')
						.attr('stroke', chart.colors[columns[0].id])
						.attr('d', lines[0]);

					svg.selectAll('.point.a')
						.data(rows)
						.enter()
						.append('svg:circle')
						.attr('class', 'point a')
						.attr('fill', chart.colors[columns[0].id])
						.attr('cx', function (d) { return x(d.date); })
						.attr('cy', function (d) { return ys[0](d[columns[0].id]); })
						.attr('r', 4);

					svg.append('path')
						.datum(rows)
						.attr('class', 'line')
						.attr('stroke', chart.colors[columns[1].id])
						.attr('d', lines[1]);

					svg.selectAll('.point.b')
						.data(rows)
						.enter()
						.append('svg:circle')
						.attr('class', 'point b')
						.attr('fill', chart.colors[columns[1].id])
						.attr('cx', function (d) { return x(d.date); })
						.attr('cy', function (d) { return ys[1](d[columns[1].id]); })
						.attr('r', 4);

				}, 300);
			}
		};
	});
