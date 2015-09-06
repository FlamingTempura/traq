'use strict';

var angular = require('angular'),
	_ = require('lodash');

angular.module('traq')
	.constant('charts', {
		line: {},
		bar: {}
	})
	.directive('chart', function ($q, $compile, charts, dbTable, dbRow) {
		return {
			restrict: 'E',
			replace: true,
			scope: { chart: '=' },
			compile: function () {
				return function (scope, element) {
					scope.$watch('chart', function (chart) {
						if (!chart) { return; }
						$q.all({
							table: dbTable.get(chart.table),
							rows: dbRow.getAll({ startWith: chart.table })
						}).then(function (obj) {
							var el = angular.element('<' + chart.type + '-chart style="height:100%" table="table" chart="chart" rows="rows"></' + chart.type + '-chart>');
							element.append(el);
							$compile(el)(_.extend(scope, {
								chart: chart,
								table: obj.table,
								rows: obj.rows
							}));
						});
					});
				};
			}
		};
	});
