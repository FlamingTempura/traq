'use strict';

var angular = require('angular'),
	uuid = require('node-uuid'),
	resetMS = function (date) {
		date.setMilliseconds(0);
		return date;
	};

angular.module('traq').config(function ($stateProvider) {
	$stateProvider.state('row-edit', {
		url: '/traq/:tid/row/:rid/edit',
		templateUrl: 'row-edit.html',
		resolve: {
			traq: function ($stateParams, dbTraq) {
				return dbTraq.get($stateParams.tid); // TODO handle error
			},
			row: function ($stateParams, dbRow, traq) {
				if ($stateParams.rid === 'new') {
					return {
						_id: traq._id + ':row' + uuid.v4(),
						date: resetMS(new Date())
					};
				} else {
					return dbRow.get($stateParams.rid); // TODO handle error
				}
			}
		},
		controller: function ($scope, $state, dbTraq, dbRow, traq, row) {

			$scope.traq = traq;
			$scope.row = row;
			$scope.isNew = $state.params.rid === 'new';

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
