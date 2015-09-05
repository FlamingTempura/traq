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
	.controller('AppCtrl', function () { })
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

					dbTable.getAll().then(function (tables) {
						$scope.tables = tables;
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
				controller: function ($scope, dbChart) {
					$scope.$root.title = 'Traq';
					dbChart.getAll().then(function (charts) {

					});
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
					}).catch(function (err) {
						console.error('failed', err);
					}).then(function () {
						dbRow.getAll({
							startkey: $scope.table._id + ':',
							endkey: $scope.table._id + ':\uffff'
						}).then(function (rows) {
							$scope.rows = _.sortBy(rows, 'date');
							console.log('got rows', $scope.rows);
						});
						dbChart.getAll({
							startkey: $scope.table._id + ':',
							endkey: $scope.table._id + ':\uffff'
						}).then(function (charts) {
							$scope.charts = charts;
							console.log('got charts', $scope.charts);
							if ($state.params.cid) {
								$scope.tabIndex = _.findIndex($scope.charts, function (chart) {
									return chart._id === $state.params.cid;
								}) + 1;
							} else {
								$scope.tabIndex = 0;
							}
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
				params: { table: null, rows: null },
				controller: function ($scope, $state, dbTable, dbRow) {
					$scope.isNew = $state.params.tid === 'new';
					if ($scope.isNew) {
						$scope.table = $state.params.table || {
							_id: 'tbl[' + uuid.v4() + ']',
							columns: []
						};
						$scope.rows = $state.params.rows;
						console.log('new --', $scope.table, $state.params)
					} else {
						dbTable.get($state.params.tid).then(function (table) {
							console.log('get table', table);
							$scope.table = table;
						}).catch(function (err) {
							console.log('failed', err);
						});
					}

					$scope.save = function () {
						console.log('saving...', $scope.table);
						dbTable.put($scope.table).then(function () {
							console.log('saved!');
							if ($scope.rows) {
								return dbRow.bulkDocs($scope.rows).then(function () {
									console.log('put all rows');
								});
							}
						}).then(function () {
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
					}).catch(function (err) {
						console.log('failed', err);
					}).then(function () {
						$scope.isNew = $state.params.rid === 'new';
						if ($scope.isNew) {
							$scope.row = {
								_id: $scope.table._id + ':row[' + uuid.v4() + ']',
								date: new Date()
							};
							$scope.row.date.setMilliseconds(0);
						} else {
							dbRow.get($state.params.rid).then(function (row) {
								console.log('got row', row);
								$scope.row = row;
							}).catch(function (err) {
								console.error('failed', err);
							});
						}
					});

					$scope.save = function () {
						console.log('putting', $scope.row);
						dbRow.put($scope.row).then(function () {
							console.log('saved!', $scope.row);
							history.back();
						}).catch(function (err) {
							console.error('failed', err);
						});
					};
				}
			})
			.state('table-chart-view', {
				parent: 'table',
				url: '/chart/:cid',
				templateUrl: 'chart-view.html',
				controller: function ($scope, $state, dbChart) {
					dbChart.get($state.params.cid).then(function (chart) {
						console.log('got chart', chart);
						$scope.chart = chart;
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
							columns: {}
						}, chart);
						_.each(table.columns, function (column, i) {
							if (!chart.columns[column.id]) {
								chart.columns[column.id] = {};
							}
							_.defaults(chart.columns[column.id], {
								color: $scope.colors[colorDefault[i % colorDefault.length]].hex,
								axis: i === 0 ? 'left' : 'right',
								show: i === 0
							});
						});
						return chart;
					};
					dbTable.get($state.params.tid).then(function (table) {
						console.log('get table', table);
						$scope.table = table;
					}).catch(function (err) {
						console.log('failed', err);
					}).then(function () {
						$scope.isNew = $state.params.cid === 'new';
						if ($scope.isNew) {
							$scope.chart = defaults($scope.table, {
								_id: $scope.table._id + ':cht[' + uuid.v4() + ']'
							});
						} else {
							dbChart.get($state.params.cid).then(function (chart) {
								console.log('got chart', chart);
								$scope.chart = defaults($scope.table, chart);
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
				templateUrl: 'export.html',
				controller: function ($scope, $timeout, dbTable, dbRow, download) {
					dbTable.getAll().then(function (tables) {
						$scope.tables = tables;
					});
					$scope.options = {
						format: 'csv',
						method: 'file',
						selectedTables: []
					};
					$scope.toggleTable = function (id) {
						var i = $scope.options.selectedTables.indexOf(id);
						if (i > -1) {
							$scope.options.selectedTables.splice(i, 1);
						} else {
							$scope.options.selectedTables.push(id);
						}
					};
					$scope.export = function () {
						exporters['csv']();
					};

					var exporters = {
						csv: function () {
							var options = $scope.options,
								table = _.findWhere($scope.tables, { _id: options.selectedTables[0] });
							dbRow.getAll({
								startkey: table._id + ':',
								endkey: table._id + ':\uffff'
							}).then(function (_rows) {
								var rows = _.map(_rows, function (_row) {
									var row = { date: _row.date.toISOString() };
									_.each(table.columns, function (column) {
										row[column.name + ' (' + column.unit + ')'] = _row[column.id];
									});
									return row;
								});

								download(table.title + '.csv', d3.csv.format(rows));
							});
						}
					};
				}
			})
			.state('import', {
				url: '/import',
				templateUrl: 'import.html',
				controller: function ($scope, $state) {
					var dateColumnNames = ['date'];
					$scope.import = {};
					$scope.$watch('import.contents', function (contents) {
						if (!contents) { return; }
						// fix: remove fitbit header
						var lines = contents.split('\n');
						if (lines[0].split(',').length === 1 && lines[1].split(',').length > 1) {
							contents = lines.slice(1).join('\n');
						}
						// end fix
						// fix: remove blank lines at end
						contents = contents.trim();
						// end fix
						var data = d3.csv.parse(contents),
							keys = _.keys(data[0]),
							dateKey = _.find(keys, function (key) {
								return dateColumnNames.indexOf(key.trim().toLocaleLowerCase()) > -1;
							});
						if (!dateKey) {
							throw 'Date key not found';
						}
						// fix: try to normalise dates to MM-dd-YYYY :(
						var isDDMMYYYY = _.reduce(data, function (memo, row) {
							return memo || Number(row[dateKey].slice(0, 2)) > 12;
						}, false);
						if (isDDMMYYYY) {
							_.each(data, function (row) {
								row[dateKey] = row[dateKey].split(/[-\\\/ ]/).reverse().join('-');
								console.log(row[dateKey])
							});
						}
						// end fix
						$scope.table = {
							_id: 'tbl[' + uuid.v4() + ']',
							title: $scope.import.title,
							columns: _.chain(keys).map(function (key) {
								var parts = key.match(/^(.*?)\s*(?:\(([^()]*)\))?\s*$/);
								return {
									id: 'col[' + uuid.v4() + ']',
									name: parts[1],
									unit: parts[2],
									originalKey: key
								};
							}).reject(function (column) {
								return column.originalKey === dateKey;
							}).value()
						};

						$scope.rows = _.map(data, function (_row) {
							var row = {
								_id: $scope.table._id + ':row[' + uuid.v4() + ']',
								date: Date.parse(_row[dateKey])
							};
							_.each($scope.table.columns, function (column) {
								row[column.id] = Number(_row[column.originalKey]);
							});
							return row;
						});
						console.log($scope.table, $scope.rows);

					});
					$scope.import = function () {
						$state.go('table-edit', { tid: 'new', table: $scope.table, rows: $scope.rows });
					};
				}
			});
	})
	.directive('fileReader', function () {
		return {
			restrict: 'E',
			replace: true,
			template: '<input type="file">',
			scope: {
				contents: '=',
				name: '='
			},
			link: function (scope, element) {
				element.on('change', function () {
					var reader = new FileReader(),
						file = element[0].files[0];

					if (file.type.indexOf('text') !== 0) {
						console.error('File type not supported');
						return;
					}
					reader.onload = function () {
						scope.name = file.name.replace(/\.[^.\/]+$/, ''); // remove extension
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
						cht.selectAll('.point.p' + classSafe(column.id))
							.data(rows)
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
	});
