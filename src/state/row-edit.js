'use strict';

var angular = require('angular'),
	uuid = require('node-uuid');

angular.module('traq').config(function ($stateProvider) {
	$stateProvider.state('row-edit', {
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
	});
});
