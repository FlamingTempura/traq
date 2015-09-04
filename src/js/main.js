'use strict';

var _ = require('lodash'),
	angular = require('angular'),
	ngMaterial = require('angular-material'),
	uiRouter = require('ui-router'),
	PouchDB = require('pouchdb');

angular.module('traq', [ngMaterial, uiRouter])
	.controller('AppCtrl', function () { })
	.service('table', function () {
		return new PouchDB('traq-table');
	})
	.service('row', function () {
		return new PouchDB('traq-row');
	})
	.config(function ($stateProvider, $urlRouterProvider) {
		$urlRouterProvider.otherwise('/');
		$stateProvider
			.state('main', {
				abstract: true,
				templateUrl: 'main.html',
				controller: function ($scope, $state, $mdSidenav, table) {
					$scope.toggleSidenav = function (menuId) {
						$mdSidenav(menuId).toggle();
					};

					$scope.go = function (to, params) {
						$state.go(to, params);
						$mdSidenav('left').close();
					};

					table.allDocs({ include_docs: true }).then(function (result) {
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
				controller: function ($scope, $state, table, row) {
					table.get($state.params.tid).then(function (table) {
						console.log('got table', table);
						$scope.table = table;
						$scope.$apply();
					}).catch(function (err) {
						console.error('failed', err);
					}).then(function () {
						return row.allDocs({ include_docs: true });
					}).then(function (result) {
						console.log('all rows', result.rows);
						$scope.rows = _.chain(result.rows).pluck('doc').where({ table: $scope.table._id }).value();
						console.log('got rows', $scope.rows);
						$scope.$apply();
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
				controller: function ($scope, $state, table) {
					$scope.isNew = $state.params.tid === 'new';
					if ($scope.isNew) {
						$scope.table = {
							_id: String(Math.ceil(Math.random() * 1000000000000)),
							columns: []
						};
					} else {
						table.get($state.params.tid).then(function (table) {
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
						table.put($scope.table).then(function () {
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
				controller: function ($scope, $state, table, row) {

					table.get($state.params.tid).then(function (table) {
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
						} else {
							row.get($state.params.rid).then(function (row) {
								console.log('got row', row);
								$scope.row = row;
								$scope.$apply();
							}).catch(function (err) {
								console.error('failed', err);
							});
						}
					});

					$scope.save = function () {
						row.put($scope.row).then(function () {
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
				templateUrl: 'chart-view.html'
			})
			.state('table-chart-edit', {
				url: '/table/:tid/chart/:cid/edit',
				templateUrl: 'chart-edit.html'
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
	});
