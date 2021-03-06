'use strict';

var angular = require('angular'),
	_ = require('lodash');

angular.module('traq').config(function ($stateProvider) {
	$stateProvider.state('settings', {
		url: '/settings',
		templateUrl: 'settings.html',
		resolve: {
			columns: function (dbColumn) { return dbColumn.getAll(); },
			language: function (dbConfig) { return dbConfig.getOrCreate('language'); }
		},
		controller: function ($scope, $translate, dbConfig, dbTraq, dbColumn, dbMeasurement, columns, language) {
			$scope.settings = {};
			$scope.columns = columns;
			_.each(columns, function (column, i) {
				var oldUnit = column.oldUnit;
				/*$scope.$watch('columns[' + i + ']', function (column) {
					if (!column || column.unit === oldUnit) { return; }
					console.log('change column', column)
					dbColumn.put(column).then(function (res) {
						console.log(res);
						column._rev = res.rev;
						oldUnit = column.unit;
					});
				}, true);*/
			});

			var updateConfigCount = function () { dbConfig.count().then(function (count) { $scope.configCount = count; }); },
				updateTraqCount = function () { dbTraq.count().then(function (count) { $scope.traqCount = count; }); },
				updateColumnCount = function () { dbColumn.count().then(function (count) { $scope.columnCount = count; }); },
				updateMeasurementCount = function () { dbMeasurement.count().then(function (count) { $scope.measurementCount = count; }); };

			$scope.wipeConfig = function () { dbConfig.erase().then(function () { updateConfigCount(); }); };
			$scope.wipeTraqs = function () { dbTraq.erase().then(function () { updateTraqCount(); }); };
			$scope.wipeColumns = function () { dbColumn.erase().then(function () { updateColumnCount(); }); };
			$scope.wipeMeasurements = function () { dbMeasurement.erase().then(function () { updateMeasurementCount(); }); };

			updateConfigCount();
			updateTraqCount();
			updateColumnCount();
			updateMeasurementCount();

			$scope.settings.language = language.code;

			$scope.$watch('settings.language', function (code) {
				if (!code || code === language.code) { return; }
				dbConfig.getOrCreate('language').then(function (doc) {
					return dbConfig.put(_.extend(doc, { code: code }));
				}).then(function () {
					window.location.reload();
				});
			});
		}
	});
});
