'use strict';

var angular = require('angular'),
	_ = require('lodash');

angular.module('traq')
	.constant('chartTypes', [])
	.factory('Chart', function (chartTypes) {
		var Chart = function (element, options) {
			this.element = element;
			this.options = options;
		};

		_.extend(Chart.prototype, {
			update: function (chart) {
				console.log('o', chart);
				this.chartType = _.findWhere(chartTypes, { id: chart.type });
				this.chartType.init.apply(this);
				this.chartType.update.apply(this, arguments);
				this.chartType.resize.apply(this);
			},
			resize: function () {
				this.chartType.resize.apply(this);
			}
		});

		return Chart;
	})
	.directive('chart', function ($q, $compile, Chart, dbTable, dbRow) {
		return {
			restrict: 'E',
			replace: true,
			scope: {
				chart: '=',
				span: '@'
			},
			template: '<div flex layout="row"><div flex></div></div>',
			link: function (scope, element) {
				var chartView = new Chart(element, { span: scope.span });

				angular.element(window).on('resize', chartView.resize);

				scope.$watch('chart', function (chart) {
					console.log('chart', chart)
					if (!chart) { return; }
					$q.all({
						table: dbTable.get(chart.table),
						rows: dbRow.getAll({ startWith: chart.table })
					}).then(function (obj) {
						chartView.update(chart, obj.table, obj.rows);
					});
				});
			}
		};
	});
