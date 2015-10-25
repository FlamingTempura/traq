'use strict';

var angular = require('angular'),
	_ = require('lodash'),
	$ = require('jquery');

var spanDurations = {
	day: 24 * 60 * 60 * 1000,
	week: 7 * 24 * 60 * 60 * 1000,
	month: 30 * 24 * 60 * 60 * 1000,
	year: 365 * 24 * 60 * 60 * 1000
};

angular.module('traq')
	.constant('chartTypes', [])
	.factory('Chart', function (chartTypes) {
		var Chart = function (element) {
			this.handlers = [];
			this.element = element;
			this.init();
		};
		_.extend(Chart.prototype, {
			init: function () {
				var that = this;
				angular.element(window).on('resize', function () {
					that.trigger('resize', that.element.offsetWidth, that.element.offsetHeight);
				});
			},
			reset: function (chart) {
				this.destroy();
				var chartType = _.findWhere(chartTypes, { id: chart.type });
				chartType.create.call(this, this.element); // bind to this for events
				this.trigger('resize', this.element.offsetWidth, this.element.offsetHeight);
			},
			update: function (traq, chart, rows, span) {
				if (!traq || !chart || !rows) { return; }
				if (!this.chart || chart.type !== this.chart.type) {
					this.reset(chart);
				}

				this.traq = traq;
				this.chart = chart;
				this.rows = rows;

				var dateStart = span ? Date.now() - spanDurations[span] : 0;

				rows = _.chain(rows).select(function (row) {
					return !dateStart || row.date.getTime() > dateStart;
				}).sortBy('date').value();

				var columns = _.map(chart.data, function (d) {
					return _.extend(d, _.findWhere(traq.columns, { id: d.column }));
				});

				/*_.each(chart.options, function (value, key) {
					that.option(key, value); // TODO
				});*/

				this.trigger('data', columns, rows, span);
			},
			span: function (span) {
				this.update(this.traq, this.chart, this.rows, span);
			},
			option: function (key, value) {
				this.trigger(key, value);
			},
			destroy: function () {
				this.trigger('destroy');
			},
			on: function (event, fn) {
				this.handlers.push({ event: event, fn: fn });
			},
			trigger: function (event) {
				var args = Array.prototype.splice.call(arguments, 1);
				console.log('TRIGGER', event, args);
				_.chain(this.handlers).where({ event: event }).each(function (handler) {
					return handler.fn.apply(null, args);
				}).value();
			}
		});
		return Chart;
	})
	.directive('chart', function ($q, $compile, Chart, dbTraq, dbRow) {
		return {
			restrict: 'E',
			replace: true,
			scope: {
				chart: '=',
				span: '='
			},
			template: '<div flex layout="row"><div flex></div></div>',
			link: function (scope, element) {
				var chartView = new Chart(element.children()[0]);

				scope.$watch('span', function (span) {
					console.log('FFFFF')
					chartView.span(span);
				});
				scope.$watch('chart', function (chart) {
					if (!chart) { return; }
					$q.all({
						traq: dbTraq.get(scope.chart.traq),
						rows: dbRow.getAll({ startWith: scope.chart.traq })
					}).then(function (obj) {
						chartView.update(obj.traq, scope.chart, obj.rows, scope.span);
					});
				});
				scope.$on('$destroy', function () {
					chartView.destroy();
				});
			}
		};
	});
