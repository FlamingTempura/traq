'use strict';

var angular = require('angular'),
	uuid = require('node-uuid');

angular.module('traq').config(function ($stateProvider) {
	$stateProvider.state('table-edit', {
		url: '/table/:tid/edit',
		templateUrl: 'table-edit.html',
		params: { table: null, rows: null },
		controller: function ($scope, $state, dbTable, dbRow, snack) {
			$scope.isNew = $state.params.tid === 'new';
			if ($scope.isNew) {
				$scope.table = $state.params.table || {
					_id: 'tbl[' + uuid.v4() + ']',
					columns: []
				};
				$scope.rows = $state.params.rows;
				console.log('new --', $scope.table, $state.params);
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

			$scope.remove = function () {
				console.log('attempting to remove', $scope.table)
				dbTable.remove($scope.table).then(function () {
					// TODO: delete all rows and charts
					$state.go('home');
					snack('The table has been deleted', 'Undo', function () {
						dbTable.put($scope.table);
					});
				});
			};
		}
	});
});
